import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { appUrl } from "../src/lib/env";
import { emailDeliveryStatus } from "../src/lib/email/provider";
import { issueVerificationEmail } from "../src/server/services/accounts";

/**
 * Withdraws email confirmation from named accounts and asks for it again.
 *
 * Needed when a confirmation link was opened by somebody other than the person
 * who owns the inbox — an administrator testing a link meant to be forwarded,
 * say. The account then reads as confirmed while nobody has demonstrated
 * control of the address, which is the single thing the step exists to prove.
 * KYC and payment gating sit downstream of that flag, so it needs to mean what
 * it claims.
 *
 * Accounts are named explicitly on the command line. There is deliberately no
 * "all accounts" mode: revoking confirmation in bulk would lock out investors
 * who verified themselves perfectly well.
 *
 * Two things below are load-bearing, and both were mistakes first:
 *
 *   - The link URL is read from `appUrl`, not from an argument. `appUrl` is a
 *     module-level const in lib/env, fixed when this file's imports resolve, so
 *     assigning process.env inside main() would do nothing at all while looking
 *     like it worked. Check the value that will actually be used.
 *   - Mail is sent BEFORE the flag is cleared, and the flag is cleared only for
 *     recipients the provider accepted. A failed send therefore leaves the
 *     account exactly as it was, rather than unconfirmed with no way back in.
 */
function assertUsableAppUrl(): string {
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(appUrl)) {
    throw new Error(
      `Links would point at ${appUrl}, which the recipient cannot open.\n` +
        "That value comes from .env in this directory. Nothing was changed.\n\n" +
        "Run against the production settings instead:\n" +
        "  vercel env pull .env.vercel-temp --environment=production\n" +
        "  npx dotenv -e .env.vercel-temp -- npx tsx --tsconfig tsconfig.scripts.json scripts/reverify-accounts.ts <email...>\n" +
        "  Remove-Item .env.vercel-temp",
    );
  }
  return appUrl.replace(/\/+$/, "");
}

/**
 * Clears the flag without sending anything.
 *
 * Once RESEND_API_KEY is stored as a Secret it is unavailable to `vercel env
 * pull`, so this script cannot send from a developer machine even with the
 * production settings loaded — which is the point of a Secret. Withdrawing the
 * confirmation on its own is still safe, because it is not a dead end: signing
 * in routes an unconfirmed user to /verify-email, and the resend button there
 * runs on the server, where the key does exist.
 */
async function clearOnly(emails: string[]) {
  const users = await prisma.user.findMany({
    where: { email: { in: emails }, role: "USER" },
    select: { id: true, email: true, emailVerifiedAt: true },
  });

  for (const email of emails) {
    if (!users.some((u) => u.email.toLowerCase() === email)) {
      console.log(`  skipped   ${email} — no investor account with that address`);
    }
  }

  for (const user of users) {
    if (!user.emailVerifiedAt) {
      console.log(`  unchanged ${user.email} — already unconfirmed`);
      continue;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: null },
    });
    console.log(`  withdrawn ${user.email} — now pending`);
  }

  console.log(
    "\nNo email was sent. Ask each person to sign in with the password they already\n" +
      "have; the site will take them to /verify-email, where they can send themselves\n" +
      "a fresh link. Nothing else about their account has changed.",
  );
}

async function main() {
  const args = process.argv.slice(2);
  const sendEmail = !args.includes("--no-email");
  const emails = args
    .filter((a) => !a.startsWith("--"))
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) {
    throw new Error(
      "Name the accounts to re-verify:\n" +
        "  npx tsx --tsconfig tsconfig.scripts.json scripts/reverify-accounts.ts someone@example.com\n\n" +
        "Add --no-email to withdraw confirmation without sending, leaving the person\n" +
        "to request a link themselves from /verify-email.",
    );
  }

  if (!sendEmail) {
    await clearOnly(emails);
    return;
  }

  const site = assertUsableAppUrl();

  // Checked before any write: never revoke a confirmation we cannot ask for again.
  const status = emailDeliveryStatus();
  if (status.provider === "console" || !status.configured) {
    throw new Error(
      `Email would not be delivered: provider "${status.provider}"` +
        (status.reason ? ` — ${status.reason}` : " writes to the log instead of sending") +
        "\n\nNothing was changed. Load the production settings as shown in the header of this file.",
    );
  }

  const users = await prisma.user.findMany({
    where: { email: { in: emails }, role: "USER" },
    select: { id: true, email: true, emailVerifiedAt: true },
  });

  for (const email of emails) {
    if (!users.some((u) => u.email.toLowerCase() === email)) {
      console.log(`  skipped   ${email} — no investor account with that address`);
    }
  }

  if (users.length === 0) {
    console.log("\nNothing to do.");
    return;
  }

  console.log(`Sending via "${status.provider}", links pointing at ${site}\n`);

  let cleared = 0;
  for (const user of users) {
    const delivered = await issueVerificationEmail(user.id, user.email);

    if (!delivered) {
      console.log(`  FAILED    ${user.email} — not sent, confirmation left untouched`);
      continue;
    }

    if (user.emailVerifiedAt) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: null },
      });
      cleared += 1;
      console.log(`  sent      ${user.email} — confirmation withdrawn, now pending`);
    } else {
      console.log(`  sent      ${user.email} — was already pending`);
    }
  }

  if (cleared > 0) {
    console.log(
      `\n${cleared} account(s) can no longer subscribe to a package until the owner opens\n` +
        "the link from their own inbox. They can still sign in; the site routes them\n" +
        "to /verify-email, where they can request another link themselves.",
    );
  }

  if (users.some((u) => u.emailVerifiedAt) && cleared < users.length) {
    console.log(
      "\nWhere delivery failed the account is still marked confirmed. Fix the provider\n" +
        "— an unverified sending domain is the usual cause — and run this again.",
    );
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
