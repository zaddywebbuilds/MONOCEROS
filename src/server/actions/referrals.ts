"use server";

import { revalidatePath } from "next/cache";

import { assertAdmin, assertUser } from "@/lib/auth/rbac";
import { enforceRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import {
  manualReferralBonusSchema,
  referralCodeSchema,
  referralPayoutDecisionSchema,
  referralPayoutRequestSchema,
  setReferrerSchema,
} from "@/lib/validation/platform";
import {
  creditManualReferralBonus,
  decideReferralPayout,
  issueReferralCode,
  requestReferralPayout,
  revokeReferralCode,
  setReferrer,
} from "@/server/services/referrals";
import {
  errorState,
  isFrameworkError,
  parseForm,
  successState,
  toErrorState,
  type ActionState,
} from "@/server/actions/types";

/** An affiliate asking to be paid what they have earned. */
export async function requestReferralPayoutAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(referralPayoutRequestSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const user = await assertUser();
    enforceRateLimit("withdrawalRequest", user.id);

    const result = await requestReferralPayout({
      userId: user.id,
      walletAddress: parsed.data.walletAddress,
      walletNetwork: parsed.data.walletNetwork,
    });

    revalidatePath("/dashboard/referrals");
    return successState(`Payout ${result.reference} requested.`);
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}

export async function decideReferralPayoutAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(referralPayoutDecisionSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const admin = await assertAdmin();

    if (parsed.data.decision === "REJECTED" && !parsed.data.reason) {
      return errorState("Give a reason when declining a payout.", {
        reason: "A reason is required",
      });
    }

    const result = await decideReferralPayout({
      payoutId: parsed.data.payoutId,
      decision: parsed.data.decision,
      admin,
      reason: parsed.data.reason,
      paymentTxid: parsed.data.paymentTxid,
    });

    revalidatePath("/admin/referrals");
    return successState(`${result.reference} updated.`);
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}

/** Admits an account to the programme, or withdraws it. */
export async function setReferralCodeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(referralCodeSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const admin = await assertAdmin();

    if (parsed.data.action === "ISSUE") {
      const code = await issueReferralCode({
        userId: parsed.data.userId,
        admin,
        reason: parsed.data.reason,
      });
      revalidatePath(`/admin/users/${parsed.data.userId}`);
      return successState(`Referral link issued: ${code}`);
    }

    if (!parsed.data.reason) {
      return errorState("Give a reason when withdrawing a referral link.", {
        reason: "A reason is required",
      });
    }

    await revokeReferralCode({
      userId: parsed.data.userId,
      admin,
      reason: parsed.data.reason,
    });

    revalidatePath(`/admin/users/${parsed.data.userId}`);
    return successState("Referral link withdrawn. Commission already earned is unaffected.");
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}

/**
 * Attributes an account to a referrer after the fact, for introductions made
 * before the programme existed.
 */
export async function setReferrerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(setReferrerSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const admin = await assertAdmin();

    let referrerId: string | null = null;
    if (parsed.data.referrerCode) {
      const referrer = await prisma.user.findFirst({
        where: { referralCode: { equals: parsed.data.referrerCode, mode: "insensitive" } },
        select: { id: true },
      });
      if (!referrer) {
        return errorState("No account holds that referral link.", {
          referrerCode: "Unknown referral link",
        });
      }
      referrerId = referrer.id;
    }

    await setReferrer({
      userId: parsed.data.userId,
      referrerId,
      admin,
      reason: parsed.data.reason,
    });

    revalidatePath(`/admin/users/${parsed.data.userId}`);
    return successState(referrerId ? "Referrer recorded." : "Referrer cleared.");
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}

export async function creditManualReferralBonusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(manualReferralBonusSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const admin = await assertAdmin();

    const result = await creditManualReferralBonus({
      referrerId: parsed.data.referrerId,
      investorId: parsed.data.investorId,
      amount: parsed.data.amount,
      note: parsed.data.note,
      admin,
    });

    revalidatePath("/admin/referrals");
    return successState(`Commission ${result.reference} awarded.`);
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}
