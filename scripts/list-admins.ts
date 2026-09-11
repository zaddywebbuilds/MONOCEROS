/**
 * Who currently holds administrator access.
 *
 * READ-ONLY. Every account listed here can approve payments, release
 * withdrawals and change the deposit wallet addresses, so the list is worth
 * re-reading periodically rather than assumed. Bootstrap accounts created
 * during setup are easy to forget about, and an admin account that has never
 * been signed into is one nobody would notice being used.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/list-admins.ts
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: {
      email: true, role: true, status: true, twoFactorEnabled: true,
      createdAt: true, lastLoginAt: true,
      profile: { select: { firstName: true, surname: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\n${admins.length} administrator accounts\n`);
  for (const a of admins) {
    const name = [a.profile?.firstName, a.profile?.surname].filter(Boolean).join(" ") || "(no profile name)";
    console.log(`  ${a.email}`);
    console.log(`    ${name}  ·  ${a.role}  ·  ${a.status}`);
    console.log(`    2FA: ${a.twoFactorEnabled ? "ENABLED" : "off"}`);
    console.log(`    created ${a.createdAt.toISOString().slice(0,16).replace("T"," ")}`);
    console.log(`    last login ${a.lastLoginAt ? a.lastLoginAt.toISOString().slice(0,16).replace("T"," ") : "never"}`);
    console.log();
  }
}
main().catch(e => { console.error("Failed:", e.message ?? e); process.exit(1); })
      .finally(() => prisma.$disconnect());
