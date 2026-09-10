import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { SETTING_META } from "../src/lib/settings-registry";

/**
 * Restores the company address and contact number.
 *
 * These are the Bangkok details that `update-contact-settings.ts` cleared at the
 * owner's request. The owner has since supplied them again, verbatim, in a later
 * conversation, which is the only basis on which contact details are ever
 * written back.
 *
 * Deliberately narrow: this touches the two keys the owner named and nothing
 * else. In particular it does not go near `payment.wallet.*` — those are only
 * ever written from addresses the owner provides fresh, because a single wrong
 * character loses investor funds permanently.
 *
 * `company.legalName` and `company.registrationNumber` remain untouched and
 * blank. The registry's own guidance on the registration number is "leave blank
 * until an official number is available; never publish an unverified value".
 */
const UPDATES: Record<string, string> = {
  "company.address":
    "Silom Complex Building, 191 Silom Road, Silom, Bangrak, Bangkok, Thailand",
  "support.phone": "+66 82 078 5928",
};

async function main() {
  for (const [key, value] of Object.entries(UPDATES)) {
    const meta = SETTING_META[key as keyof typeof SETTING_META];
    await prisma.siteSetting.upsert({
      where: { key },
      create: {
        key,
        value,
        group: meta.group,
        label: meta.label,
        description: meta.description ?? null,
        updatedById: null,
      },
      update: { value },
    });
    console.log(`OK  ${key} = ${value}`);
  }

  // Read back from the database, so what is printed is what was stored.
  console.log("\n--- verification (read back from database) ---");
  const stored = await prisma.siteSetting.findMany({
    where: { key: { in: Object.keys(UPDATES) } },
    select: { key: true, value: true },
    orderBy: { key: "asc" },
  });
  for (const row of stored) {
    const value = String(row.value);
    console.log(
      `${UPDATES[row.key] === value ? "MATCH   " : "MISMATCH"} ${row.key.padEnd(24)} ${value}`,
    );
  }

  // Confirm the two that must stay empty really are.
  const mustBeBlank = await prisma.siteSetting.findMany({
    where: { key: { in: ["company.legalName", "company.registrationNumber"] } },
    select: { key: true, value: true },
  });
  console.log("\n--- left blank on purpose ---");
  for (const row of mustBeBlank) {
    console.log(`${row.key.padEnd(30)} ${String(row.value) === "" ? "(empty)" : String(row.value)}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
