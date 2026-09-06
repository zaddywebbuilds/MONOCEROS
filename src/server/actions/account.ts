"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { assertUser, assertVerifiedEmail } from "@/lib/auth/rbac";
import { kycSubmissionSchema } from "@/lib/validation/platform";
import { profileUpdateSchema, withdrawalWalletSchema } from "@/lib/validation/platform";
import { submitKyc } from "@/server/services/kyc";
import { updateProfile, updateWithdrawalWallet } from "@/server/services/accounts";
import {
  errorState,
  isFrameworkError,
  parseForm,
  successState,
  toErrorState,
  type ActionState,
} from "@/server/actions/types";

// ---------------------------------------------------------------------------
// Identity verification
// ---------------------------------------------------------------------------

export async function submitKycAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(kycSubmissionSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const user = await assertVerifiedEmail();

    const document = formData.get("document");
    if (!(document instanceof File) || document.size === 0) {
      return errorState("Attach your identity document to continue.", {
        document: "A document is required",
      });
    }

    await submitKyc({
      userId: user.id,
      nin: parsed.data.nin,
      idType: parsed.data.idType,
      idNumber: parsed.data.idNumber,
      document,
    });
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }

  revalidatePath("/dashboard/verification");
  revalidatePath("/dashboard");
  return successState(
    "Your documents have been submitted. Compliance will review them and notify you.",
  );
}

// ---------------------------------------------------------------------------
// Profile and withdrawal wallet
// ---------------------------------------------------------------------------

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(profileUpdateSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const user = await assertUser();
    await updateProfile(user.id, parsed.data.phone);
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }

  revalidatePath("/dashboard/profile");
  return successState("Your profile has been updated.");
}

export async function updateWithdrawalWalletAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(withdrawalWalletSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const user = await assertUser();
    await updateWithdrawalWallet(
      user.id,
      parsed.data.walletAddress,
      parsed.data.walletNetwork,
      parsed.data.password,
    );
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }

  revalidatePath("/dashboard/security");
  return successState(
    "Your withdrawal wallet has been updated. A confirmation email has been sent.",
  );
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const id = String(formData.get("notificationId") ?? "");
  const user = await assertUser();

  if (id) {
    await prisma.notification.updateMany({
      where: { id, userId: user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
}

export async function markAllNotificationsReadAction(): Promise<ActionState> {
  try {
    const user = await assertUser();
    const result = await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    revalidatePath("/dashboard/notifications");
    revalidatePath("/dashboard");

    return successState(
      result.count === 0 ? "You have no unread notifications." : "All notifications marked as read.",
    );
  } catch (error) {
    return toErrorState(error);
  }
}
