import "server-only";

import type { WithdrawalMethod, WithdrawalStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { nextReference } from "@/lib/references";
import { formatUSD } from "@/lib/money";
import { formatBusinessDateTime } from "@/lib/time";
import { getSettings } from "@/lib/settings";
import { verifyPassword } from "@/lib/auth/password";
import { requestContext } from "@/lib/request";
import { truncateMiddle } from "@/lib/utils";
import { notify, notifications, notifyStaff } from "@/lib/notifications";
import { writeAudit, AUDIT_ACTION } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth/session";
import {
  sendWalletChangedEmail,
  sendWithdrawalApprovedEmail,
  sendWithdrawalPaidEmail,
  sendWithdrawalRejectedEmail,
  sendWithdrawalRequestedEmail,
} from "@/lib/email";
import { recordTransaction } from "@/server/services/ledger";
import { transition } from "@/server/services/investments";
import { BusinessRuleError } from "@/lib/errors";

/**
 * Withdrawals.
 *
 * Requests are only possible against a MATURED investment, are authorised with
 * the account password, and are settled manually by an administrator. The
 * platform stores a destination address; it never stores keys or seed phrases
 * and never moves funds itself.
 */

export interface WithdrawalRequestInput {
  userId: string;
  investmentId: string;
  method: WithdrawalMethod;
  walletAddress: string;
  walletNetwork: string;
  saveWallet: boolean;
  password: string;
}

export async function requestWithdrawal(
  input: WithdrawalRequestInput,
): Promise<{ reference: string }> {
  const settings = await getSettings();

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    include: { profile: true },
  });
  if (!user) throw new BusinessRuleError("Account not found.");

  if (settings["withdrawal.requirePasswordConfirmation"]) {
    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) throw new BusinessRuleError("That password is not correct.");
  }

  if (!settings["withdrawal.methods"].includes(input.method)) {
    throw new BusinessRuleError("That withdrawal method is not currently available.");
  }

  const investment = await prisma.investment.findFirst({
    where: { id: input.investmentId, userId: input.userId },
  });
  if (!investment) throw new BusinessRuleError("Investment not found.");

  if (investment.status !== "MATURED") {
    throw new BusinessRuleError(
      "A withdrawal can only be requested once the investment has reached maturity.",
    );
  }

  const amount = investment.maturityAmount;
  const minimum = settings["withdrawal.minAmount"];
  if (minimum > 0 && amount.lessThan(minimum)) {
    throw new BusinessRuleError(`The minimum withdrawal amount is ${formatUSD(minimum)}.`);
  }

  const walletChanged =
    user.profile?.withdrawalWalletAddress &&
    user.profile.withdrawalWalletAddress !== input.walletAddress;

  const reference = await prisma.$transaction(async (tx) => {
    const ref = await nextReference("withdrawal", tx);

    await tx.withdrawal.create({
      data: {
        reference: ref,
        userId: input.userId,
        investmentId: investment.id,
        amount,
        method: input.method,
        walletAddress: input.walletAddress,
        walletNetwork: input.walletNetwork,
        status: "PENDING",
      },
    });

    await transition(investment, "WITHDRAWAL_REQUESTED", tx, {
      reason: `Withdrawal ${ref} requested`,
      actorId: input.userId,
    });

    if (input.saveWallet && user.profile) {
      await tx.userProfile.update({
        where: { userId: input.userId },
        data: {
          withdrawalWalletAddress: input.walletAddress,
          withdrawalWalletNetwork: input.walletNetwork,
        },
      });

      const { ipAddress, userAgent } = await requestContext();
      await tx.walletChangeLog.create({
        data: {
          userId: input.userId,
          oldAddress: user.profile.withdrawalWalletAddress,
          oldNetwork: user.profile.withdrawalWalletNetwork,
          newAddress: input.walletAddress,
          newNetwork: input.walletNetwork,
          ipAddress,
          userAgent,
        },
      });
    }

    await recordTransaction(
      {
        userId: input.userId,
        investmentId: investment.id,
        type: "WITHDRAWAL_REQUESTED",
        status: "PENDING",
        amount,
        description: `Withdrawal ${ref} requested for ${investment.reference}`,
        metadata: { network: input.walletNetwork },
      },
      tx,
    );

    await notify(notifications.withdrawalRequested(input.userId, ref), tx);
    await notifyStaff(
      {
        title: "Withdrawal awaiting review",
        message: `${ref} for ${formatUSD(amount)} needs a decision.`,
        type: "WARNING",
        link: "/admin/withdrawals",
      },
      tx,
    );

    return ref;
  });

  await sendWithdrawalRequestedEmail(user.email, {
    reference,
    amount: formatUSD(amount),
    destination: `${input.walletNetwork} · ${truncateMiddle(input.walletAddress)}`,
  });

  if (walletChanged && input.saveWallet) {
    await sendWalletChangedEmail(user.email, {
      newAddress: input.walletAddress,
      network: input.walletNetwork,
      when: formatBusinessDateTime(new Date()),
    });
  }

  return { reference };
}

// ---------------------------------------------------------------------------
// Administrative processing
// ---------------------------------------------------------------------------

export type WithdrawalDecision = "APPROVE" | "REJECT" | "PROCESSING" | "PAID";

const DECISION_TO_STATUS: Record<WithdrawalDecision, WithdrawalStatus> = {
  APPROVE: "APPROVED",
  REJECT: "REJECTED",
  PROCESSING: "PROCESSING",
  PAID: "PAID",
};

