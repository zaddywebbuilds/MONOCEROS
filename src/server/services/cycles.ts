import "server-only";

import type { InvestmentCycle } from "@prisma/client";

import { prisma, type Tx } from "@/lib/prisma";
import { cycleReference } from "@/lib/references";
import { getSettings } from "@/lib/settings";
import {
  BUSINESS_TIMEZONE,
  cycleEndFor,
  currentCycleStart,
  nextCycleStart,
  zonedDateKey,
  type CycleConfig,
  type Weekday,
} from "@/lib/time";

/**
 * Weekly investment cycles.
 *
 * A cycle row is created lazily the first time something needs to reference it
 * (a payment approval, the admin cycle screen, the homepage countdown), so the
 * table never contains speculative future rows beyond the one that matters.
 */

export async function cycleConfig(): Promise<CycleConfig> {
  const settings = await getSettings();
  return {
    weekday: settings["cycle.weekday"] as Weekday,
    time: settings["cycle.time"],
    timeZone: settings["general.timezone"] || BUSINESS_TIMEZONE,
  };
}

/** Creates the cycle row for a boundary if it does not exist yet. */
export async function ensureCycle(cycleStart: Date, client: Tx = prisma): Promise<InvestmentCycle> {
  const config = await cycleConfig();
  const dateKey = zonedDateKey(cycleStart, config.timeZone);

  return client.investmentCycle.upsert({
    where: { cycleStart },
    create: {
      reference: cycleReference(dateKey),
      cycleStart,
      cycleEnd: cycleEndFor(cycleStart),
      status: "UPCOMING",
    },
    update: {},
  });
}

/**
 * The cycle a subscription joins if its payment is approved at `at`.
 *
 * This is the rule the whole platform turns on: the eligible boundary is the
 * first one strictly after the approval instant. Approved 23:59 Thursday ->
 * tomorrow's cycle. Approved 00:00 or 00:01 Friday -> next week's cycle.
 */
export async function eligibleCycleFor(at: Date, client: Tx = prisma): Promise<InvestmentCycle> {
  const config = await cycleConfig();
  return ensureCycle(nextCycleStart(at, config), client);
}

/** The next cycle boundary from now — powers the public countdown. */
export async function upcomingCycleStart(now: Date = new Date()): Promise<Date> {
  return nextCycleStart(now, await cycleConfig());
}

export async function getUpcomingCycleSummary(now: Date = new Date()) {
  const start = await upcomingCycleStart(now);
  const cycle = await prisma.investmentCycle.findUnique({
    where: { cycleStart: start },
    include: { _count: { select: { investments: true } } },
  });

  const queued = await prisma.investment.aggregate({
    where: { status: "QUEUED", cycle: { cycleStart: start } },
    _sum: { principalAmount: true },
    _count: true,
  });

  return {
    cycleStart: start,
    cycleEnd: cycleEndFor(start),
    reference: cycle?.reference ?? null,
    queuedCount: queued._count,
    queuedCapital: queued._sum.principalAmount ?? null,
  };
}

/** The cycle that is running right now, if a row exists for it. */
export async function getRunningCycle(now: Date = new Date()) {
  const config = await cycleConfig();
  const start = currentCycleStart(now, config);
  return prisma.investmentCycle.findUnique({ where: { cycleStart: start } });
}

/**
 * Marks cycles whose start has passed as ACTIVE, and cycles whose end has
 * passed as COMPLETED. Called by the scheduler before activation runs.
 */
export async function reconcileCycleStatuses(now: Date = new Date()): Promise<{
  activated: number;
  completed: number;
}> {
  const activated = await prisma.investmentCycle.updateMany({
    where: { status: "UPCOMING", cycleStart: { lte: now } },
    data: { status: "ACTIVE", activatedAt: now },
  });

  const completed = await prisma.investmentCycle.updateMany({
    where: { status: "ACTIVE", cycleEnd: { lte: now } },
    data: { status: "COMPLETED", completedAt: now },
  });

  return { activated: activated.count, completed: completed.count };
}
