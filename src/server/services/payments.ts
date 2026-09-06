import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { formatUSD, money } from "@/lib/money";
import { formatCycleLabel } from "@/lib/time";
import { notify, notifications } from "@/lib/notifications";
import { writeAudit, AUDIT_ACTION } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth/session";
import {
  sendPaymentApprovedEmail,
  sendPaymentRejectedEmail,
  sendPaymentSubmittedEmail,
} from "@/lib/email";
import { recordTransaction } from "@/server/services/ledger";
import { eligibleCycleFor } from "@/server/services/cycles";
import { alertStaffOfPayment, transition } from "@/server/services/investments";
import { BusinessRuleError } from "@/lib/errors";
import { buildDocumentKey, sniffMime, storage } from "@/lib/storage";
import { getSettings } from "@/lib/settings";

/**
 * USDT payment submission and manual verification.
 *
 * The platform never takes custody of funds and never claims to observe a
 * blockchain. A payment becomes APPROVED only when a human administrator says
 * so, and that decision is audited.
 */

export interface SubmitPaymentInput {
  userId: string;
  investmentId: string;
  transactionHash: string;
  submittedAmount: string;
  proof?: File | null;
}

export async function submitPayment(input: SubmitPaymentInput): Promise<{ reference: string }> {
  const settings = await getSettings();

  const investment = await prisma.investment.findFirst({
    where: { id: input.investmentId, userId: input.userId },
    include: {
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      user: true,
    },
  });

  if (!investment) throw new BusinessRuleError("Investment not found.");

  if (!["PAYMENT_PENDING", "PAYMENT_REJECTED"].includes(investment.status)) {
    throw new BusinessRuleError(
      "Payment details cannot be submitted for this investment at its current stage.",
    );
  }

  const payment = investment.payments[0];
  if (!payment) throw new BusinessRuleError("No payment record exists for this investment.");

  // A transaction hash can only ever be claimed once, platform-wide.
  const duplicate = await prisma.payment.findFirst({
    where: { transactionHash: input.transactionHash, NOT: { id: payment.id } },
    select: { id: true },
  });
  if (duplicate) {
    throw new BusinessRuleError(
      "That transaction hash has already been submitted. Check the hash and try again.",
    );
  }

  let proofKey: string | null = null;
  let proofMime: string | null = null;

  if (input.proof && input.proof.size > 0) {
    const maxBytes = settings["kyc.maxUploadMb"] * 1024 * 1024;
    if (input.proof.size > maxBytes) {
      throw new BusinessRuleError(
        `Proof of payment must be ${settings["kyc.maxUploadMb"]}MB or smaller.`,
      );
    }
    const buffer = Buffer.from(await input.proof.arrayBuffer());
    const sniffed = sniffMime(buffer);
    if (!sniffed) {
      throw new BusinessRuleError("Proof of payment must be a JPG, PNG or PDF file.");
    }
    proofKey = buildDocumentKey("payment-proof", input.userId, sniffed);
    proofMime = sniffed;
    await storage().put(proofKey, buffer, sniffed);
  }

  const submittedAmount = money(input.submittedAmount);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          transactionHash: input.transactionHash,
          submittedAmount,
          proofKey,
          proofMime,
          status: "SUBMITTED",
          submittedAt: new Date(),
          rejectionReason: null,
          network: settings["payment.network"] || payment.network,
          walletAddress: settings["payment.walletAddress"] || payment.walletAddress,
        },
      });

      await transition(investment, "PAYMENT_SUBMITTED", tx, {
        reason: "Payment details submitted by the investor",
        actorId: input.userId,
      });

      await recordTransaction(
        {
          userId: input.userId,
          investmentId: investment.id,
          type: "DEPOSIT_SUBMITTED",
          status: "PENDING",
          amount: submittedAmount,
          description: `Payment ${payment.reference} submitted for ${investment.reference}`,
          metadata: { transactionHash: input.transactionHash },
        },
        tx,
      );

      await notify(notifications.paymentSubmitted(input.userId, payment.reference), tx);
      await alertStaffOfPayment(payment.reference, tx);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new BusinessRuleError("That transaction hash has already been submitted.");
    }
    throw error;
  }

  await sendPaymentSubmittedEmail(investment.user.email, {
    reference: payment.reference,
    amount: formatUSD(submittedAmount),
    packageName: investment.packageNameSnapshot,
  });

  return { reference: payment.reference };
}

// ---------------------------------------------------------------------------
// Administrative review
// ---------------------------------------------------------------------------

