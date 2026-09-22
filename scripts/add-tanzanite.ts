import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { applyReturn, money } from "../src/lib/money";
import { writeAudit, AUDIT_ACTION } from "../src/lib/audit";

/**
 * Adds the Tanzanite tier the owner asked for on 2026-09-22:
 * $50,000 at 70%, maturing to $85,000.
 *
 * Created as coming-soon, so it is listed and priced on the packages page but
 * refuses subscriptions until somebody clears that box in the admin panel.
 * Advertising a tier and accepting $50,000 into it are separate decisions, and
 * this only makes the first.
 *
 * Idempotent: running it twice leaves one Tanzanite.
 *
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/add-tanzanite.ts
 *   ...                                                            --apply
 */

const SLUG = "tanzanite";
const CAPITAL = 50_000;
const PERCENTAGE = 70;

async function main() {
  const apply = process.argv.includes("--apply");

  const existing = await prisma.package.findUnique({ where: { slug: SLUG } });
  if (existing) {
    console.log(`Tanzanite already exists (active=${existing.isActive}, comingSoon=${existing.comingSoon}). Nothing to do.`);
    return;
  }

  const minimumCapital = money(CAPITAL);
  const returnPercentage = money(PERCENTAGE);
  const maturityAmount = applyReturn(minimumCapital, returnPercentage);

  const highest = await prisma.package.findFirst({
    orderBy: { displayOrder: "desc" },
    select: { displayOrder: true },
  });

  const data = {
    name: "Tanzanite",
    slug: SLUG,
    minimumCapital,
    returnPercentage,
    maturityAmount,
    durationDays: 30,
    description:
      "The largest subscription tier, with the same verification and settlement process as every other package. Not yet open for subscriptions.",
    badge: null,
    displayOrder: (highest?.displayOrder ?? 0) + 1,
    isActive: true,
    comingSoon: true,
  };

  console.log(`Tanzanite  $${minimumCapital} @ ${returnPercentage}% -> $${maturityAmount}  ${data.durationDays}d`);
  console.log(`  displayOrder ${data.displayOrder}, listed on the site, subscriptions closed`);

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to create it.");
    return;
  }

  const created = await prisma.package.create({ data });

  await writeAudit({
    actor: null,
    action: AUDIT_ACTION.PACKAGE_CREATED,
    entityType: "Package",
    entityId: created.id,
    newValue: {
      name: created.name,
      minimumCapital: created.minimumCapital.toString(),
      returnPercentage: created.returnPercentage.toString(),
      maturityAmount: created.maturityAmount.toString(),
      comingSoon: created.comingSoon,
    },
    reason: "Tanzanite tier requested by the owner, created as coming-soon",
  });

  console.log(`\nCreated ${created.slug}.`);
}

main()
  .catch((error) => {
    console.error("Failed:", error.message ?? error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
