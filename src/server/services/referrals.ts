import "server-only";

import { randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";

import { prisma, type Tx } from "@/lib/prisma";
import { money, subMoney, ZERO } from "@/lib/money";
import { nextReference } from "@/lib/references";
import { getSettings } from "@/lib/settings";
import { notify, notifications } from "@/lib/notifications";
import { writeAudit, AUDIT_ACTION } from "@/lib/audit";
import { recordTransaction } from "@/server/services/ledger";
import { BusinessRuleError } from "@/lib/errors";
import type { SessionUser } from "@/lib/auth/session";

/**
 * The affiliate programme.
 *
 * Commission is a percentage of the referred investor's PROFIT, not of the
 * capital they put in: $1,000 maturing to $1,400 pays 10% of $400. It is
 * earned at maturity, because that is the first moment the profit is real
 * rather than projected, and it recurs every time that investor invests again.
 *
 * Two deliberate properties:
 *  - A referrer need not have invested anything themselves. That was the
 *    owner's instruction, and it is why payouts are gated on identity
 *    verification instead: somebody drawing money out should be identifiable
 *    even when they have never put money in.
 *  - Crediting is idempotent. ReferralEarning.investmentId is unique, so the
 *    maturity job crediting the same investment twice hits the constraint
 *    rather than paying twice. The scheduler is designed to be re-runnable and
 *    this is the one place where a repeat would cost real money.
 */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0, I/1

function randomSuffix(length = 6): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

/**
 * A code that reads as a name but cannot be guessed from one.
 *
 * The name half makes the link recognisable to the person handing it out; the
 * random half is what actually secures it. Without that, anybody could try
 * /r/stanley and claim somebody else's introductions.
 */
function buildCode(handle: string | null | undefined): string {
  const slug = (handle ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
  return `${slug || "investor"}-${randomSuffix()}`;
}

/**
 * Allocates a code for a new registration, or null when the programme is
 * invitation-only.
 *
 * Everything here runs BEFORE the registration transaction opens, and that is
 * the point. Reading settings or retrying a unique-constraint clash from
 * inside an interactive transaction needs a second connection that the
 * transaction itself is holding, so it waits for a connection that cannot be
 * freed until it finishes: registration then died on the 20-second transaction
 * timeout rather than doing anything wrong. The caller puts the returned code
 * straight into the user row it is already creating.
 *
 * Separate from issueReferralCode because that records an administrator
 * deciding to admit somebody, and this is nobody deciding anything.
 */
export async function allocateReferralCode(username: string): Promise<string | null> {
  const settings = await getSettings();
  if (!settings["referral.enabled"] || !settings["referral.openToAll"]) return null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = buildCode(username);
    const taken = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!taken) return code;
  }
  return null;
}

/**
 * Turns an account into an affiliate by issuing its code.
 *
 * The owner was explicit that this is not open to everybody who registers:
 * "this referral is only for those who have that unique code". So holding a
 * code IS affiliate status — there is no separate flag to fall out of step
 * with it, and no code means no referral page and no commission.
 */
export async function issueReferralCode(input: {
  userId: string;
  admin: SessionUser;
  reason?: string;
}): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { referralCode: true, username: true, profile: { select: { firstName: true } } },
  });
  if (!user) throw new BusinessRuleError("Account not found.");
  if (user.referralCode) return user.referralCode;

  const name = user.username ?? user.profile?.firstName ?? null;

  // Retry on the vanishingly unlikely collision rather than pretending it
  // cannot happen: the column is unique and a clash would otherwise surface as
  // an unhandled write error in the admin panel.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = buildCode(name);
    try {
      await prisma.user.update({ where: { id: input.userId }, data: { referralCode: code } });

      await writeAudit({
        actor: input.admin,
        action: AUDIT_ACTION.REFERRAL_CODE_ISSUED,
        entityType: "User",
        entityId: input.userId,
        newValue: { referralCode: code },
        reason: input.reason,
      });

      return code;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  throw new Error("Could not allocate a referral code.");
}

/**
 * Withdraws affiliate status.
 *
 * Commission already earned is left alone. Taking someone off the programme is
 * not a judgement that they never introduced anybody, and quietly erasing what
 * they are owed would be.
 */
