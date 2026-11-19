/**
 * One-time fix: upgrade 2 PRINCIPAL_ONLY queued rollovers to FULL.
 *
 * MON-INV-2026-000030 and MON-INV-2026-000031 (both Emerald) were created with
 * rolloverType=PRINCIPAL_ONLY ($5,000 each). The investor intended to roll over
 * the full matured amount ($8,000 each). Since they are still QUEUED (not yet
 * ACTIVE) this is a safe in-place correction.
 *
 * Changes per investment:
 *   - principalAmount: $5,000 → $8,000 (source maturityAmount)
 *   - maturityAmount:  $8,000 → $12,800 (applyReturn($8,000, 60%))
 *   - Rollover.rolledAmount: $5,000 → $8,000
 *   - Transaction description updated to reflect the new amount
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { money, applyReturn } from "../src/lib/money";

const DRY_RUN = process.argv.includes("--dry");

async function main() {
  // Find the two PRINCIPAL_ONLY queued rollovers
  const rollovers = await prisma.rollover.findMany({
    where: {
      newInvestment: { status: "QUEUED" },
      reference: { in: ["MON-RLV-2026-000003", "MON-RLV-2026-000004"] },
    },
    include: {
      newInvestment: true,
      sourceInvestment: true,
      user: { include: { profile: true } },
    },
  });

  if (rollovers.length !== 2) {
    console.error(`Expected 2 rollovers, found ${rollovers.length}. Aborting.`);
    process.exit(1);
  }

  for (const r of rollovers) {
    const src = r.sourceInvestment;
    const inv = r.newInvestment;

    const newPrincipal = money(src.maturityAmount);                        // $8,000
    const newMaturity  = applyReturn(newPrincipal, money(r.appliedPercentage)); // $12,800

    const name = r.user.profile
      ? `${r.user.profile.firstName} ${r.user.profile.surname}`
      : r.user.username;

    console.log(`\n── ${r.reference} ──`);
    console.log(`  Investor      : ${name}`);
    console.log(`  New investment: ${inv.reference}`);
    console.log(`  principalAmount: $${money(inv.principalAmount).toFixed(2)} → $${newPrincipal.toFixed(2)}`);
    console.log(`  maturityAmount : $${money(inv.maturityAmount).toFixed(2)} → $${newMaturity.toFixed(2)}`);
    console.log(`  rolledAmount   : $${money(r.rolledAmount).toFixed(2)} → $${newPrincipal.toFixed(2)}`);

    if (DRY_RUN) {
      console.log("  [DRY RUN — no DB changes written]");
      continue;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update the new QUEUED investment
      await tx.investment.update({
        where: { id: inv.id },
        data: {
          principalAmount: newPrincipal,
          maturityAmount:  newMaturity,
        },
      });

      // 2. Update the rollover record
      await tx.rollover.update({
        where: { id: r.id },
        data: { rolledAmount: newPrincipal },
      });

      // 3. Update the ROLLOVER_CREATED ledger transaction for the new investment
      await tx.transaction.updateMany({
        where: {
          investmentId: inv.id,
          type: "ROLLOVER_CREATED",
        },
        data: {
          amount: newPrincipal,
          description: `${src.reference} rolled into ${inv.reference} (corrected to FULL)`,
        },
      });
    });

    console.log("  ✓ Updated.");
  }

  if (!DRY_RUN) {
    console.log("\nAll done. Verify with: npx tsx scripts/inspect-queued-rollovers.ts");
  }
}

main()
  .catch((e) => { console.error("ERR:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
