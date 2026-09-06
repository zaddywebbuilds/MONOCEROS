import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Opaque token helpers.
 *
 * Only the SHA-256 hash of a token is persisted, so a database disclosure can
 * never be replayed against the application.
 */

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const TOKEN_TTL = {
  emailVerificationHours: 24,
  passwordResetMinutes: 60,
} as const;

export function expiresInHours(hours: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + hours * 3_600_000);
}

export function expiresInMinutes(minutes: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + minutes * 60_000);
}