/** Which current statuses each decision may be applied to. */
const DECISION_ALLOWED_FROM: Record<WithdrawalDecision, WithdrawalStatus[]> = {
  APPROVE: ["PENDING", "UNDER_REVIEW"],
  REJECT: ["PENDING", "UNDER_REVIEW", "APPROVED", "PROCESSING"],
  PROCESSING: ["APPROVED"],
  PAID: ["APPROVED", "PROCESSING"],
};

const DECISION_TO_AUDIT: Record<WithdrawalDecision, string> = {
  APPROVE: AUDIT_ACTION.WITHDRAWAL_APPROVED,
  REJECT: AUDIT_ACTION.WITHDRAWAL_REJECTED,
  PROCESSING: AUDIT_ACTION.WITHDRAWAL_PROCESSING,
  PAID: AUDIT_ACTION.WITHDRAWAL_PAID,
};

export interface WithdrawalDecisionInput {
  withdrawalId: string;
  decision: WithdrawalDecision;
  reason?: string;
  paymentTxid?: string;
  notes?: string;
}

export async function decideWithdrawal(
  input: WithdrawalDecisionInput,
  admin: SessionUser,
): Promise<{ reference: string }> {
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: input.withdrawalId },
    include: { investment: true, user: true },
  });

  if (!withdrawal) throw new BusinessRuleError("Withdrawal not found.");

  if (!DECISION_ALLOWED_FROM[input.decision].includes(withdrawal.status)) {
    throw new BusinessRuleError(
      `A withdrawal that is ${withdrawal.status} cannot be moved to ${DECISION_TO_STATUS[input.decision]}.`,
    );
  }

  if (input.decision === "REJECT" && !input.reason) {
    throw new BusinessRuleError("A reason is required when rejecting a withdrawal.");
  }

  const status = DECISION_TO_STATUS[input.decision];
  const now = new Date();
  const previousStatus = withdrawal.status;

  await prisma.$transaction(async (tx) => {
    await tx.withdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status,
        processedById: admin.id,
        processedAt: now,
        rejectionReason: input.decision === "REJECT" ? (input.reason ?? null) : null,
        paymentTxid: input.paymentTxid ?? withdrawal.paymentTxid,
        notes: input.notes ?? withdrawal.notes,
      },
    });

    if (input.decision === "PAID") {
      await transition(withdrawal.investment, "COMPLETED", tx, {
        reason: `Withdrawal ${withdrawal.reference} settled`,
        actorId: admin.id,
        data: { closedAt: now },
      });

      await recordTransaction(
        {
          userId: withdrawal.userId,
          investmentId: withdrawal.investmentId,
          type: "WITHDRAWAL_PAID",
          amount: withdrawal.amount,
          description: `Withdrawal ${withdrawal.reference} paid`,
          metadata: { txid: input.paymentTxid ?? null, processedBy: admin.email },
        },
        tx,
      );

      await notify(notifications.withdrawalPaid(withdrawal.userId, withdrawal.reference), tx);
    }

    if (input.decision === "REJECT") {
      // The investment returns to MATURED so the investor can decide again.
      await transition(withdrawal.investment, "MATURED", tx, {
        reason: input.reason,
        actorId: admin.id,
      });

      await recordTransaction(
        {
          userId: withdrawal.userId,
          investmentId: withdrawal.investmentId,
          type: "WITHDRAWAL_REJECTED",
          status: "CANCELLED",
          amount: withdrawal.amount,
          description: `Withdrawal ${withdrawal.reference} declined`,
          metadata: { reason: input.reason ?? null },
        },
        tx,
      );

      await notify(
        notifications.withdrawalRejected(
          withdrawal.userId,
          withdrawal.reference,
          input.reason ?? "Declined",
        ),
        tx,
      );
    }

    if (input.decision === "APPROVE") {
      await recordTransaction(
        {
          userId: withdrawal.userId,
          investmentId: withdrawal.investmentId,
          type: "WITHDRAWAL_APPROVED",
          status: "PENDING",
          amount: withdrawal.amount,
          description: `Withdrawal ${withdrawal.reference} approved for settlement`,
        },
        tx,
      );

      await notify(
        notifications.withdrawalApproved(withdrawal.userId, withdrawal.reference),
        tx,
      );
    }

    await writeAudit(
      {
        actor: admin,
        action: DECISION_TO_AUDIT[input.decision],
        entityType: "Withdrawal",
        entityId: withdrawal.id,
        oldValue: { status: previousStatus },
        newValue: { status, paymentTxid: input.paymentTxid ?? null },
        reason: input.reason ?? null,
      },
      tx,
    );
  });

  const amount = formatUSD(withdrawal.amount);

  if (input.decision === "APPROVE") {
    await sendWithdrawalApprovedEmail(withdrawal.user.email, {
      reference: withdrawal.reference,
      amount,
    });
  } else if (input.decision === "PAID") {
    await sendWithdrawalPaidEmail(withdrawal.user.email, {
      reference: withdrawal.reference,
      amount,
      txid: input.paymentTxid ?? null,
    });
  } else if (input.decision === "REJECT") {
    await sendWithdrawalRejectedEmail(withdrawal.user.email, {
      reference: withdrawal.reference,
      reason: input.reason ?? "Declined",
    });
  }

  return { reference: withdrawal.reference };
}

export async function getPendingWithdrawalCount(): Promise<number> {
  return prisma.withdrawal.count({
    where: { status: { in: ["PENDING", "UNDER_REVIEW", "APPROVED", "PROCESSING"] } },
  });
}
