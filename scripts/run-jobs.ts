import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { runScheduledJobs } from "../src/server/services/jobs";

/**
 * Runs the scheduled worker once, from the command line.
 *
 * Useful for a systemd timer, a cron entry, or for verifying the engine
 * locally without going through the HTTP endpoint:
 *
 *   npm run jobs:run
 *
 * It performs exactly the same work as POST /api/cron/run and is idempotent.
 */
async function main() {
  const report = await runScheduledJobs();

  console.info("Scheduled run complete\n");
  console.info(`  ran at ................. ${report.ranAt}`);
  console.info(`  upcoming cycle ......... ${report.upcomingCycle}`);
  console.info(`  cycles activated ....... ${report.cyclesActivated}`);
  console.info(`  cycles completed ....... ${report.cyclesCompleted}`);
  console.info(`  investments activated .. ${report.investmentsActivated}`);
  console.info(`  investments matured .... ${report.investmentsMatured}`);
  console.info(`  expired tokens removed . ${report.expiredTokensRemoved}`);
  console.info(`  sessions pruned ........ ${report.sessionsPruned}`);

  if (report.activatedReferences.length > 0) {
    console.info(`\n  activated: ${report.activatedReferences.join(", ")}`);
  }
  if (report.maturedReferences.length > 0) {
    console.info(`  matured:   ${report.maturedReferences.join(", ")}`);
  }
  console.info("");
}

main()
  .catch((error) => {
    console.error("Scheduled run failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
