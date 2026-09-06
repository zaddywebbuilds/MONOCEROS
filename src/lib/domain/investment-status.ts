import type { InvestmentStatus, PaymentStatus, WithdrawalStatus, KycStatus } from "@prisma/client";
import { InvalidTransitionError } from "@/lib/errors";

/**
 * Investment state machine.
 *
 * Transitions are enforced in the service layer against this table, so an
 * investment can never jump from, say, QUEUED straight to COMPLETED because of
 * a bug in a route handler or a crafted form post.
 */
export const INVESTMENT_TRANSITIONS: Record<InvestmentStatus, InvestmentStatus[]> = {
  DRAFT: ["PAYMENT_PENDING", "CANCELLED"],
  PAYMENT_PENDING: ["PAYMENT_SUBMITTED", "CANCELLED"],
  PAYMENT_SUBMITTED: ["PAYMENT_UNDER_REVIEW", "QUEUED", "PAYMENT_REJECTED", "CANCELLED"],
  PAYMENT_UNDER_REVIEW: ["QUEUED", "PAYMENT_REJECTED", "CANCELLED"],
  PAYMENT_REJECTED: ["PAYMENT_SUBMITTED", "CANCELLED"],
  QUEUED: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["MATURED"],
  MATURED: ["WITHDRAWAL_REQUESTED", "ROLLED_OVER"],
  WITHDRAWAL_REQUESTED: ["COMPLETED", "MATURED"],
  ROLLED_OVER: [],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: InvestmentStatus, to: InvestmentStatus): boolean {
  return INVESTMENT_TRANSITIONS[from].includes(to);
}

/** Statuses that count as "the user's money is committed". */
export const OPEN_INVESTMENT_STATUSES: InvestmentStatus[] = [
  "PAYMENT_PENDING",
  "PAYMENT_SUBMITTED",
  "PAYMENT_UNDER_REVIEW",
  "QUEUED",
  "ACTIVE",
  "MATURED",
  "WITHDRAWAL_REQUESTED",
];

export const CLOSED_INVESTMENT_STATUSES: InvestmentStatus[] = [
  "ROLLED_OVER",
  "COMPLETED",
  "CANCELLED",
  "PAYMENT_REJECTED",
];

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

export type StatusTone = "pending" | "active" | "matured" | "rejected" | "neutral";

export const INVESTMENT_STATUS_LABEL: Record<InvestmentStatus, string> = {
  DRAFT: "Draft",
  PAYMENT_PENDING: "Awaiting payment",
  PAYMENT_SUBMITTED: "Payment submitted",
  PAYMENT_UNDER_REVIEW: "Payment under review",
  PAYMENT_REJECTED: "Payment rejected",
  QUEUED: "Queued for next cycle",
  ACTIVE: "Active",
  MATURED: "Matured",
  ROLLED_OVER: "Rolled over",
  WITHDRAWAL_REQUESTED: "Withdrawal requested",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const INVESTMENT_STATUS_TONE: Record<InvestmentStatus, StatusTone> = {
  DRAFT: "neutral",
  PAYMENT_PENDING: "pending",
  PAYMENT_SUBMITTED: "pending",
  PAYMENT_UNDER_REVIEW: "pending",
  PAYMENT_REJECTED: "rejected",
  QUEUED: "pending",
  ACTIVE: "active",
  MATURED: "matured",
  ROLLED_OVER: "neutral",
  WITHDRAWAL_REQUESTED: "pending",
  COMPLETED: "neutral",
  CANCELLED: "neutral",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Awaiting submission",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, StatusTone> = {
  PENDING: "pending",
  SUBMITTED: "pending",
  UNDER_REVIEW: "pending",
  APPROVED: "active",
  REJECTED: "rejected",
};

export const WITHDRAWAL_STATUS_LABEL: Record<WithdrawalStatus, string> = {
  PENDING: "Pending",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  PROCESSING: "Processing",
  PAID: "Paid",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const WITHDRAWAL_STATUS_TONE: Record<WithdrawalStatus, StatusTone> = {
  PENDING: "pending",
  UNDER_REVIEW: "pending",
  APPROVED: "matured",
  PROCESSING: "pending",
  PAID: "active",
  REJECTED: "rejected",
  CANCELLED: "neutral",
};

export const KYC_STATUS_LABEL: Record<KycStatus, string> = {
  NOT_SUBMITTED: "Not submitted",
  PENDING: "Under review",
  APPROVED: "Verified",
  REJECTED: "Declined",
  RESUBMIT_REQUESTED: "Resubmission required",
};

export const KYC_STATUS_TONE: Record<KycStatus, StatusTone> = {
  NOT_SUBMITTED: "neutral",
  PENDING: "pending",
  APPROVED: "active",
  REJECTED: "rejected",
  RESUBMIT_REQUESTED: "pending",
};

/**
 * The single next action a user should take, given an investment's state.
 * Drives the "Next action" column and the dashboard timeline.
 */
export function nextActionFor(status: InvestmentStatus): string {
  switch (status) {
    case "DRAFT":
    case "PAYMENT_PENDING":
      return "Send your payment and submit the transaction hash";
    case "PAYMENT_SUBMITTED":
    case "PAYMENT_UNDER_REVIEW":
      return "Nothing to do — the finance team is verifying your payment";
    case "PAYMENT_REJECTED":
      return "Correct and resubmit your payment details";
    case "QUEUED":
      return "Nothing to do — activation happens when the cycle opens";
    case "ACTIVE":
      return "Nothing to do — your term is running";
    case "MATURED":
      return "Choose to withdraw or roll over";
    case "WITHDRAWAL_REQUESTED":
      return "Nothing to do — your withdrawal is being processed";
    case "ROLLED_OVER":
      return "Continued in a new investment";
    case "COMPLETED":
      return "This investment is closed";
    case "CANCELLED":
      return "This investment was cancelled";
    default:
      return "—";
  }
}

/** Ordered timeline steps shown on the investment detail page. */
export const TIMELINE_STEPS = [
  "Payment submitted",
  "Payment verified",
  "Queued for cycle",
  "Investment started",
  "Matured",
  "Withdrawn or rolled over",
] as const;

export function timelineIndexFor(status: InvestmentStatus): number {
  switch (status) {
    case "DRAFT":
    case "PAYMENT_PENDING":
      return -1;
    case "PAYMENT_SUBMITTED":
    case "PAYMENT_UNDER_REVIEW":
    case "PAYMENT_REJECTED":
      return 0;
    case "QUEUED":
      return 2;
    case "ACTIVE":
      return 3;
    case "MATURED":
      return 4;
    case "WITHDRAWAL_REQUESTED":
      return 4;
    case "ROLLED_OVER":
    case "COMPLETED":
      return 5;
    case "CANCELLED":
      return -1;
    default:
      return -1;
  }
}

export { InvalidTransitionError };
