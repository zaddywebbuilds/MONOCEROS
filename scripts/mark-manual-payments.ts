/**
 * Mark specific payments as source=MANUAL so the chain verifier skips them.
 *
 * Use this for payments that were verified by hand before the automatic
 * checker existed, or for payments where the investor settled off-chain.
 *
 * Usage:
 *   npx tsx scripts/mark-manual-payments.ts MON-PAY-2026-XXXXXX [...]
 */

import "dotenv/config";

import { prisma } from "../src/lib/prisma";

async function main() {
  const references = process.argv.slice(2);
  if (references.length === 0) {
    console.error("Provide one or more payment references, e.g. MON-PAY-2026-000001");
    process.exit(1);
  }

  for (const ref of references) {
    const payment = await prisma.payment.findFirst({ where: { reference: ref } });
    if (!payment) {
      console.log(`NOT FOUND: ${ref}`);
      continue;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { source: "MANUAL", verification: "EXEMPT" },
    });

    console.log(`OK: ${ref} (${payment.id}) → source=MANUAL, verification=EXEMPT`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
