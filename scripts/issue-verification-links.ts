import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { expiresInHours, generateToken, hashToken, TOKEN_TTL } from "../src/lib/auth/tokens";

/**
 * Prints a working confirmation link for every investor whose email is still
 * unconfirmed.
 *
 * This exists because outbound mail was misconfigured for days, so people
 * registered and never received anything. It performs exactly what the "send a
 * new confirmation link" button performs — supersede any outstanding tokens,
 * mint a fresh one, store only its hash — and then prints the link instead of
 * mailing it, so an administrator can pass it on by another channel.
 *
 * It does not confirm anybody's address. The recipient still has to open the
 * link, which is the point: the whole purpose of the step is that the person
 * holding the inbox proves they hold it.
 *
 * The link is a credential for that account until it expires. Send it only to
 * the address it belongs to, and only over a channel you trust.
 */
/**
 * The site these links must point at.
 *
 * Taken from the first argument, or from the environment. The guard below
 * matters: `.env` here holds the development URL, so running this without
 * thinking produces http://localhost:3000 links — which look perfectly correct,
 * are useless to the recipient, and silently void the working links issued
 * before them. Refuse rather than hand somebody a dead link.
 */
function resolveAppUrl(): string {
  const fromArg = process.argv[2];
  const appUrl = fromArg ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;

  if (!appUrl) {
    throw new Error(
      "No site URL. Pass one:\n" +
        "  npx tsx --tsconfig tsconfig.scripts.json scripts/issue-verification-links.ts https://www.monocerosai.live",
    );
  }

  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(appUrl)) {
    throw new Error(
      `Refusing to issue links pointing at ${appUrl}.\n` +
        "That is the development URL from .env, and nobody can open it but you.\n" +
        "Issuing them would also invalidate any working links already sent.\n\n" +
        "Pass the live site explicitly:\n" +
        "  npx tsx --tsconfig tsconfig.scripts.json scripts/issue-verification-links.ts https://www.monocerosai.live",
    );
  }

  return appUrl.replace(/\/+$/, "");
}

async function main() {
  const appUrl = resolveAppUrl();

  const pending = await prisma.user.findMany({
    where: { role: "USER", emailVerifiedAt: null },
    select: { id: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (pending.length === 0) {
    console.log("Every investor account is already confirmed. Nothing to do.");
    await prisma.$disconnect();
    return;
  }

  console.log(`${pending.length} account(s) awaiting confirmation.`);
  console.log(`Links point at ${appUrl} and expire in ${TOKEN_TTL.emailVerificationHours} hours.\n`);

  for (const user of pending) {
    const token = generateToken();

    await prisma.$transaction(async (tx) => {
      // Supersede anything outstanding, so only the newest link works.
      await tx.emailVerificationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: expiresInHours(TOKEN_TTL.emailVerificationHours),
        },
      });
    });

    console.log(`  ${user.email}`);
    console.log(`  registered ${user.createdAt.toISOString().slice(0, 16).replace("T", " ")}`);
    console.log(`  ${appUrl}/verify-email?token=${token}`);
    console.log("");
  }

  console.log("Send each link only to the address printed above it.");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
