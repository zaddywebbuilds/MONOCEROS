import "server-only";

import type { Investment, InvestmentStatus, Prisma } from "@prisma/client";

import { prisma, type Tx } from "@/lib/prisma";
import { nextReference } from "@/lib/references";
import { applyReturn, formatUSD, money } from "@/lib/money";
import { configuredWallets, getSettings } from "@/lib/settings";
import { formatBusinessDate, formatCycleLabel, maturityFor } from "@/lib/time";
import { canTransition, InvalidTransitionError, OPEN_INVESTMENT_STATUSES } from "@/lib/domain/investment-status";
import { notify, notifications, notifyStaff } from "@/lib/notifications";
import { sendInvestmentActivatedEmail, sendInvestmentMaturedEmail } from "@/lib/email";
import { writeSystemAudit, AUDIT_ACTION } from "@/lib/audit";
import { recordTransaction } from "@/server/services/ledger";
import { reconcileCycleStatuses } from "@/server/services/cycles";
import { BusinessRuleError } from "@/lib/errors";

/**
 * Investment lifecycle.
 *
 * Two invariants this module protects:
 *  1. Package terms are SNAPSHOT onto the investment at subscription time.
 *     Editing a package later can never change an existing investment.
 *  2. Every status change goes through `transition`, which checks the state
 *     machine and writes an InvestmentStatusEvent row.
 */

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

export interface TransitionOptions {
  reason?: string;
  actorId?: string | null;
  data?: Prisma.InvestmentUpdateInput;
}

