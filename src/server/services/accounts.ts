import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { appUrl, serverEnv } from "@/lib/env";
import { nextReference } from "@/lib/references";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  expiresInHours,
  expiresInMinutes,
  generateToken,
  hashToken,
  TOKEN_TTL,
} from "@/lib/auth/tokens";
import { createSession, revokeAllSessions } from "@/lib/auth/session";
import {
  generateTotpSecret,
  getTotpQrDataUri,
  verifyTotpCode,
  generateRecoveryCodes,
  hashRecoveryCode,
} from "@/lib/auth/totp";
import { requestContext } from "@/lib/request";
import { formatBusinessDateTime } from "@/lib/time";
import { notify, notifications } from "@/lib/notifications";
import { writeAudit, AUDIT_ACTION } from "@/lib/audit";
import {
  sendEmailVerifiedEmail,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWalletChangedEmail,
  sendWelcomeEmail,
} from "@/lib/email";
import { BusinessRuleError } from "@/lib/errors";
import type { RegistrationInput } from "@/lib/validation/auth";
import { AuthError } from "@/lib/errors";

/**
 * Account lifecycle: registration, sign-in, verification, password recovery.
 *
 * Two rules run through everything here:
 *  - Enumeration is never leaked. "Email already registered", "no such user"
 *    and "wrong password" all resolve to the same user-facing outcome.
 *  - Every authentication attempt is logged, successful or not.
 */

const GENERIC_LOGIN_FAILURE = "Those sign-in details are not correct.";

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export async function registerUser(input: RegistrationInput): Promise<{ userId: string }> {
  const passwordHash = await hashPassword(input.password);
  const dateOfBirth = new Date(`${input.dateOfBirth}T00:00:00Z`);

  let userId: string;
  let verificationToken: string;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          reference: await nextReference("user", tx),
          email: input.email,
          passwordHash,
          role: "USER",
          profile: {
            create: {
              firstName: input.firstName,
              surname: input.surname,
              otherName: input.otherName ?? null,
              dateOfBirth,
              phone: input.phone,
              country: "Nigeria",
            },
          },
        },
      });

      const token = generateToken();
      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: expiresInHours(TOKEN_TTL.emailVerificationHours),
        },
      });

      await notify(notifications.registered(user.id), tx);

      return { userId: user.id, token };
    });

    userId = result.userId;
    verificationToken = result.token;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Do not confirm that the address exists. Tell the existing owner instead.
      const existing = await prisma.user.findUnique({ where: { email: input.email } });
      if (existing && !existing.emailVerifiedAt) {
        await issueVerificationEmail(existing.id, existing.email);
      }
      throw new BusinessRuleError(
        "If that email address can be registered, we have sent a confirmation link to it.",
      );
    }
    throw error;
  }

  await sendWelcomeEmail(
    input.email,
    input.firstName,
    `${appUrl}/verify-email?token=${verificationToken}`,
  );

  return { userId };
}

/**
 * Issues a fresh verification token and mails it.
 *
 * Returns whether the message actually left. The token is always created, so a
 * link generated here stays valid even when delivery fails — which is what lets
 * an administrator hand it over by another route.
 */
export async function issueVerificationEmail(userId: string, email: string): Promise<boolean> {
  const token = generateToken();

  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt: expiresInHours(TOKEN_TTL.emailVerificationHours),
      },
    });
  });

  return sendVerificationEmail(email, `${appUrl}/verify-email?token=${token}`);
}

export async function verifyEmailToken(token: string): Promise<{ email: string }> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { profile: true } } },
  });

  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    throw new AuthError("That confirmation link is invalid or has expired.");
  }

  if (record.user.emailVerifiedAt) {
    return { email: record.user.email };
  }

  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    await tx.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    });
    await notify(notifications.emailVerified(record.userId), tx);
  });

  await sendEmailVerifiedEmail(
    record.user.email,
    record.user.profile?.firstName ?? "there",
  );

  return { email: record.user.email };
}

// ---------------------------------------------------------------------------
// Sign-in
// ---------------------------------------------------------------------------

export type LoginResult =
  | { status: "ok"; userId: string; role: "USER" | "SUPPORT" | "ADMIN" | "SUPER_ADMIN"; emailVerified: boolean }
  | { status: "2fa_required"; challengeToken: string; userId: string; role: "USER" | "SUPPORT" | "ADMIN" | "SUPER_ADMIN"; emailVerified: boolean };

