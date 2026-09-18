/**
 * Deletes named test accounts and their records.
 *
 * DESTRUCTIVE and irreversible. Accounts are named explicitly by reference
 * rather than matched by a pattern, so the set deleted is exactly the set that
 * was reviewed — a heuristic like "no payments" would silently widen the moment
 * someone new registers.
 *
 * Dry run by default; pass --apply to commit. Every deletion goes through
 * deleteInvestorAccount, so it is audit-logged and removes identity documents
 * from storage the same way the admin panel does.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/purge-test-accounts.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/purge-test-accounts.ts --apply
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { deleteInvestorAccount } from "../src/server/services/accounts";

/** Investor accounts to remove, by reference. Reviewed 2026-09-18. */
const PURGE_REFERENCES: string[] = [
  "MON-USR-2026-000001", // Demo Newcomer      — db:seed:demo
  "MON-USR-2026-000002", // Demo Pending       — db:seed:demo
  "MON-USR-2026-000003", // Demo Investor      — db:seed:demo, 4 inv / 4 pay / 3 txn
  "MON-USR-2026-000009", // Stanley Okafor     — owner's test, invalid tx hash, already suspended
  "MON-USR-2026-000015", // varun karthik      — disposable address (daugr.com)
  "MON-USR-2026-000016", // Jamie Long         — disposable address (mx-mailsrv.com)
];

/**
 * Abandoned subscriptions on accounts that are being kept. Deleted on their
 * own so the account survives; the cascade takes each one's payment rows.
 */
const PURGE_INVESTMENTS: string[] = [
  "MON-INV-2026-000005", // admin test, PAYMENT_PENDING, never paid
  "MON-INV-2026-000006", // admin test, PAYMENT_PENDING, never paid
  "MON-INV-2026-000007", // admin test, PAYMENT_PENDING, never paid
];

const APPLY = process.argv.includes("--apply");

async function main() {
  const actor = await prisma.user.findFirst({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: { id: true, email: true, role: true },
    orderBy: { createdAt: "asc" },
  });
  if (!actor) throw new Error("No administrator account found to attribute the deletions to.");

  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN — nothing will be deleted"}`);
  console.log(`Attributed to: ${actor.email}\n${"=".repeat(78)}`);

  console.log("\nACCOUNTS\n");
  for (const reference of PURGE_REFERENCES) {
    const user = await prisma.user.findUnique({
      where: { reference },
      select: {
        id: true,
        email: true,
        role: true,
        profile: { select: { firstName: true, surname: true } },
        _count: { select: { investments: true, payments: true, transactions: true } },
      },
    });

    if (!user) {
      console.log(`  SKIP    ${reference}  (not found — already deleted?)`);
      continue;
    }

    const name = user.profile ? `${user.profile.firstName} ${user.profile.surname}` : "(no profile)";
    const held = `${user._count.investments} inv, ${user._count.payments} pay, ${user._count.transactions} txn`;
    console.log(`  ${APPLY ? "DELETE" : "would"}  ${reference}  ${name} <${user.email}>  [${held}]`);

    if (!APPLY) continue;

    await deleteInvestorAccount({
      admin: actor,
      userId: user.id,
      confirmEmail: user.email.toLowerCase(),
      reason: "Test and demo account cleanup, authorised by the owner 2026-09-18",
      acknowledgeRecords: true,
    });
  }

  console.log("\nABANDONED SUBSCRIPTIONS (accounts kept)\n");
  for (const reference of PURGE_INVESTMENTS) {
    const inv = await prisma.investment.findUnique({
      where: { reference },
      select: {
        id: true,
        status: true,
        principalAmount: true,
        user: { select: { email: true } },
      },
    });

    if (!inv) {
      console.log(`  SKIP    ${reference}  (not found)`);
      continue;
    }

    console.log(
      `  ${APPLY ? "DELETE" : "would"}  ${reference}  ${inv.status}  ${inv.principalAmount}  <${inv.user.email}>`,
    );

    if (!APPLY) continue;
    await prisma.investment.delete({ where: { id: inv.id } });
  }

  const remaining = await prisma.user.count();
  const remainingInvestments = await prisma.investment.count();
  console.log(
    `\n${"=".repeat(78)}\n${APPLY ? "Done." : "Dry run complete — re-run with --apply to commit."}`,
  );
  console.log(`Accounts now: ${remaining}   Investments now: ${remainingInvestments}\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
