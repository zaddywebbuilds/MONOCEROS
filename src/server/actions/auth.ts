"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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
  issueVerificationEmail,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  verifyEmailToken,
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

    await loginUser(email, password, { staffOnly: true });
    resetRateLimit("login", `admin:${key}:${email}`);

    if (next && next.startsWith("/admin")) destination = next;
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }

  redirect(destination);
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
    await issueVerificationEmail(user.id, user.email);
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
