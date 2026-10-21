import "server-only";

import type { RolloverMode } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { nextReference } from "@/lib/references";
import { applyReturn, formatUSD, money } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { formatCycleLabel, maturityFor } from "@/lib/time";
import { notify, notifications, notifyStaff } from "@/lib/notifications";
import { writeAudit, AUDIT_ACTION } from "@/lib/audit";
import { sendRolloverCreatedEmail } from "@/lib/email";
import { recordTransaction } from "@/server/services/ledger";
import { eligibleCycleFor } from "@/server/services/cycles";
import { transition } from "@/server/services/investments";
import { BusinessRuleError } from "@/lib/errors";

/**
 * Rollover.
 *
 * The FULL matured amount becomes the principal of a new investment. Because a
 * matured amount rarely lands on a package's headline capital figure (a Gold
 * investment matures at $650, which is not itself a package tier), the new
 * investment carries the amount as its principal and applies a return
 * percentage chosen by the configured mode:
 *
 *   SAME_PACKAGE_PERCENTAGE   — keep the percentage from the matured
 *                               investment (default; $650 at 30% -> $845).
 *   REQUIRE_PACKAGE_SELECTION — the investor picks a package and its
 *                               percentage is applied to the matured amount.
 *
 * The new investment always waits for a cycle boundary unless an administrator
 * has explicitly turned that off.
 */

export interface RolloverInput {
  userId: string;
  investmentId: string;
  packageSlug?: string;
  /** "FULL" rolls the entire matured amount (default); "PRINCIPAL_ONLY" rolls original capital and withdraws profit. */
  rolloverType?: "FULL" | "PRINCIPAL_ONLY";
  /** Wallet details for the profit-only withdrawal (required when rolloverType is PRINCIPAL_ONLY and profit > 0). */
  walletAddress?: string;
  walletNetwork?: string;
}

