import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import type { Role, UserStatus, KycStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { serverEnv } from "@/lib/env";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { requestContext } from "@/lib/request";

export const SESSION_COOKIE = "mon_session";

export interface SessionUser {
  id: string;
  reference: string;
  email: string;
  role: Role;
  status: UserStatus;
  kycStatus: KycStatus;
  emailVerified: boolean;
  firstName: string;
  surname: string;
  fullName: string;
  twoFactorEnabled: boolean;
}

export interface ActiveSession {
  sessionId: string;
  user: SessionUser;
  expiresAt: Date;
}

function sessionTtlHours(role: Role): number {
  const env = serverEnv();
  return role === "USER" ? env.SESSION_TTL_HOURS : env.ADMIN_SESSION_TTL_HOURS;
}

/** Issues a session and writes the HttpOnly cookie. */
export async function createSession(userId: string, role: Role): Promise<void> {
  const token = generateToken(32);
  const tokenHash = hashToken(token);
  const ttlHours = sessionTtlHours(role);
  const expiresAt = new Date(Date.now() + ttlHours * 3_600_000);
  const { ipAddress, userAgent } = await requestContext();

  await prisma.session.create({
    data: { userId, tokenHash, expiresAt, ipAddress, userAgent },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Resolves the current session. Memoised per request so that layouts, pages
 * and server actions in the same render share a single database round-trip.
 */
export const getSession = cache(async (): Promise<ActiveSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { profile: true } } },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  if (session.user.status !== "ACTIVE") return null;

  const { user } = session;

  return {
    sessionId: session.id,
    expiresAt: session.expiresAt,
    user: {
      id: user.id,
      reference: user.reference,
      email: user.email,
      role: user.role,
      status: user.status,
      kycStatus: user.kycStatus,
      emailVerified: Boolean(user.emailVerifiedAt),
      firstName: user.profile?.firstName ?? "",
      surname: user.profile?.surname ?? "",
      fullName: [user.profile?.firstName, user.profile?.surname]
        .filter(Boolean)
        .join(" ")
        .trim(),
      twoFactorEnabled: user.twoFactorEnabled,
    },
  };
});

export async function getCurrentUser(): Promise<SessionUser | null> {
  return (await getSession())?.user ?? null;
}

/** Revokes the caller's session and clears the cookie. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  cookieStore.delete(SESSION_COOKIE);
}

/** Used after a password change or a suspension. */
export async function revokeAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

/** Housekeeping — removes expired and long-revoked session rows. */
export async function pruneSessions(): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 86_400_000);
  const result = await prisma.session.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: cutoff } }],
    },
  });
  return result.count;
}
