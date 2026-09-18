/**
 * Full inventory of every account and what it holds.
 *
 * READ-ONLY. Written to answer two questions before any destructive cleanup:
 * which accounts are real, and why a given account cannot sign in. Prints the
 * status field that gates login (`User.status`, checked in `authenticate`) next
 * to the records that block deletion, so the two are read together.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/account-audit.ts
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      reference: true,
      email: true,
      role: true,
      status: true,
      kycStatus: true,
      emailVerifiedAt: true,
      createdAt: true,
      lastLoginAt: true,
      profile: { select: { firstName: true, surname: true } },
      _count: {
        select: {
          investments: true,
          payments: true,
          withdrawals: true,
          rollovers: true,
          transactions: true,
          kycSubmissions: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\n${users.length} accounts\n${"=".repeat(100)}`);

  for (const u of users) {
    const name = u.profile ? `${u.profile.firstName} ${u.profile.surname}` : "(no profile)";
    const c = u._count;
    const holdings = [
      c.investments && `${c.investments} inv`,
      c.payments && `${c.payments} pay`,
      c.withdrawals && `${c.withdrawals} wd`,
      c.rollovers && `${c.rollovers} roll`,
      c.transactions && `${c.transactions} txn`,
      c.kycSubmissions && `${c.kycSubmissions} kyc`,
    ]
      .filter(Boolean)
      .join(", ");

    console.log(`\n${u.reference}  ${name}`);
    console.log(`  email      ${u.email}`);
    console.log(`  role       ${u.role}`);
    console.log(`  STATUS     ${u.status}${u.status !== "ACTIVE" ? "   <-- CANNOT SIGN IN" : ""}`);
    console.log(`  kyc        ${u.kycStatus}`);
    console.log(`  verified   ${u.emailVerifiedAt ? u.emailVerifiedAt.toISOString() : "NOT VERIFIED  <-- blocks login too"}`);
    console.log(`  created    ${u.createdAt.toISOString()}`);
    console.log(`  lastLogin  ${u.lastLoginAt ? u.lastLoginAt.toISOString() : "never"}`);
    console.log(`  holds      ${holdings || "nothing (deletable today)"}`);
  }

  // Money actually recorded, so "real" can be judged on payments rather than
  // on which accounts happen to look plausible.
  console.log(`\n\n${"=".repeat(100)}\nINVESTMENTS\n${"=".repeat(100)}`);
  const investments = await prisma.investment.findMany({
    select: {
      reference: true,
      status: true,
      principalAmount: true,
      maturityAmount: true,
      packageNameSnapshot: true,
      createdAt: true,
      user: { select: { email: true, reference: true } },
      payments: {
        select: {
          status: true,
          transactionHash: true,
          network: true,
          expectedAmount: true,
          submittedAmount: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  for (const inv of investments) {
    console.log(`\n${inv.reference}  ${inv.status}  ${inv.packageNameSnapshot}`);
    console.log(`  user       ${inv.user.reference}  ${inv.user.email}`);
    console.log(`  principal  ${inv.principalAmount}  ->  ${inv.maturityAmount}`);
    console.log(`  created    ${inv.createdAt.toISOString()}`);
    for (const p of inv.payments) {
      console.log(
        `  payment    ${p.status}  ${p.network}  expected=${p.expectedAmount} submitted=${p.submittedAmount ?? "-"}  hash=${p.transactionHash ?? "(none)"}`,
      );
    }
  }

  // Answers "who suspended this account, and when" — the audit log is the only
  // place that survives to say so.
  console.log(`\n\n${"=".repeat(100)}\nAUDIT LOG — account status changes & deletions\n${"=".repeat(100)}`);
  const audits = await prisma.auditLog.findMany({
    where: {
      action: {
        in: ["user.suspended", "user.unsuspended", "user.deleted", "user.created"],
      },
    },
    orderBy: { createdAt: "asc" },
  });
  if (audits.length === 0) console.log("\n(no status-change entries at all)");
  for (const a of audits) {
    console.log(`\n${a.createdAt.toISOString()}  ${a.action}`);
    console.log(`  actor      ${a.actorEmail ?? "(system / none)"}`);
    console.log(`  target     ${a.entityType} ${a.entityId}`);
    console.log(`  reason     ${a.reason ?? "(none given)"}`);
    console.log(`  old -> new ${JSON.stringify(a.oldValue)} -> ${JSON.stringify(a.newValue)}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