export async function createRollover(input: RolloverInput): Promise<{ reference: string }> {
  const settings = await getSettings();
  const mode = settings["rollover.mode"] as RolloverMode;

  const source = await prisma.investment.findFirst({
    where: { id: input.investmentId, userId: input.userId },
    include: { user: true, childInvestment: true },
  });

  if (!source) throw new BusinessRuleError("Investment not found.");
  if (source.status !== "MATURED") {
    throw new BusinessRuleError(
      "An investment can only be rolled over once it has reached maturity.",
    );
  }
  if (source.childInvestment) {
    throw new BusinessRuleError("This investment has already been rolled over.");
  }

  const principalOnly = input.rolloverType === "PRINCIPAL_ONLY";
  const principal = principalOnly
    ? money(source.principalAmount)
    : money(source.maturityAmount);
  const profit = principalOnly
    ? money(source.maturityAmount).minus(money(source.principalAmount))
    : money(0);

  if (principalOnly && profit.greaterThan(0) && !input.walletAddress) {
    throw new BusinessRuleError(
      "Please provide a wallet address to receive your profit payout.",
    );
  }

  let percentage = money(source.returnPercentageSnapshot);
  let packageId = source.packageId;
  let packageName = source.packageNameSnapshot;
  let durationDays = source.durationDays;

  if (mode === "REQUIRE_PACKAGE_SELECTION") {
    if (!input.packageSlug) {
      throw new BusinessRuleError("Choose a package for your rollover.");
    }
    const pkg = await prisma.package.findUnique({ where: { slug: input.packageSlug } });
    if (!pkg || !pkg.isActive) throw new BusinessRuleError("That package is not available.");
    if (principal.lessThan(pkg.minimumCapital)) {
      throw new BusinessRuleError(
        `Your matured amount of ${formatUSD(principal)} is below the ${pkg.name} minimum of ${formatUSD(pkg.minimumCapital)}.`,
      );
    }
    percentage = money(pkg.returnPercentage);
    packageId = pkg.id;
    packageName = pkg.name;
    durationDays = pkg.durationDays;
  }

  const maturityAmount = applyReturn(principal, percentage);
  const now = new Date();
  const waitsForCycle = settings["rollover.waitsForCycle"];

  const cycle = waitsForCycle ? await eligibleCycleFor(now) : null;
  const cycleLabel = cycle ? formatCycleLabel(cycle.cycleStart) : "immediately";

  const reference = await prisma.$transaction(async (tx) => {
    const investmentRef = await nextReference("investment", tx);

    const created = await tx.investment.create({
      data: {
        reference: investmentRef,
        userId: input.userId,
        packageId,
        packageNameSnapshot: packageName,
        principalAmount: principal,
        returnPercentageSnapshot: percentage,
        maturityAmount,
        durationDays,
        status: "DRAFT",
        parentInvestmentId: source.id,
      },
    });

    // Walk the new investment to its resting state through the state machine.
    await transition(created, "PAYMENT_PENDING", tx, {
      reason: "Created by rollover",
      actorId: input.userId,
    });
    const submitted = await transition(
      { id: created.id, status: "PAYMENT_PENDING" },
      "PAYMENT_SUBMITTED",
      tx,
      { reason: "Funded from matured investment", actorId: input.userId },
    );

    if (waitsForCycle && cycle) {
      await transition(submitted, "QUEUED", tx, {
        reason: `Rollover queued for cycle ${cycle.reference}`,
        actorId: input.userId,
        data: { cycle: { connect: { id: cycle.id } }, queuedAt: now },
      });
    } else {
      const queued = await transition(submitted, "QUEUED", tx, {
        reason: "Rollover queued",
        actorId: input.userId,
        data: { queuedAt: now },
      });
      await transition(queued, "ACTIVE", tx, {
        reason: "Immediate rollover activation (cycle wait disabled)",
        actorId: input.userId,
        data: { startedAt: now, maturesAt: maturityFor(now, durationDays) },
      });
    }

    await transition(source, "ROLLED_OVER", tx, {
      reason: `Rolled into ${investmentRef}`,
      actorId: input.userId,
      data: { closedAt: now },
    });

    const rolloverRef = await nextReference("rollover", tx);
    await tx.rollover.create({
      data: {
        reference: rolloverRef,
        userId: input.userId,
        sourceInvestmentId: source.id,
        newInvestmentId: created.id,
        rolledAmount: principal,
        appliedPercentage: percentage,
        mode,
      },
    });

    // Create a pending profit withdrawal so the investor is paid out separately.
    if (profit.greaterThan(0) && input.walletAddress) {
      const profitWithdrawalRef = await nextReference("withdrawal", tx);
      await tx.withdrawal.create({
        data: {
          reference: profitWithdrawalRef,
          userId: input.userId,
          investmentId: source.id,
          amount: profit,
          method: "USDT_WALLET",
          walletAddress: input.walletAddress,
          walletNetwork: input.walletNetwork ?? null,
          status: "PENDING",
        },
      });

      await recordTransaction(
        {
          userId: input.userId,
          investmentId: source.id,
          type: "WITHDRAWAL_REQUESTED",
          status: "PENDING",
          amount: profit,
          description: `Profit payout ${profitWithdrawalRef} from rollover of ${source.reference}`,
          metadata: { network: input.walletNetwork ?? null },
        },
        tx,
      );

      await notifyStaff(
        {
          title: "Profit withdrawal pending",
          message: `${profitWithdrawalRef} for ${formatUSD(profit)} from rollover needs settlement.`,
          type: "WARNING",
          link: "/admin/withdrawals",
        },
        tx,
      );
    }

    await recordTransaction(
      {
        userId: input.userId,
        investmentId: created.id,
        type: "ROLLOVER_CREATED",
        amount: principal,
        description: `${source.reference} rolled into ${investmentRef}`,
        metadata: { mode, appliedPercentage: percentage.toString() },
      },
      tx,
    );

    await notify(notifications.rolloverCreated(input.userId, investmentRef, cycleLabel), tx);

    await writeAudit(
      {
        actor: null,
        action: AUDIT_ACTION.ROLLOVER_CREATED,
        entityType: "Investment",
        entityId: created.id,
        newValue: {
          source: source.reference,
          principal: principal.toString(),
          percentage: percentage.toString(),
          maturityAmount: maturityAmount.toString(),
          mode,
        },
      },
      tx,
    );

    return investmentRef;
  });

  await sendRolloverCreatedEmail(source.user.email, {
    reference,
    principal: formatUSD(principal),
    maturityAmount: formatUSD(maturityAmount),
    cycleDate: cycleLabel,
  });

  return { reference };
}

/** Preview shown on the rollover confirmation screen before anything is created. */
export async function previewRollover(userId: string, investmentId: string) {
  const settings = await getSettings();
  const mode = settings["rollover.mode"] as RolloverMode;

  const source = await prisma.investment.findFirst({
    where: { id: investmentId, userId },
  });
  if (!source) return null;

  const originalPrincipal = money(source.principalAmount);
  const fullAmount = money(source.maturityAmount);
  const profit = fullAmount.minus(originalPrincipal);
  const percentage = money(source.returnPercentageSnapshot);

  return {
    mode,
    sourceReference: source.reference,
    packageName: source.packageNameSnapshot,
    originalPrincipal: originalPrincipal.toFixed(2),
    fullAmount: fullAmount.toFixed(2),
    profitAmount: profit.toFixed(2),
    percentage: percentage.toString(),
    projectedMaturityFull: applyReturn(fullAmount, percentage).toFixed(2),
    projectedMaturityPrincipal: applyReturn(originalPrincipal, percentage).toFixed(2),
    durationDays: source.durationDays,
    waitsForCycle: settings["rollover.waitsForCycle"],
  };
}
