import "server-only";

import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { formatInTimeZone } from "date-fns-tz";
import { BUSINESS_TIMEZONE } from "@/lib/time";

/**
 * Read models for the administration dashboard.
 * Every figure below is derived from real rows — nothing is illustrative.
 */

export interface AdminOverview {
  totalUsers: number;
  verifiedUsers: number;
  pendingKyc: number;
  pendingPayments: number;
  activeInvestments: number;
  queuedInvestments: number;
  maturedInvestments: number;
  pendingWithdrawals: number;
  totalSubscriptionValue: string;
  totalWithdrawalsPaid: string;
  activeCapital: string;
  outstandingMaturityLiability: string;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const [
    totalUsers,
    verifiedUsers,
    pendingKyc,
    pendingPayments,
    activeInvestments,
    queuedInvestments,
    maturedInvestments,
    pendingWithdrawals,
    subscriptionValue,
    withdrawalsPaid,
    activeAggregate,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({ where: { role: "USER", kycStatus: "APPROVED" } }),
    prisma.kycSubmission.count({ where: { status: "PENDING" } }),
    prisma.payment.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.investment.count({ where: { status: "ACTIVE" } }),
    prisma.investment.count({ where: { status: "QUEUED" } }),
    prisma.investment.count({ where: { status: "MATURED" } }),
    prisma.withdrawal.count({
      where: { status: { in: ["PENDING", "UNDER_REVIEW", "APPROVED", "PROCESSING"] } },
    }),
    prisma.investment.aggregate({
      where: {
        status: { in: ["QUEUED", "ACTIVE", "MATURED", "WITHDRAWAL_REQUESTED", "COMPLETED", "ROLLED_OVER"] },
      },
      _sum: { principalAmount: true },
    }),
    prisma.withdrawal.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    prisma.investment.aggregate({
      where: { status: { in: ["ACTIVE", "QUEUED"] } },
      _sum: { principalAmount: true, maturityAmount: true },
    }),
  ]);

  return {
    totalUsers,
    verifiedUsers,
    pendingKyc,
    pendingPayments,
    activeInvestments,
    queuedInvestments,
    maturedInvestments,
    pendingWithdrawals,
    totalSubscriptionValue: (subscriptionValue._sum.principalAmount ?? money(0)).toFixed(2),
    totalWithdrawalsPaid: (withdrawalsPaid._sum.amount ?? money(0)).toFixed(2),
    activeCapital: (activeAggregate._sum.principalAmount ?? money(0)).toFixed(2),
    outstandingMaturityLiability: (activeAggregate._sum.maturityAmount ?? money(0)).toFixed(2),
  };
}

export interface SeriesPoint {
  label: string;
  value: number;
}

/** Subscriptions created per day over the last `days` days. */
export async function getSubscriptionSeries(days = 30): Promise<SeriesPoint[]> {
  const since = new Date(Date.now() - days * 86_400_000);

  const investments = await prisma.investment.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, principalAmount: true },
  });

  const buckets = new Map<string, number>();
  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(Date.now() - index * 86_400_000);
    buckets.set(formatInTimeZone(day, BUSINESS_TIMEZONE, "dd MMM"), 0);
  }

  for (const investment of investments) {
    const key = formatInTimeZone(investment.createdAt, BUSINESS_TIMEZONE, "dd MMM");
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + investment.principalAmount.toNumber());
    }
  }

  return [...buckets.entries()].map(([label, value]) => ({ label, value }));
}

/** How many investments sit in each package, by name snapshot. */
export async function getPackageDistribution(): Promise<SeriesPoint[]> {
  const grouped = await prisma.investment.groupBy({
    by: ["packageNameSnapshot"],
    where: { status: { in: ["QUEUED", "ACTIVE", "MATURED", "WITHDRAWAL_REQUESTED"] } },
    _count: { _all: true },
  });

  return grouped
    .map((row) => ({ label: row.packageNameSnapshot, value: row._count._all }))
    .sort((a, b) => b.value - a.value);
}

/** Withdrawal requests per week over the last 8 weeks. */
export async function getWithdrawalSeries(weeks = 8): Promise<SeriesPoint[]> {
  const since = new Date(Date.now() - weeks * 7 * 86_400_000);

  const withdrawals = await prisma.withdrawal.findMany({
    where: { requestedAt: { gte: since } },
    select: { requestedAt: true, amount: true },
  });

  const buckets = new Map<string, number>();
  for (let index = weeks - 1; index >= 0; index -= 1) {
    const day = new Date(Date.now() - index * 7 * 86_400_000);
    buckets.set(formatInTimeZone(day, BUSINESS_TIMEZONE, "dd MMM"), 0);
  }
  const keys = [...buckets.keys()];

  for (const withdrawal of withdrawals) {
    const weekIndex = Math.min(
      keys.length - 1,
      Math.floor((withdrawal.requestedAt.getTime() - since.getTime()) / (7 * 86_400_000)),
    );
    const key = keys[weekIndex];
    if (key) buckets.set(key, (buckets.get(key) ?? 0) + withdrawal.amount.toNumber());
  }

  return [...buckets.entries()].map(([label, value]) => ({ label, value }));
}

/** Total active capital per cycle, for the cycles screen. */
export async function getCycleSummaries(take = 12) {
  const cycles = await prisma.investmentCycle.findMany({
    orderBy: { cycleStart: "desc" },
    take,
    include: { _count: { select: { investments: true } } },
  });

  const totals = await prisma.investment.groupBy({
    by: ["cycleId"],
    where: { cycleId: { in: cycles.map((cycle) => cycle.id) } },
    _sum: { principalAmount: true, maturityAmount: true },
  });

  const byCycle = new Map(totals.map((row) => [row.cycleId, row._sum]));

  return cycles.map((cycle) => ({
    id: cycle.id,
    reference: cycle.reference,
    cycleStart: cycle.cycleStart,
    cycleEnd: cycle.cycleEnd,
    status: cycle.status,
    participants: cycle._count.investments,
    principal: (byCycle.get(cycle.id)?.principalAmount ?? money(0)).toFixed(2),
    maturityValue: (byCycle.get(cycle.id)?.maturityAmount ?? money(0)).toFixed(2),
  }));
}
