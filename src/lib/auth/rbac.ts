import "server-only";

import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

import { getSession, type ActiveSession, type SessionUser } from "@/lib/auth/session";
import { AuthorizationError } from "@/lib/errors";

export const STAFF_ROLES: Role[] = ["SUPPORT", "ADMIN", "SUPER_ADMIN"];
export const ADMIN_ROLES: Role[] = ["ADMIN", "SUPER_ADMIN"];

export function isStaff(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}

export function isAdmin(role: Role): boolean {
  return ADMIN_ROLES.includes(role);
}

// ---------------------------------------------------------------------------
// Page guards — these redirect, and are for use in layouts/pages.
// ---------------------------------------------------------------------------

export async function requireSession(returnTo?: string): Promise<ActiveSession> {
  const session = await getSession();
  if (!session) {
    const target = returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login";
    redirect(target);
  }
  return session;
}

/** Any authenticated, non-staff-restricted user. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const session = await requireSession(returnTo);
  return session.user;
}

/** Authenticated AND email-verified. */
export async function requireVerifiedEmail(returnTo?: string): Promise<SessionUser> {
  const user = await requireUser(returnTo);
  if (!user.emailVerified) redirect("/verify-email");
  return user;
}

/** Authenticated, email-verified AND KYC-approved — the gate for investing. */
export async function requireApprovedKyc(returnTo?: string): Promise<SessionUser> {
  const user = await requireVerifiedEmail(returnTo);
  if (user.kycStatus !== "APPROVED") redirect("/dashboard/verification");
  return user;
}

export async function requireAdminPage(returnTo?: string): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    const target = returnTo ? `/admin/login?next=${encodeURIComponent(returnTo)}` : "/admin/login";
    redirect(target);
  }
  if (!isStaff(session.user.role)) redirect("/dashboard");
  return session.user;
}

// ---------------------------------------------------------------------------
// Action guards — these throw, and are for use in server actions / API routes.
// ---------------------------------------------------------------------------

export async function assertUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new AuthorizationError("You must be signed in.");
  return session.user;
}

export async function assertVerifiedEmail(): Promise<SessionUser> {
  const user = await assertUser();
  if (!user.emailVerified) {
    throw new AuthorizationError("Verify your email address before continuing.");
  }
  return user;
}

export async function assertApprovedKyc(): Promise<SessionUser> {
  const user = await assertVerifiedEmail();
  if (user.kycStatus !== "APPROVED") {
    throw new AuthorizationError("Identity verification must be approved first.");
  }
  return user;
}

export async function assertStaff(): Promise<SessionUser> {
  const user = await assertUser();
  if (!isStaff(user.role)) throw new AuthorizationError();
  return user;
}

export async function assertAdmin(): Promise<SessionUser> {
  const user = await assertUser();
  if (!isAdmin(user.role)) throw new AuthorizationError();
  return user;
}

/** Ownership check used on every user-scoped record lookup. */
export function assertOwnership(resourceUserId: string, user: SessionUser): void {
  if (resourceUserId !== user.id && !isAdmin(user.role)) {
    throw new AuthorizationError("This record does not belong to your account.");
  }
}

export { AuthorizationError };
