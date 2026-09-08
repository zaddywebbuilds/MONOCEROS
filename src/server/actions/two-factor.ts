"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertUser } from "@/lib/auth/rbac";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requestContext } from "@/lib/request";
import { beginTotpSetup, confirmTotpSetup, disableTotp } from "@/server/services/accounts";
import {
  errorState,
  isFrameworkError,
  parseForm,
  successState,
  toErrorState,
  type ActionState,
} from "@/server/actions/types";

// ---------------------------------------------------------------------------
// Setup — step 1: generate secret + QR code (called from client via action)
// ---------------------------------------------------------------------------

export async function generateTotpSetupAction(): Promise<
  ActionState & { secret?: string; qrDataUri?: string }
> {
  try {
    const user = await assertUser();
    if (user.twoFactorEnabled) {
      return errorState("Two-factor authentication is already enabled.");
    }
    const { secret, qrDataUri } = await beginTotpSetup(user.id, user.email);
    return { status: "success", message: "ok", secret, qrDataUri };
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}

// ---------------------------------------------------------------------------
// Setup — step 2: confirm code, store secret, return recovery codes
// ---------------------------------------------------------------------------

const confirmSchema = z.object({
  secret: z.string().min(16),
  code: z.string().min(6).max(8),
});

export async function confirmTotpSetupAction(
  _prev: ActionState & { recoveryCodes?: string[] },
  formData: FormData,
): Promise<ActionState & { recoveryCodes?: string[] }> {
  const parsed = parseForm(confirmSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const user = await assertUser();
    enforceRateLimit("totp", user.id);

    const codes = await confirmTotpSetup(user.id, parsed.data.secret, parsed.data.code);

    revalidatePath("/dashboard/security");
    return { status: "success", message: "Two-factor authentication is now enabled.", recoveryCodes: codes };
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}

// ---------------------------------------------------------------------------
// Disable
// ---------------------------------------------------------------------------

const disableSchema = z.object({
  password: z.string().min(1),
});

export async function disableTotpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(disableSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const user = await assertUser();
    await disableTotp(user.id, parsed.data.password);
    revalidatePath("/dashboard/security");
    return successState("Two-factor authentication has been disabled.");
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}
