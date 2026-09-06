import "server-only";

import { pruneSessions } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  activateDueInvestments,
  matureDueInvestments,
} from "@/server/services/investments";
import { ensureCycle, upcomingCycleStart } from "@/server/services/cycles";

/**
 * The scheduled worker.
 *
 * Everything here is idempotent and derived from server timestamps, so it is
 * safe to run on a tight schedule (every 5 minutes is recommended) and safe to
 * run twice. Nothing in the platform counts down in the database — the jobs
 * only compare stored instants against `now`.
 */

export interface JobReport {
  ranAt: string;
  upcomingCycle: string;
  cyclesActivated: number;
  cyclesCompleted: number;
  investmentsActivated: number;
  investmentsMatured: number;
  expiredTokensRemoved: number;
  sessionsPruned: number;
  activatedReferences: string[];
  maturedReferences: string[];
}

export async function runScheduledJobs(now: Date = new Date()): Promise<JobReport> {
  // Make sure the next boundary always has a row so the admin and the public
  // countdown have something concrete to point at.
  const upcoming = await upcomingCycleStart(now);
  await ensureCycle(upcoming);

  const activation = await activateDueInvestments(now);
  const maturity = await matureDueInvestments(now);

  const expiredTokens = await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);

  const sessionsPruned = await pruneSessions();

  return {
    ranAt: now.toISOString(),
    upcomingCycle: upcoming.toISOString(),
    cyclesActivated: activation.cyclesActivated,
    cyclesCompleted: activation.cyclesCompleted,
    investmentsActivated: activation.investmentsActivated,
    investmentsMatured: maturity.matured,
    expiredTokensRemoved: expiredTokens[0].count + expiredTokens[1].count,
    sessionsPruned,
    activatedReferences: activation.references,
    maturedReferences: maturity.references,
  };
}