export async function loginUser(
  email: string,
  password: string,
  options: { staffOnly?: boolean } = {},
): Promise<LoginResult> {
  const env = serverEnv();
  const { ipAddress, userAgent } = await requestContext();

  const user = await prisma.user.findUnique({ where: { email } });

  const logFailure = async (reason: string) => {
    await prisma.loginEvent.create({
      data: { userId: user?.id ?? null, email, success: false, reason, ipAddress, userAgent },
    });
  };

  if (!user) {
    await logFailure("unknown_account");
    throw new AuthError(GENERIC_LOGIN_FAILURE);
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    await logFailure("locked");
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    throw new AuthError(
      `This account is temporarily locked after too many failed attempts. Try again in ${minutes} minute(s).`,
    );
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);

  if (!passwordOk) {
    const failures = user.failedLoginCount + 1;
    const shouldLock = failures >= env.LOGIN_MAX_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: shouldLock ? 0 : failures,
        lockedUntil: shouldLock ? expiresInMinutes(env.LOGIN_LOCK_MINUTES) : null,
      },
    });

    await logFailure(shouldLock ? "locked_out" : "bad_password");

    if (shouldLock && (user.role === "ADMIN" || user.role === "SUPER_ADMIN")) {
      await writeAudit({
        actor: { id: user.id, email: user.email, role: user.role },
        action: AUDIT_ACTION.ADMIN_LOGIN_FAILED,
        entityType: "User",
        entityId: user.id,
        reason: "Too many failed attempts; account locked",
      });
    }

    throw new AuthError(GENERIC_LOGIN_FAILURE);
  }

  if (user.status !== "ACTIVE") {
    await logFailure("suspended");
    throw new AuthError(
      "This account is not currently active. Please contact support for assistance.",
    );
  }

  if (options.staffOnly && !["SUPPORT", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    await logFailure("not_staff");
    throw new AuthError(GENERIC_LOGIN_FAILURE);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    await tx.loginEvent.create({
      data: { userId: user.id, email, success: true, ipAddress, userAgent },
    });
  });

  const base = { userId: user.id, role: user.role, emailVerified: Boolean(user.emailVerifiedAt) };

  // If 2FA is enabled, issue a short-lived challenge token instead of a session
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    const token = generateToken(32);
    const tokenHash = hashToken(token);
    await prisma.twoFactorChallenge.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: expiresInMinutes(5),
      },
    });
    return { status: "2fa_required" as const, challengeToken: token, ...base };
  }

  await createSession(user.id, user.role);

  if (["ADMIN", "SUPER_ADMIN", "SUPPORT"].includes(user.role)) {
    await prisma.adminProfile.updateMany({
      where: { userId: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ipAddress },
    });
    await writeAudit({
      actor: { id: user.id, email: user.email, role: user.role },
      action: AUDIT_ACTION.ADMIN_LOGIN,
      entityType: "User",
      entityId: user.id,
    });
  }

  return { status: "ok" as const, ...base };
}

// ---------------------------------------------------------------------------
// Password recovery and change
// ---------------------------------------------------------------------------

/** Always resolves successfully — the caller must not learn whether the address exists. */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE") return;

  const token = generateToken();

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: expiresInMinutes(TOKEN_TTL.passwordResetMinutes),
      },
    });
  });

  await sendPasswordResetEmail(user.email, `${appUrl}/reset-password?token=${token}`);
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    throw new AuthError("That reset link is invalid or has expired. Request a new one.");
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    await tx.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    await notify(notifications.passwordChanged(record.userId), tx);
  });

  await revokeAllSessions(record.userId);
  await sendPasswordChangedEmail(record.user.email, formatBusinessDateTime(new Date()));
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  currentSessionId?: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AuthError("Account not found.");

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw new AuthError("Your current password is not correct.");

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash, passwordChangedAt: new Date() },
    });
    await notify(notifications.passwordChanged(userId), tx);
  });

  await revokeAllSessions(userId, currentSessionId);
  await sendPasswordChangedEmail(user.email, formatBusinessDateTime(new Date()));
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function updateWithdrawalWallet(
  userId: string,
  walletAddress: string,
  walletNetwork: string,
  password: string,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  if (!user || !user.profile) throw new AuthError("Account not found.");

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new AuthError("That password is not correct.");

  if (
    user.profile.withdrawalWalletAddress === walletAddress &&
    user.profile.withdrawalWalletNetwork === walletNetwork
  ) {
    return;
  }

  const { ipAddress, userAgent } = await requestContext();

  await prisma.$transaction(async (tx) => {
    await tx.userProfile.update({
      where: { userId },
      data: {
        withdrawalWalletAddress: walletAddress,
        withdrawalWalletNetwork: walletNetwork,
      },
    });
    await tx.walletChangeLog.create({
      data: {
        userId,
        oldAddress: user.profile?.withdrawalWalletAddress ?? null,
        oldNetwork: user.profile?.withdrawalWalletNetwork ?? null,
        newAddress: walletAddress,
        newNetwork: walletNetwork,
        ipAddress,
        userAgent,
      },
    });
    await notify(notifications.walletChanged(userId), tx);
  });

  await sendWalletChangedEmail(user.email, {
    newAddress: walletAddress,
    network: walletNetwork,
    when: formatBusinessDateTime(new Date()),
  });
}

