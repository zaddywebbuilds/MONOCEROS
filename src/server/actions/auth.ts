"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registrationSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";
import { enforceRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { requestContext } from "@/lib/request";
import { destroySession, getSession } from "@/lib/auth/session";
import { assertUser, isStaff } from "@/lib/auth/rbac";
import {
  changePassword,
  completeTotpChallenge,
  issueVerificationEmail,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  verifyEmailToken,
  TWO_FACTOR_COOKIE,
} from "@/server/services/accounts";
import { prisma } from "@/lib/prisma";
import {
  errorState,
  isFrameworkError,
  parseForm,
  successState,
  toErrorState,
  type ActionState,
} from "@/server/actions/types";

async function clientKey(): Promise<string> {
  const { ipAddress } = await requestContext();
  return ipAddress ?? "unknown";
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(registrationSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    enforceRateLimit("register", await clientKey());
    await registerUser(parsed.data);
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }

  redirect("/register/success");
}

// ---------------------------------------------------------------------------
// Sign in / sign out
// ---------------------------------------------------------------------------

async function set2faChallengeCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TWO_FACTOR_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 5 * 60, // 5 minutes
  });
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.ok) return parsed.state;

  const { email, password, next } = parsed.data;
  let destination = "/dashboard";

  try {
    const key = await clientKey();
    enforceRateLimit("login", `${key}:${email}`);

    const result = await loginUser(email, password);
    resetRateLimit("login", `${key}:${email}`);

    if (result.status === "2fa_required") {
      await set2faChallengeCookie(result.challengeToken);
      const nextParam = next ? `&next=${encodeURIComponent(next)}` : "";
      redirect(`/login/two-factor?type=user${nextParam}`);
    }

    if (isStaff(result.role)) destination = "/admin";
    else if (!result.emailVerified) destination = "/verify-email";
    else if (next && next.startsWith("/") && !next.startsWith("//")) destination = next;
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }

  redirect(destination);
}

export async function adminLoginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.ok) return parsed.state;

  const { email, password, next } = parsed.data;
  let destination = "/admin";

  try {
    const key = await clientKey();
    enforceRateLimit("login", `admin:${key}:${email}`);

    const result = await loginUser(email, password, { staffOnly: true });
    resetRateLimit("login", `admin:${key}:${email}`);

    if (result.status === "2fa_required") {
      await set2faChallengeCookie(result.challengeToken);
      const nextParam = next ? `&next=${encodeURIComponent(next)}` : "";
      redirect(`/login/two-factor?type=admin${nextParam}`);
    }

    if (next && next.startsWith("/admin")) destination = next;
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }

  redirect(destination);
}

export async function verifyTotpLoginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const cookieStore = await cookies();
    const challengeToken = cookieStore.get(TWO_FACTOR_COOKIE)?.value;
    if (!challengeToken) return errorState("Your sign-in session has expired. Please sign in again.");

    const code = formData.get("code")?.toString().trim() ?? "";
    if (!code) return errorState("Please enter your authenticator code.");

    enforceRateLimit("totp", await clientKey());

    const result = await completeTotpChallenge(challengeToken, code);
    cookieStore.delete(TWO_FACTOR_COOKIE);

    const next = formData.get("next")?.toString() ?? "";
    const isAdmin = isStaff(result.role);
    const destination = isAdmin
      ? next.startsWith("/admin") ? next : "/admin"
      : next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

    redirect(destination);
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

export async function verifyEmailAction(token: string): Promise<ActionState> {
  try {
    await verifyEmailToken(token);
    revalidatePath("/dashboard");
    return successState("Your email address has been confirmed.");
  } catch (error) {
    return toErrorState(error);
  }
}

export async function resendVerificationAction(): Promise<ActionState> {
  try {
    const user = await assertUser();
    if (user.emailVerified) {
      return successState("Your email address is already confirmed.");
    }
    enforceRateLimit("passwordReset", `verify:${user.id}`);
    const sent = await issueVerificationEmail(user.id, user.email);

    // Telling somebody to check an inbox nothing was sent to is how a
    // misconfiguration goes unnoticed for days. Say what actually happened.
    if (!sent) {
      return errorState(
        "We could not send the confirmation email just now. Please contact support and we will confirm your address for you.",
      );
    }

    return successState("We have sent a new confirmation link to your email address.");
  } catch (error) {
    return toErrorState(error);
  }
}

// ---------------------------------------------------------------------------
// Password recovery
// ---------------------------------------------------------------------------

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(forgotPasswordSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    enforceRateLimit("passwordReset", await clientKey());
    await requestPasswordReset(parsed.data.email);
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }

  // Deliberately identical whether or not the address exists.
  return successState(
    "If an account exists for that address, a password reset link is on its way. The link expires in 60 minutes.",
  );
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(resetPasswordSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    enforceRateLimit("passwordReset", await clientKey());
    await resetPassword(parsed.data.token, parsed.data.password);
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }

  redirect("/login?reset=1");
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(changePasswordSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const session = await getSession();
    if (!session) return errorState("You must be signed in.");

    await changePassword(
      session.user.id,
      parsed.data.currentPassword,
      parsed.data.password,
      session.sessionId,
    );

    revalidatePath("/dashboard/security");
    return successState("Your password has been changed. Other devices have been signed out.");
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}

/** Signs out every other device from the security page. */
export async function revokeOtherSessionsAction(): Promise<ActionState> {
  try {
    const session = await getSession();
    if (!session) return errorState("You must be signed in.");

    const result = await prisma.session.updateMany({
      where: { userId: session.user.id, revokedAt: null, id: { not: session.sessionId } },
      data: { revokedAt: new Date() },
    });

    revalidatePath("/dashboard/security");
    return successState(
      result.count === 0
        ? "There were no other active sessions."
        : `Signed out ${result.count} other session${result.count === 1 ? "" : "s"}.`,
    );
  } catch (error) {
    return toErrorState(error);
  }
}
