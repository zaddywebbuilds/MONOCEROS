"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assertApprovedKyc, assertUser } from "@/lib/auth/rbac";
import { enforceRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { getSettings, walletFor } from "@/lib/settings";
import {
  paymentSubmissionSchema,
  rolloverRequestSchema,
  subscribeSchema,
  withdrawalRequestSchema,
} from "@/lib/validation/platform";
import { createSubscription } from "@/server/services/investments";
import { submitPayment } from "@/server/services/payments";
import { requestWithdrawal } from "@/server/services/withdrawals";
import { createRollover } from "@/server/services/rollovers";
import {
  errorState,
  isFrameworkError,
  parseForm,
  successState,
  toErrorState,
  type ActionState,
} from "@/server/actions/types";

/**
 * Investor-facing actions.
 *
 * Every one re-establishes the caller's identity and eligibility on the
 * server. Nothing here trusts a hidden field, a client-side check, or the
 * absence of a disabled button.
 */

export async function subscribeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(subscribeSchema, formData);
  if (!parsed.ok) return parsed.state;

  let investmentId: string;

  try {
    const user = await assertApprovedKyc();
    const result = await createSubscription(user.id, parsed.data.packageSlug);
    investmentId = result.investment.id;
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }

  revalidatePath("/dashboard/investments");
  redirect(`/dashboard/payments/${investmentId}`);
}

/**
 * Switches which network an unpaid subscription is to be paid on.
 *
 * The address is resolved from settings on the server — the client sends only
 * a network code, never an address, so a tampered form cannot redirect funds.
 */
export async function choosePaymentNetworkAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const investmentId = String(formData.get("investmentId") ?? "");
  const network = String(formData.get("network") ?? "");
  if (!investmentId || !network) return errorState("Missing payment or network reference.");

  try {
    const user = await assertApprovedKyc();

    const settings = await getSettings();
    const wallet = walletFor(settings, network);
    if (!wallet) return errorState("That network is not available for deposits.");

    const payment = await prisma.payment.findFirst({
      where: { investmentId, userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    if (!payment) return errorState("Payment not found.");
    if (payment.status !== "PENDING") {
      return errorState("This payment has already been submitted, so its network cannot change.");
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { network: wallet.network, walletAddress: wallet.address },
    });
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }

  revalidatePath(`/dashboard/payments/${investmentId}`);
  return successState(`Showing the ${network} deposit address.`);
}

export async function submitPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(paymentSubmissionSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const user = await assertApprovedKyc();
    enforceRateLimit("paymentSubmission", user.id);

    const proof = formData.get("proof");

    await submitPayment({
      userId: user.id,
      investmentId: parsed.data.investmentId,
      transactionHash: parsed.data.transactionHash,
      submittedAmount: parsed.data.submittedAmount,
      proof: proof instanceof File ? proof : null,
    });
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }

  revalidatePath("/dashboard/investments");
  revalidatePath("/dashboard/payments");
  return successState(
    "Payment submitted. The finance team will verify your transfer and notify you.",
  );
}

export async function requestWithdrawalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(withdrawalRequestSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const user = await assertApprovedKyc();
    enforceRateLimit("withdrawalRequest", user.id);

    await requestWithdrawal({
      userId: user.id,
      investmentId: parsed.data.investmentId,
      method: parsed.data.method,
      walletAddress: parsed.data.walletAddress,
      walletNetwork: parsed.data.walletNetwork,
      saveWallet: Boolean(parsed.data.saveWallet),
      password: parsed.data.password,
    });
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }

  revalidatePath("/dashboard/withdrawals");
  revalidatePath("/dashboard/investments");
  return successState("Withdrawal requested. You will be notified when it has been processed.");
}

export async function createRolloverAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(rolloverRequestSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const user = await assertApprovedKyc();

    await createRollover({
      userId: user.id,
      investmentId: parsed.data.investmentId,
      packageSlug: parsed.data.packageSlug,
    });
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }

  revalidatePath("/dashboard/investments");
  revalidatePath("/dashboard/rollovers");
  return successState("Rollover created. It is queued for the next investment cycle.");
}

/** Cancels a subscription that has not been paid for yet. */
export async function cancelDraftInvestmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const investmentId = String(formData.get("investmentId") ?? "");
  if (!investmentId) return errorState("Missing investment reference.");

  try {
    const user = await assertUser();

    const investment = await prisma.investment.findFirst({
      where: { id: investmentId, userId: user.id },
    });
    if (!investment) return errorState("Investment not found.");
    if (!["DRAFT", "PAYMENT_PENDING"].includes(investment.status)) {
      return errorState("This subscription can no longer be cancelled from your dashboard.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.investment.update({
        where: { id: investment.id },
        data: { status: "CANCELLED", closedAt: new Date() },
      });
      await tx.investmentStatusEvent.create({
        data: {
          investmentId: investment.id,
          fromStatus: investment.status,
          toStatus: "CANCELLED",
          reason: "Cancelled by the investor before payment",
          actorId: user.id,
        },
      });
      await tx.payment.updateMany({
        where: { investmentId: investment.id, status: "PENDING" },
        data: { status: "REJECTED", rejectionReason: "Subscription cancelled before payment" },
      });
    });
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }

  revalidatePath("/dashboard/investments");
  return successState("Subscription cancelled.");
}