export async function markPaymentUnderReview(paymentId: string, admin: SessionUser): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { investment: true },
  });
  if (!payment) throw new BusinessRuleError("Payment not found.");
  if (payment.status !== "SUBMITTED") return;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "UNDER_REVIEW", reviewedById: admin.id, reviewedAt: new Date() },
    });
    await transition(payment.investment, "PAYMENT_UNDER_REVIEW", tx, {
      reason: "Opened for verification",
      actorId: admin.id,
    });
  });

  await writeAudit({
    actor: admin,
    action: AUDIT_ACTION.PAYMENT_REVIEW_STARTED,
    entityType: "Payment",
    entityId: payment.id,
    newValue: { status: "UNDER_REVIEW" },
  });
}

export async function approvePayment(
  paymentId: string,
  admin: SessionUser,
): Promise<{ reference: string; cycleLabel: string }> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { investment: true, user: true },
  });

  if (!payment) throw new BusinessRuleError("Payment not found.");
  if (!["SUBMITTED", "UNDER_REVIEW"].includes(payment.status)) {
    throw new BusinessRuleError("Only a submitted payment can be approved.");
  }

  const approvedAt = new Date();

  // The cycle is derived from the APPROVAL instant, not the submission time.
  const cycle = await eligibleCycleFor(approvedAt);
  const cycleLabel = formatCycleLabel(cycle.cycleStart);

  const previousStatus = payment.status;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "APPROVED",
        approvedById: admin.id,
        approvedAt,
        rejectionReason: null,
      },
    });

    await transition(payment.investment, "QUEUED", tx, {
      reason: `Payment approved; queued for cycle ${cycle.reference}`,
      actorId: admin.id,
      data: { cycle: { connect: { id: cycle.id } }, queuedAt: approvedAt },
    });

    await recordTransaction(
      {
        userId: payment.userId,
        investmentId: payment.investmentId,
        type: "DEPOSIT_APPROVED",
        amount: payment.submittedAmount ?? payment.expectedAmount,
        description: `Payment ${payment.reference} verified`,
        metadata: { cycle: cycle.reference, approvedBy: admin.email },
      },
      tx,
    );

    await notify(
      notifications.paymentApproved(payment.userId, payment.reference, cycleLabel),
      tx,
    );
    await notify(
      notifications.investmentQueued(payment.userId, payment.investment.reference, cycleLabel),
      tx,
    );

    await writeAudit(
      {
        actor: admin,
        action: AUDIT_ACTION.PAYMENT_APPROVED,
        entityType: "Payment",
        entityId: payment.id,
        oldValue: { status: previousStatus },
        newValue: {
          status: "APPROVED",
          investmentStatus: "QUEUED",
          cycle: cycle.reference,
          cycleStart: cycle.cycleStart.toISOString(),
        },
      },
      tx,
    );
  });

  await sendPaymentApprovedEmail(payment.user.email, {
    reference: payment.reference,
    amount: formatUSD(payment.submittedAmount ?? payment.expectedAmount),
    packageName: payment.investment.packageNameSnapshot,
    cycleDate: cycleLabel,
  });

  return { reference: payment.reference, cycleLabel };
}

export async function rejectPayment(
  paymentId: string,
  reason: string,
  admin: SessionUser,
): Promise<{ reference: string }> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { investment: true, user: true },
  });

  if (!payment) throw new BusinessRuleError("Payment not found.");
  if (!["SUBMITTED", "UNDER_REVIEW"].includes(payment.status)) {
    throw new BusinessRuleError("Only a submitted payment can be rejected.");
  }

  const previousStatus = payment.status;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });

    await transition(payment.investment, "PAYMENT_REJECTED", tx, {
      reason,
      actorId: admin.id,
    });

    await recordTransaction(
      {
        userId: payment.userId,
        investmentId: payment.investmentId,
        type: "DEPOSIT_REJECTED",
        status: "CANCELLED",
        amount: payment.submittedAmount ?? payment.expectedAmount,
        description: `Payment ${payment.reference} could not be verified`,
        metadata: { reason },
      },
      tx,
    );

    await notify(
      notifications.paymentRejected(payment.userId, payment.reference, reason),
      tx,
    );

    await writeAudit(
      {
        actor: admin,
        action: AUDIT_ACTION.PAYMENT_REJECTED,
        entityType: "Payment",
        entityId: payment.id,
        oldValue: { status: previousStatus },
        newValue: { status: "REJECTED" },
        reason,
      },
      tx,
    );
  });

  await sendPaymentRejectedEmail(payment.user.email, {
    reference: payment.reference,
    reason,
  });

  return { reference: payment.reference };
}

export async function getPendingPaymentCount(): Promise<number> {
  return prisma.payment.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } });
}
