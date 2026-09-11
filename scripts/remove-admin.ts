import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { writeAudit } from "../src/lib/audit";

/**
 * Delete named administrator accounts that were never actually used.
 *
 * The bootstrap run of admin:create makes two accounts whether or not two
 * people exist, and they are easy to forget. An unused admin account is the
 * worst kind to leave active: it can approve payments, release withdrawals and
 * change the deposit wallet addresses, and because it has no normal pattern of
 * activity, nothing would look out of place if it were ever used.
 *
 * Deletion is only appropriate when there is nothing to preserve. This refuses
 * to delete an account that has ever signed in or that holds any financial or
 * identity history, and tells you to suspend it instead — suspension keeps the
 * record and is reversible, deletion is neither.
 *
 * Named accounts only; there is deliberately no bulk or pattern mode.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/remove-admin.ts a@b.com
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/remove-admin.ts a@b.com --confirm
 *
 * Without --confirm it only reports what it would do.
 */

const MINIMUM_REMAINING_ADMINS = 2;

async function main() {
  const args = process.argv.slice(2);
  const confirm = args.includes("--confirm");
  const emails = args.filter((a) => !a.startsWith("--")).map((a) => a.toLowerCase().trim());

  if (emails.length === 0) {
    console.error("Name the account(s) to remove, e.g. remove-admin.ts someone@example.com");
    process.exit(1);
  }

  const totalAdmins = await prisma.user.count({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
  });

  const removable: { id: string; email: string }[] = [];

  for (const email of emails) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, email: true, role: true, status: true, lastLoginAt: true,
        _count: {
          select: {
            investments: true, payments: true, withdrawals: true,
            kycSubmissions: true, loginEvents: true,
          },
        },
      },
    });

    if (!user) {
      console.log(`✗ ${email} — no such account`);
      continue;
    }
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      console.log(`✗ ${email} — is a ${user.role}, not an administrator. Refusing.`);
      continue;
    }
    if (user.lastLoginAt) {
      console.log(
        `✗ ${email} — has signed in (${user.lastLoginAt.toISOString().slice(0, 16)}). ` +
          `Suspend it instead of deleting, so its history stays attributable.`,
      );
      continue;
    }

    const held = Object.entries(user._count).filter(([, n]) => n > 0);
    if (held.length > 0) {
      const summary = held.map(([k, n]) => `${n} ${k}`).join(", ");
      console.log(`✗ ${email} — holds ${summary}. Suspend it instead of deleting.`);
      continue;
    }

    console.log(`✓ ${email} — never signed in, holds no records, safe to delete`);
    removable.push({ id: user.id, email: user.email });
  }

  if (removable.length === 0) {
    console.log("\nNothing to do.");
    return;
  }

  const remaining = totalAdmins - removable.length;
  if (remaining < MINIMUM_REMAINING_ADMINS) {
    console.error(
      `\nRefusing: this would leave ${remaining} administrator(s). ` +
        `At least ${MINIMUM_REMAINING_ADMINS} must remain, so nobody is locked out of the platform.`,
    );
    process.exit(1);
  }

  if (!confirm) {
    console.log(
      `\nWould delete ${removable.length} account(s), leaving ${remaining}.\n` +
        `Nothing has been changed. Re-run with --confirm to carry it out.`,
    );
    return;
  }

  for (const { id, email } of removable) {
    // Recorded before the row goes, because AuditLog.actor is SetNull on
    // delete — the denormalised actorEmail is what survives to say who this was.
    await writeAudit({
      actor: null,
      action: "admin.removed",
      entityType: "user",
      entityId: id,
      oldValue: { email, role: "ADMIN" },
      reason: "Unused bootstrap administrator account removed via remove-admin.ts",
    });
    await prisma.user.delete({ where: { id } });
    console.log(`  deleted ${email}`);
  }

  const left = await prisma.user.count({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } });
  console.log(`\n${left} administrator account(s) remain.`);
}

main()
  .catch((err) => {
    console.error("Failed:", err.message ?? err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