export async function revokeReferralCode(input: {
  userId: string;
  admin: SessionUser;
  reason: string;
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { referralCode: true },
  });
  if (!user?.referralCode) return;

  await prisma.user.update({ where: { id: input.userId }, data: { referralCode: null } });

  await writeAudit({
    actor: input.admin,
    action: AUDIT_ACTION.REFERRAL_CODE_REVOKED,
    entityType: "User",
    entityId: input.userId,
    oldValue: { referralCode: user.referralCode },
    reason: input.reason,
  });
}

/** The account's code, or null when it is not on the programme. */
export async function referralCodeFor(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  return user?.referralCode ?? null;
}

/** Resolves a code from a signup link to the referrer, or null. */
export async function resolveReferralCode(code: string): Promise<string | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;

  // Case-insensitive: these are typed by hand off WhatsApp messages and
  // read aloud over the phone, so "-7f3k9q" must find "-7F3K9Q".
  const referrer = await prisma.user.findFirst({
    where: {
      referralCode: { equals: trimmed, mode: "insensitive" },
      status: "ACTIVE",
    },
    select: { id: true },
  });
  return referrer?.id ?? null;
}

export interface ReferralTerms {
  enabled: boolean;
  percentage: number;
}

/**
 * The commission terms, read once before a batch of maturities.
 *
 * Passed into creditReferralOnMaturity rather than read inside it, for the
 * same reason as allocateReferralCode: a settings read needs a connection the
 * surrounding transaction is holding.
 */
export async function currentReferralTerms(): Promise<ReferralTerms> {
  const settings = await getSettings();
  return {
    enabled: Boolean(settings["referral.enabled"]),
    percentage: Number(settings["referral.percentage"]),
  };
}

/**
 * Commission on one matured investment.
 *
 * Runs inside the maturity transaction so the credit and the maturity either
 * both happen or neither does. Returns null when there is nothing to pay,
 * which is the common case.
 */
export async function creditReferralOnMaturity(
  investment: { id: string; userId: string; reference: string; principalAmount: Prisma.Decimal; maturityAmount: Prisma.Decimal },
  tx: Tx,
  terms: ReferralTerms,
): Promise<{ referrerId: string; amount: Prisma.Decimal } | null> {
  if (!terms.enabled) return null;

  const investor = await tx.user.findUnique({
    where: { id: investment.userId },
    select: { referredById: true },
  });
  if (!investor?.referredById) return null;

  // Self-referral is impossible through the UI, but a row could be set by hand
  // in the admin tool and paying somebody commission on their own investment
  // is never right.
  if (investor.referredById === investment.userId) return null;

  const profit = subMoney(investment.maturityAmount, investment.principalAmount);
  if (profit.lte(ZERO)) return null;

  const percentage = money(terms.percentage);
  if (percentage.lte(ZERO)) return null;

  const amount = profit.mul(percentage).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  if (amount.lte(ZERO)) return null;

  const reference = await nextReference("referralEarning", tx);

  try {
    await tx.referralEarning.create({
      data: {
        reference,
        referrerId: investor.referredById,
        investorId: investment.userId,
        investmentId: investment.id,
        percentage,
        profitAmount: profit,
        amount,
        status: "PAYABLE",
      },
    });
  } catch (error) {
    // Already credited on an earlier run of the job. Not an error: the whole
    // scheduler is built to be safe to repeat.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return null;
    throw error;
  }

  await recordTransaction(
    {
      userId: investor.referredById,
      type: "REFERRAL_BONUS_EARNED",
      amount,
      description: `Referral commission on ${investment.reference}`,
      metadata: { investment: investment.reference, percentage: percentage.toString() },
    },
    tx,
  );

  await notify(notifications.referralEarned(investor.referredById, reference), tx);

  return { referrerId: investor.referredById, amount };
}

/**
 * Just enough to advertise the programme on the overview page: the code and
 * the rate, or null when the account is not on it. Deliberately lighter than
 * referralSummary, which aggregates earnings the overview does not show.
 */
export async function referralHeadline(
  userId: string,
): Promise<{ code: string; percentage: number } | null> {
  const [user, settings] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } }),
    getSettings(),
  ]);

  if (!user?.referralCode || !settings["referral.enabled"]) return null;
  return { code: user.referralCode, percentage: Number(settings["referral.percentage"]) };
}

export interface ReferralSummary {
  code: string | null;
  enabled: boolean;
  percentage: number;
  minimumPayout: number;
  totalEarned: Prisma.Decimal;
  payable: Prisma.Decimal;
  pendingPayout: Prisma.Decimal;
  paid: Prisma.Decimal;
}