export async function transition(
  investment: Pick<Investment, "id" | "status">,
  to: InvestmentStatus,
  client: Tx,
  options: TransitionOptions = {},
): Promise<Investment> {
  if (!canTransition(investment.status, to)) {
    throw new InvalidTransitionError(investment.status, to);
  }

  const updated = await client.investment.update({
    where: { id: investment.id },
    data: { ...options.data, status: to },
  });

  await client.investmentStatusEvent.create({
    data: {
      investmentId: investment.id,
      fromStatus: investment.status,
      toStatus: to,
      reason: options.reason ?? null,
      actorId: options.actorId ?? null,
    },
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------------

export interface SubscribeResult {
  investment: Investment;
  paymentId: string;
}

/**
 * Creates an investment and its matching pending payment.
 *
 * Called only after the caller has proven the user is authenticated, email
 * verified and KYC approved (see lib/auth/rbac.ts).
 */
export async function createSubscription(
  userId: string,
  packageSlug: string,
): Promise<SubscribeResult> {
  const settings = await getSettings();

  const [defaultWallet] = configuredWallets(settings);
  if (!defaultWallet) {
    throw new BusinessRuleError(
      "Subscriptions are temporarily unavailable: payment details have not been configured. Please contact support.",
    );
  }

  const pkg = await prisma.package.findUnique({ where: { slug: packageSlug } });
  if (!pkg || !pkg.isActive) {
    throw new BusinessRuleError("That investment package is not available.");
  }

  const maxActive = settings["investment.maxActivePerUser"];
  if (maxActive > 0) {
    const openCount = await prisma.investment.count({
      where: { userId, status: { in: OPEN_INVESTMENT_STATUSES } },
    });
    if (openCount >= maxActive) {
      throw new BusinessRuleError(
        `You can hold a maximum of ${maxActive} open investments at a time.`,
      );
    }
  }

  // Snapshot every commercial term onto the investment.
  const principal = money(pkg.minimumCapital);
  const percentage = money(pkg.returnPercentage);
  const maturityAmount = money(pkg.maturityAmount);

  return prisma.$transaction(async (tx) => {
    const investment = await tx.investment.create({
      data: {
        reference: await nextReference("investment", tx),
        userId,
        packageId: pkg.id,
        packageNameSnapshot: pkg.name,
        principalAmount: principal,
        returnPercentageSnapshot: percentage,
        maturityAmount,
        durationDays: pkg.durationDays,
        status: "DRAFT",
      },
    });

    const payment = await tx.payment.create({
      data: {
        reference: await nextReference("payment", tx),
        userId,
        investmentId: investment.id,
        asset: settings["payment.asset"],
        // A provisional default; the investor picks their network on the
        // payment screen, which rewrites both fields before they send funds.
        network: defaultWallet.network,
        walletAddress: defaultWallet.address,
        expectedAmount: principal,
        status: "PENDING",
      },
    });

    const withPending = await transition(investment, "PAYMENT_PENDING", tx, {
      reason: "Subscription created",
      actorId: userId,
    });

    return { investment: withPending, paymentId: payment.id };
  });
}

// ---------------------------------------------------------------------------
// The weekly activation engine
// ---------------------------------------------------------------------------

export interface ActivationReport {
  cyclesActivated: number;
  cyclesCompleted: number;
  investmentsActivated: number;
  references: string[];
}

/**
 * Activates every QUEUED investment whose cycle boundary has been reached.
 *
 * Idempotent: re-running it activates nothing extra, so it is safe to call
 * from a cron endpoint that may fire more than once.
 */
export async function activateDueInvestments(now: Date = new Date()): Promise<ActivationReport> {
  const { activated: cyclesActivated, completed: cyclesCompleted } =
    await reconcileCycleStatuses(now);

  const due = await prisma.investment.findMany({
    where: {
      status: "QUEUED",
      cycle: { cycleStart: { lte: now } },
    },
    include: {
      cycle: true,
      user: { include: { profile: true } },
    },
    orderBy: { queuedAt: "asc" },
  });

  const references: string[] = [];

  for (const investment of due) {
    if (!investment.cycle) continue;

    const startedAt = investment.cycle.cycleStart;
    const maturesAt = maturityFor(startedAt, investment.durationDays);

    await prisma.$transaction(async (tx) => {
      await transition(investment, "ACTIVE", tx, {
        reason: `Cycle ${investment.cycle?.reference} opened`,
        data: { startedAt, maturesAt },
      });

      await recordTransaction(
        {
          userId: investment.userId,
          investmentId: investment.id,
          type: "INVESTMENT_ACTIVATED",
          amount: investment.principalAmount,
          description: `${investment.packageNameSnapshot} investment ${investment.reference} activated`,
          metadata: { cycle: investment.cycle?.reference ?? null },
        },
        tx,
      );

      await notify(
        notifications.investmentActivated(
          investment.userId,
          investment.reference,
          formatBusinessDate(maturesAt),
        ),
        tx,
      );

      await writeSystemAudit(
        {
          action: AUDIT_ACTION.INVESTMENT_ACTIVATED,
          entityType: "Investment",
          entityId: investment.id,
          newValue: {
            status: "ACTIVE",
            startedAt: startedAt.toISOString(),
            maturesAt: maturesAt.toISOString(),
          },
          reason: `Automatic activation for cycle ${investment.cycle?.reference}`,
        },
        tx,
      );
    });

    await sendInvestmentActivatedEmail(investment.user.email, {
      reference: investment.reference,
      packageName: investment.packageNameSnapshot,
      principal: formatUSD(investment.principalAmount),
      maturityAmount: formatUSD(investment.maturityAmount),
      startedAt: formatBusinessDate(startedAt),
      maturesAt: formatBusinessDate(maturesAt),
    });

    references.push(investment.reference);
  }

  return {
    cyclesActivated,
    cyclesCompleted,
    investmentsActivated: references.length,
    references,
  };
}

// ---------------------------------------------------------------------------
// The maturity engine
// ---------------------------------------------------------------------------

export interface MaturityReport {
  matured: number;
  references: string[];
}

/** Moves ACTIVE investments whose maturesAt has passed to MATURED. */
export async function matureDueInvestments(now: Date = new Date()): Promise<MaturityReport> {
  const due = await prisma.investment.findMany({
    where: { status: "ACTIVE", maturesAt: { lte: now } },
    include: { user: true },
    orderBy: { maturesAt: "asc" },
  });

  const references: string[] = [];

  for (const investment of due) {
    await prisma.$transaction(async (tx) => {
      await transition(investment, "MATURED", tx, {
        reason: "Maturity date reached",
        data: { maturedAt: now },
      });

      await recordTransaction(
        {
          userId: investment.userId,
          investmentId: investment.id,
          type: "INVESTMENT_MATURED",
          amount: investment.maturityAmount,
          description: `${investment.reference} reached maturity`,
        },
        tx,
      );

      await notify(notifications.investmentMatured(investment.userId, investment.reference), tx);

      await writeSystemAudit(
        {
          action: AUDIT_ACTION.INVESTMENT_MATURED,
          entityType: "Investment",
          entityId: investment.id,
          newValue: { status: "MATURED", maturedAt: now.toISOString() },
        },
        tx,
      );
    });

    await sendInvestmentMaturedEmail(investment.user.email, {
      reference: investment.reference,
      maturityAmount: formatUSD(investment.maturityAmount),
    });

    references.push(investment.reference);
  }

  return { matured: references.length, references };
}

// ---------------------------------------------------------------------------
// Queries used by the dashboard
// ---------------------------------------------------------------------------

export async function getUserInvestments(userId: string) {
  return prisma.investment.findMany({
    where: { userId },
    include: {
      cycle: true,
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      withdrawals: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInvestmentForUser(investmentId: string, userId: string) {
  return prisma.investment.findFirst({
    where: { id: investmentId, userId },
    include: {
      cycle: true,
      package: true,
      payments: { orderBy: { createdAt: "desc" } },
      withdrawals: { orderBy: { createdAt: "desc" } },
      statusEvents: { orderBy: { createdAt: "asc" } },
      rolloverTo: true,
      rolloverFrom: true,
    },
  });
}

export interface PortfolioSummary {
  totalInvested: string;
  activeCount: number;
  queuedCount: number;
  projectedMaturityValue: string;
  completedCount: number;
  pendingWithdrawals: number;
  nextMaturityDate: Date | null;
}

export async function getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
  const [invested, active, queued, completed, pendingWithdrawals, nextMaturity] = await Promise.all([
    prisma.investment.aggregate({
      where: { userId, status: { in: ["ACTIVE", "MATURED", "WITHDRAWAL_REQUESTED", "COMPLETED", "ROLLED_OVER"] } },
      _sum: { principalAmount: true },
    }),
    prisma.investment.aggregate({
      where: { userId, status: "ACTIVE" },
      _sum: { maturityAmount: true },
      _count: true,
    }),
    prisma.investment.count({ where: { userId, status: "QUEUED" } }),
    prisma.investment.count({ where: { userId, status: { in: ["COMPLETED", "ROLLED_OVER"] } } }),
    prisma.withdrawal.count({
      where: { userId, status: { in: ["PENDING", "UNDER_REVIEW", "APPROVED", "PROCESSING"] } },
    }),
    prisma.investment.findFirst({
      where: { userId, status: "ACTIVE", maturesAt: { not: null } },
      orderBy: { maturesAt: "asc" },
      select: { maturesAt: true },
    }),
  ]);

  return {
    totalInvested: (invested._sum.principalAmount ?? money(0)).toFixed(2),
    activeCount: active._count,
    queuedCount: queued,
    projectedMaturityValue: (active._sum.maturityAmount ?? money(0)).toFixed(2),
    completedCount: completed,
    pendingWithdrawals,
    nextMaturityDate: nextMaturity?.maturesAt ?? null,
  };
}

/** Alerts staff that a subscription is waiting for payment verification. */
export async function alertStaffOfPayment(reference: string, client: Tx = prisma) {
  await notifyStaff(
    {
      title: "Payment awaiting verification",
      message: `${reference} has been submitted and needs manual verification.`,
      type: "WARNING",
      link: "/admin/payments",
    },
    client,
  );
}

/** Recomputes a maturity amount from a principal and a percentage. */
export function projectedMaturity(principal: Prisma.Decimal | string, percentage: Prisma.Decimal | string) {
  return applyReturn(principal, percentage);
}

export { formatCycleLabel };

export { BusinessRuleError };
