import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { appUrl } from "../src/lib/env";
import { emailDeliveryStatus } from "../src/lib/email/provider";
import { issueVerificationEmail } from "../src/server/services/accounts";

/**
 * Actually emails a confirmation link to every investor still unconfirmed.
 *
 * This goes through the application's own send path, so recipients get exactly
 * the message registration would have sent them. It differs from
 * `issue-verification-links.ts`, which prints links for an administrator to
 * pass on by hand — that one exists for when mail is broken; this one for when
 * it works.
 *
 * Two refusals up front, because both failure modes are silent and expensive:
 *
 *   - If the provider is not configured, the console provider would "succeed"
 *     while writing to the terminal, and the tokens minted here would supersede
 *     any working links already sent. Refuse instead.
 *   - If the site URL is the development one from .env, every link would point
 *     at localhost. Refuse instead.
 *
 * Delivery is reported per recipient from what the provider actually returned,
 * not assumed.
 */
/**
 * The site the links will actually point at.
 *
 * This must be read from `appUrl` rather than an argument. `appUrl` is a
 * module-level const in lib/env, fixed the moment this file's imports resolve,
 * so assigning process.env inside main() cannot change it — an earlier version
 * did exactly that and would have passed its own guard while still mailing
 * localhost links. Check the value that will be used.
 */
function assertUsableAppUrl(): string {
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(appUrl)) {
    throw new Error(
      `Refusing to send links pointing at ${appUrl}.\n` +
        "That is the development URL from .env here, and the recipient cannot open it.\n" +
        "Issuing them would also invalidate any working link already sent.\n\n" +
        "Run against the production settings instead:\n" +
        "  vercel env pull .env.vercel-temp --environment=production\n" +
        "  npx dotenv -e .env.vercel-temp -- npx tsx --tsconfig tsconfig.scripts.json scripts/send-verification-emails.ts\n" +
        "  Remove-Item .env.vercel-temp",
    );
  }

  return appUrl.replace(/\/+$/, "");
}

async function main() {
  const site = assertUsableAppUrl();

  const status = emailDeliveryStatus();

  // `configured` is true for the console provider outside production, because
  // writing to the log is the intended behaviour when developing. It is not
  // acceptable here: this script mints tokens that supersede any link already
  // sent, so a run that only prints to a terminal actively destroys working
  // links. Require a provider that genuinely delivers.
  if (status.provider === "console" || !status.configured) {
    throw new Error(
      `Email would not actually be delivered: provider "${status.provider}"` +
        (status.reason ? ` — ${status.reason}` : " writes to the log instead of sending") +
        "\n\n" +
        "Nothing was sent, and no tokens were touched.\n" +
        "Load the production settings first:\n" +
        "  vercel env pull .env.vercel-temp --environment=production\n" +
        "  npx dotenv -e .env.vercel-temp -- npx tsx --tsconfig tsconfig.scripts.json scripts/send-verification-emails.ts\n" +
        "  Remove-Item .env.vercel-temp",
    );
  }

  const pending = await prisma.user.findMany({
    where: { role: "USER", emailVerifiedAt: null },
    select: { id: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (pending.length === 0) {
    console.log("Every investor account is already confirmed. Nothing to send.");
    await prisma.$disconnect();
    return;
  }

  console.log(`Sending via "${status.provider}", links pointing at ${site}`);
  console.log(`${pending.length} account(s) awaiting confirmation.\n`);

  let sent = 0;
  for (const user of pending) {
    const delivered = await issueVerificationEmail(user.id, user.email);
    if (delivered) sent += 1;
    console.log(`  ${delivered ? "sent   " : "FAILED "} ${user.email}`);
  }

  console.log(`\n${sent} of ${pending.length} delivered.`);
  if (sent < pending.length) {
    console.log(
      "A failure here is the provider rejecting the message — most often an\n" +
        "unverified sending domain. Check the Resend dashboard for the domain in\n" +
        "EMAIL_FROM. Tokens were still issued, so the links remain valid.",
    );
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