export async function referralSummary(userId: string): Promise<ReferralSummary> {
  const settings = await getSettings();
  const code = await referralCodeFor(userId);

  const grouped = await prisma.referralEarning.groupBy({
    by: ["status"],
    where: { referrerId: userId },
    _sum: { amount: true },
  });
  const sumFor = (status: string) =>
    grouped.find((g) => g.status === status)?._sum.amount ?? ZERO;

  return {
    code,
    enabled: Boolean(settings["referral.enabled"]),
    percentage: Number(settings["referral.percentage"]),
    minimumPayout: Number(settings["referral.minimumPayout"]),
    totalEarned: grouped.reduce<Prisma.Decimal>((acc, g) => acc.add(g._sum.amount ?? ZERO), ZERO),
    payable: sumFor("PAYABLE"),
    pendingPayout: sumFor("PENDING"),
    paid: sumFor("PAID"),
  };
}

/** Everyone who signed up through this user's link, with what they generated. */
export async function referredInvestors(userId: string) {
  return prisma.user.findMany({
    where: { referredById: userId },
    select: {
      id: true,
      reference: true,
      createdAt: true,
      kycStatus: true,
      profile: { select: { firstName: true, surname: true } },
      investments: {
        where: { status: { in: ["QUEUED", "ACTIVE", "MATURED", "WITHDRAWAL_REQUESTED", "COMPLETED", "ROLLED_OVER"] } },
        select: {
          reference: true,
          packageNameSnapshot: true,
          principalAmount: true,
          maturityAmount: true,
          status: true,
          startedAt: true,
          maturesAt: true,
          referralEarning: { select: { amount: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Requests payout of everything currently payable.
 *
 * The earnings are moved to PENDING and attached to the payout in the same
 * transaction that creates it, so a second request cannot claim the same
 * commission twice.
 */
export async function requestReferralPayout(input: {
  userId: string;
  walletAddress: string;
  walletNetwork: string;
}): Promise<{ reference: string; amount: Prisma.Decimal }> {
  const settings = await getSettings();
  if (!settings["referral.enabled"]) {
    throw new BusinessRuleError("The referral programme is not currently running.");
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { kycStatus: true },
  });
  if (!user) throw new BusinessRuleError("Account not found.");

  if (settings["referral.requireKycForPayout"] && user.kycStatus !== "APPROVED") {
    throw new BusinessRuleError(
      "Your identity must be verified before commission can be paid out. You keep earning in the meantime.",
    );
  }

  return prisma.$transaction(async (tx) => {
    const payable = await tx.referralEarning.findMany({
      where: { referrerId: input.userId, status: "PAYABLE" },
      select: { id: true, amount: true },
    });

    const total = payable.reduce<Prisma.Decimal>((acc, e) => acc.add(e.amount), ZERO);
    const minimum = money(settings["referral.minimumPayout"]);

    if (total.lt(minimum)) {
      throw new BusinessRuleError(
        `You need at least ${minimum.toFixed(2)} USDT in available commission to request a payout.`,
      );
    }

    const reference = await nextReference("referralPayout", tx);

    const payout = await tx.referralPayout.create({
      data: {
        reference,
        referrerId: input.userId,
        amount: total,
        walletAddress: input.walletAddress,
        walletNetwork: input.walletNetwork,
        status: "PENDING",
      },
    });

    await tx.referralEarning.updateMany({
      where: { id: { in: payable.map((e) => e.id) } },
      data: { status: "PENDING", payoutId: payout.id },
    });

    await notify(notifications.referralPayoutRequested(input.userId, reference), tx);

    return { reference, amount: total };
  });
}

/** Admin decision on a payout request. */
export async function decideReferralPayout(input: {
  payoutId: string;
  decision: "APPROVED" | "PAID" | "REJECTED";
  admin: SessionUser;
  reason?: string;
  paymentTxid?: string;
}): Promise<{ reference: string }> {
  const payout = await prisma.referralPayout.findUnique({
    where: { id: input.payoutId },
    include: { earnings: { select: { id: true } } },
  });
  if (!payout) throw new BusinessRuleError("Payout request not found.");
  if (["PAID", "REJECTED", "CANCELLED"].includes(payout.status)) {
    throw new BusinessRuleError("This payout has already been settled.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.referralPayout.update({
      where: { id: payout.id },
      data: {
        status: input.decision,
        processedById: input.admin.id,
        processedAt: new Date(),
        paymentTxid: input.paymentTxid ?? null,
        rejectionReason: input.decision === "REJECTED" ? (input.reason ?? null) : null,
      },
    });

    if (input.decision === "REJECTED") {
      // The commission was earned; only this request failed. Returning it to
      // PAYABLE lets them ask again rather than quietly losing it.
      await tx.referralEarning.updateMany({
        where: { payoutId: payout.id },
        data: { status: "PAYABLE", payoutId: null },
      });
    }

    if (input.decision === "PAID") {
      await tx.referralEarning.updateMany({
        where: { payoutId: payout.id },
        data: { status: "PAID" },
      });

      await recordTransaction(
        {
          userId: payout.referrerId,
          type: "REFERRAL_PAYOUT_PAID",
          amount: payout.amount,
          description: `Referral payout ${payout.reference}`,
          metadata: { txid: input.paymentTxid ?? null },
        },
        tx,
      );
    }

    await notify(
      input.decision === "REJECTED"
        ? notifications.referralPayoutRejected(payout.referrerId, payout.reference, input.reason ?? "")
        : notifications.referralPayoutUpdated(payout.referrerId, payout.reference, input.decision),
      tx,
    );
  });

  await writeAudit({
    actor: input.admin,
    action: AUDIT_ACTION.REFERRAL_PAYOUT_DECIDED,
    entityType: "ReferralPayout",
    entityId: payout.id,
    oldValue: { status: payout.status },
    newValue: { status: input.decision, txid: input.paymentTxid ?? null },
    reason: input.reason,
  });

  return { reference: payout.reference };
}

/**
 * Attributes an existing account to a referrer after the fact.
 *
 * For introductions made before the programme existed, or where somebody
 * signed up without using the link. It does not backdate commission on
 * investments that have already matured: those earnings were never created and
 * inventing them here would be indistinguishable from fabricating a payout.
 * Use a manual credit for that, which says on its face that a human decided it.
 */
export async function setReferrer(input: {
  userId: string;
  referrerId: string | null;
  admin: SessionUser;
  reason: string;
}): Promise<void> {
  if (input.userId === input.referrerId) {
    throw new BusinessRuleError("An account cannot refer itself.");
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { referredById: true },
  });
  if (!user) throw new BusinessRuleError("Account not found.");

  if (input.referrerId) {
    const referrer = await prisma.user.findUnique({
      where: { id: input.referrerId },
      select: { id: true },
    });
    if (!referrer) throw new BusinessRuleError("That referrer account does not exist.");
  }

  await prisma.user.update({
    where: { id: input.userId },
    data: { referredById: input.referrerId },
  });

  await writeAudit({
    actor: input.admin,
    action: AUDIT_ACTION.REFERRER_CHANGED,
    entityType: "User",
    entityId: input.userId,
    oldValue: { referredById: user.referredById },
    newValue: { referredById: input.referrerId },
    reason: input.reason,
  });
}

/** A commission a human decided to award, outside the automatic rule. */
export async function creditManualReferralBonus(input: {
  referrerId: string;
  investorId: string;
  amount: Prisma.Decimal | string | number;
  note: string;
  admin: SessionUser;
}): Promise<{ reference: string }> {
  const amount = money(input.amount);
  if (amount.lte(ZERO)) throw new BusinessRuleError("Enter an amount greater than zero.");

  const reference = await prisma.$transaction(async (tx) => {
    const ref = await nextReference("referralEarning", tx);

    await tx.referralEarning.create({
      data: {
        reference: ref,
        referrerId: input.referrerId,
        investorId: input.investorId,
        percentage: money(0),
        profitAmount: money(0),
        amount,
        status: "PAYABLE",
        note: input.note,
      },
    });

    await recordTransaction(
      {
        userId: input.referrerId,
        type: "REFERRAL_BONUS_EARNED",
        amount,
        description: `Referral commission awarded manually (${ref})`,
        metadata: { note: input.note },
      },
      tx,
    );

    await notify(notifications.referralEarned(input.referrerId, ref), tx);
    return ref;
  });

  await writeAudit({
    actor: input.admin,
    action: AUDIT_ACTION.REFERRAL_BONUS_MANUAL,
    entityType: "ReferralEarning",
    entityId: reference,
    newValue: { amount: amount.toString(), investorId: input.investorId },
    reason: input.note,
  });

  return { reference };
}
