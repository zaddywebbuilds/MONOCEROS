import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { writeAudit, AUDIT_ACTION } from "../src/lib/audit";
import { getSettings } from "../src/lib/settings";

/**
 * Gives a referral link to members who registered before the programme existed.
 *
 * Codes are normally allocated at registration, so without this the people who
 * were already here are the only ones who cannot promote anything — the exact
 * opposite of "open to everyone".
 *
 * Investor accounts only. Staff accounts are skipped: an administrator earning
 * commission on investors they themselves approve is a conflict nobody needs.
 *
 * Idempotent, and a dry run unless given --apply.
 */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function suffix(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

function handleFor(username: string | null, firstName: string | null, reference: string): string {
  const base = (username ?? firstName ?? reference)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
  return base || "investor";
}

async function main() {
  const apply = process.argv.includes("--apply");

  const settings = await getSettings();
  if (!settings["referral.enabled"] || !settings["referral.openToAll"]) {
    console.log(
      "The programme is not open to everyone, so links are issued individually from each\n" +
        "investor's page instead. Nothing done.",
    );
    return;
  }

  const members = await prisma.user.findMany({
    where: { role: "USER", referralCode: null, status: "ACTIVE" },
    select: {
      id: true,
      email: true,
      reference: true,
      username: true,
      profile: { select: { firstName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (members.length === 0) {
    console.log("Every active investor already has a referral link.");
    return;
  }

  console.log(`${members.length} account(s) without a referral link:\n`);

  for (const member of members) {
    const handle = handleFor(member.username, member.profile?.firstName ?? null, member.reference);

    let code: string | null = null;
    for (let attempt = 0; attempt < 5 && !code; attempt += 1) {
      const candidate = `${handle}-${suffix()}`;
      const taken = await prisma.user.findUnique({
        where: { referralCode: candidate },
        select: { id: true },
      });
      if (!taken) code = candidate;
    }

    if (!code) {
      console.log(`  ${member.email.padEnd(34)} could not allocate a code, skipped`);
      continue;
    }

    console.log(`  ${member.email.padEnd(34)} /r/${code}`);

    if (!apply) continue;

    await prisma.user.update({ where: { id: member.id }, data: { referralCode: code } });
    await writeAudit({
      actor: null,
      action: AUDIT_ACTION.REFERRAL_CODE_ISSUED,
      entityType: "User",
      entityId: member.id,
      newValue: { referralCode: code },
      reason: "Backfill for members who registered before the referral programme",
    });
  }

  console.log(apply ? "\nDone." : "\nDry run. Re-run with --apply to issue these.");
}

main()
  .catch((error) => {
    console.error("Failed:", error.message ?? error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