export async function updateProfile(userId: string, phone: string): Promise<void> {
  await prisma.userProfile.update({ where: { userId }, data: { phone } });
}

// ---------------------------------------------------------------------------
// Two-factor authentication
// ---------------------------------------------------------------------------

const TWO_FACTOR_COOKIE = "mon_2fa_challenge";

/**
 * Begins TOTP setup: generates a secret and QR code URI but does NOT save
 * anything yet — the user must verify a code first.
 */
export async function beginTotpSetup(
  userId: string,
  email: string,
): Promise<{ secret: string; qrDataUri: string }> {
  const secret = generateTotpSecret();
  const qrDataUri = await getTotpQrDataUri(email, secret);
  return { secret, qrDataUri };
}

/**
 * Confirms TOTP setup: verifies the user's first code, saves the secret,
 * and generates+stores recovery codes. Returns the plaintext recovery codes
 * (shown once, never stored in plain text).
 */
export async function confirmTotpSetup(
  userId: string,
  secret: string,
  code: string,
): Promise<string[]> {
  if (!verifyTotpCode(secret, code)) {
    throw new BusinessRuleError("The code is incorrect. Please try again.");
  }

  const plainCodes = generateRecoveryCodes();
  const hashes = plainCodes.map(hashRecoveryCode);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret, twoFactorEnabled: true },
    });
    // Replace any existing recovery codes
    await tx.twoFactorRecoveryCode.deleteMany({ where: { userId } });
    await tx.twoFactorRecoveryCode.createMany({
      data: hashes.map((codeHash) => ({ userId, codeHash })),
    });
  });

  return plainCodes;
}

/**
 * Disables TOTP after verifying the user's password.
 */
export async function disableTotp(userId: string, password: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AuthError("Account not found.");

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new AuthError("That password is not correct.");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    await tx.twoFactorRecoveryCode.deleteMany({ where: { userId } });
  });
}

/**
 * Verifies a TOTP challenge during login: validates the challenge cookie token,
 * checks the TOTP code (or a recovery code), creates a real session.
 */
export async function completeTotpChallenge(
  challengeToken: string,
  code: string,
): Promise<{ userId: string; role: "USER" | "SUPPORT" | "ADMIN" | "SUPER_ADMIN" }> {
  const tokenHash = hashToken(challengeToken);
  const challenge = await prisma.twoFactorChallenge.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!challenge) throw new AuthError("Invalid or expired sign-in challenge.");
  if (challenge.usedAt) throw new AuthError("This challenge has already been used.");
  if (challenge.expiresAt.getTime() < Date.now()) {
    throw new AuthError("This sign-in challenge has expired. Please sign in again.");
  }

  const { user } = challenge;
  if (!user.twoFactorSecret) throw new AuthError("Two-factor authentication is not configured.");

  const isTotp = verifyTotpCode(user.twoFactorSecret, code);

  if (!isTotp) {
    // Try recovery code
    const normalised = code.toUpperCase().replace(/[\s-]/g, "");
    const codeHash = hashRecoveryCode(normalised);
    const recovery = await prisma.twoFactorRecoveryCode.findFirst({
      where: { userId: user.id, codeHash, usedAt: null },
    });
    if (!recovery) {
      throw new AuthError("The code you entered is incorrect.");
    }
    await prisma.twoFactorRecoveryCode.update({
      where: { id: recovery.id },
      data: { usedAt: new Date() },
    });
  }

  // Mark challenge used
  await prisma.twoFactorChallenge.update({
    where: { id: challenge.id },
    data: { usedAt: new Date() },
  });

  // Create the real session
  await createSession(user.id, user.role);

  if (["ADMIN", "SUPER_ADMIN", "SUPPORT"].includes(user.role)) {
    const { ipAddress } = await requestContext();
    await prisma.adminProfile.updateMany({
      where: { userId: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ipAddress },
    });
    await writeAudit({
      actor: { id: user.id, email: user.email, role: user.role },
      action: AUDIT_ACTION.ADMIN_LOGIN,
      entityType: "User",
      entityId: user.id,
    });
  }

  return { userId: user.id, role: user.role };
}

export { AuthError, TWO_FACTOR_COOKIE };
