"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/interactive";
import { Checkbox, Field, FormError, FormSuccess, Input, Select, Textarea } from "@/components/ui/form";
import { InfoNote } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import {
  annotateInvestmentAction,
  broadcastNotificationAction,
  decideWithdrawalAction,
  reviewKycAction,
  reviewPaymentAction,
  runCycleActivationAction,
  setUserStatusAction,
} from "@/server/actions/admin";
import { idleState } from "@/lib/action-state";

/**
 * Administrative decision forms.
 *
 * Approvals and settlements are two-step: the operator states the decision,
 * then confirms it in a dialog. The confirmation is also submitted to the
 * server as `confirmed`, so the server enforces it too.
 */

function ConfirmSubmit({
  label,
  title,
  description,
  tone = "primary",
  children,
}: {
  label: string;
  title: string;
  description: string;
  tone?: "primary" | "danger";
  children?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const { pending } = useFormStatus();

  return (
    <>
      <Button
        type="button"
        variant={tone === "danger" ? "danger" : "primary"}
        size="sm"
        onClick={() => setOpen(true)}
        disabled={pending}
      >
        {label}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        footer={
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton
              size="sm"
              variant={tone === "danger" ? "danger" : "primary"}
              pendingLabel="Working…"
            >
              {label}
            </SubmitButton>
          </>
        }
      >
        <div className="space-y-4">
          {children}
          <Checkbox
            id={`confirmed-${label.replace(/\s/g, "-")}`}
            name="confirmed"
            required
            label="I have verified this decision and understand it is recorded in the audit log."
          />
        </div>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// KYC
// ---------------------------------------------------------------------------

export function KycReviewForm({ submissionId }: { submissionId: string }) {
  const [state, formAction] = useActionState(reviewKycAction, idleState);
  const [decision, setDecision] = React.useState<"APPROVE" | "REJECT" | "REQUEST_RESUBMISSION">(
    "APPROVE",
  );

  if (state.status === "success") {
    return <FormSuccess>{state.message}</FormSuccess>;
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="decision" value={decision} />

      <FormError>{state.status === "error" ? state.message : null}</FormError>

      <div className="grid gap-2 sm:grid-cols-3">
        {(
          [
            { id: "APPROVE", label: "Approve" },
            { id: "REQUEST_RESUBMISSION", label: "Request resubmission" },
            { id: "REJECT", label: "Reject" },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setDecision(option.id)}
            aria-pressed={decision === option.id}
            className={
              decision === option.id
                ? "rounded-lg border border-accent-600 bg-accent-900/30 px-3 py-2.5 text-[12.5px] font-medium text-accent-200"
                : "rounded-lg border border-ink-600 px-3 py-2.5 text-[12.5px] font-medium text-fg-muted transition-colors hover:text-fg"
            }
          >
            {option.label}
          </button>
        ))}
      </div>

      <Field
        label="Reason"
        htmlFor="kyc-reason"
        required={decision !== "APPROVE"}
        hint={
          decision === "APPROVE"
            ? "Optional note for the audit record."
            : "Shown to the investor, so be specific and polite."
        }
        error={state.fieldErrors?.reason}
      >
        <Textarea
          id="kyc-reason"
          name="reason"
          rows={3}
          required={decision !== "APPROVE"}
          placeholder={
            decision === "APPROVE"
              ? "Documents match the account holder."
              : "e.g. The document photo is cut off — please resubmit with all four corners visible."
          }
        />
      </Field>

      <SubmitButton size="sm" pendingLabel="Recording decision…">
        {decision === "APPROVE" ? (
          <>
            <Check /> Approve verification
          </>
        ) : decision === "REJECT" ? (
          <>
            <X /> Reject verification
          </>
        ) : (
          "Request resubmission"
        )}
      </SubmitButton>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export function PaymentReviewForm({
  paymentId,
  expectedAmount,
  submittedAmount,
  cycleLabel,
}: {
  paymentId: string;
  expectedAmount: string;
  submittedAmount: string;
  cycleLabel: string;
}) {
  const [state, formAction] = useActionState(reviewPaymentAction, idleState);
  const [decision, setDecision] = React.useState<"APPROVE" | "REJECT">("APPROVE");

  if (state.status === "success") {
    return <FormSuccess>{state.message}</FormSuccess>;
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="paymentId" value={paymentId} />
      <input type="hidden" name="decision" value={decision} />

      <FormError>{state.status === "error" ? state.message : null}</FormError>

      {expectedAmount !== submittedAmount ? (
        <InfoNote tone="warning">
          The investor reported {submittedAmount} but the subscription expects {expectedAmount}.
          Check the transfer carefully before approving.
        </InfoNote>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        {(
          [
            { id: "APPROVE", label: "Approve payment" },
            { id: "REJECT", label: "Reject payment" },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setDecision(option.id)}
            aria-pressed={decision === option.id}
            className={
              decision === option.id
                ? "rounded-lg border border-accent-600 bg-accent-900/30 px-3 py-2.5 text-[12.5px] font-medium text-accent-200"
                : "rounded-lg border border-ink-600 px-3 py-2.5 text-[12.5px] font-medium text-fg-muted transition-colors hover:text-fg"
            }
          >
            {option.label}
          </button>
        ))}
      </div>

      <Field
        label="Reason"
        htmlFor="payment-reason"
        required={decision === "REJECT"}
        hint={
          decision === "REJECT"
            ? "Shown to the investor so they can correct and resubmit."
            : "Optional note for the audit record."
        }
        error={state.fieldErrors?.reason}
      >
        <Textarea
          id="payment-reason"
          name="reason"
          rows={3}
          required={decision === "REJECT"}
          placeholder={
            decision === "REJECT"
              ? "e.g. No transfer matching this hash was found on the stated network."
              : "Verified against the block explorer."
          }
        />
      </Field>

      <ConfirmSubmit
        label={decision === "APPROVE" ? "Approve payment" : "Reject payment"}
        tone={decision === "APPROVE" ? "primary" : "danger"}
        title={decision === "APPROVE" ? "Approve this payment?" : "Reject this payment?"}
        description={
          decision === "APPROVE"
            ? "Approving queues the subscription for the next investment cycle. This cannot be undone from the interface."
            : "The investor will be notified and can correct and resubmit their payment details."
        }
      >
        {decision === "APPROVE" ? (
          <InfoNote>
            This subscription will be queued for the cycle opening{" "}
            <strong className="font-semibold text-fg">{cycleLabel}</strong>, because the cycle is
            determined by the moment of approval.
          </InfoNote>
        ) : null}
      </ConfirmSubmit>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Withdrawals
// ---------------------------------------------------------------------------

export function WithdrawalDecisionForm({
  withdrawalId,
  amount,
  currentStatus,
}: {
  withdrawalId: string;
  amount: string;
  currentStatus: string;
}) {
  const [state, formAction] = useActionState(decideWithdrawalAction, idleState);
  const [decision, setDecision] = React.useState<"APPROVE" | "PROCESSING" | "PAID" | "REJECT">(
    currentStatus === "PENDING" || currentStatus === "UNDER_REVIEW"
      ? "APPROVE"
      : currentStatus === "APPROVED"
        ? "PROCESSING"
        : "PAID",
  );

  if (state.status === "success") {
    return <FormSuccess>{state.message}</FormSuccess>;
  }

  const options = [
    { id: "APPROVE", label: "Approve", enabled: ["PENDING", "UNDER_REVIEW"].includes(currentStatus) },
    { id: "PROCESSING", label: "Mark processing", enabled: currentStatus === "APPROVED" },
    {
      id: "PAID",
      label: "Mark paid",
      enabled: ["APPROVED", "PROCESSING"].includes(currentStatus),
    },
    {
      id: "REJECT",
      label: "Reject",
      enabled: ["PENDING", "UNDER_REVIEW", "APPROVED", "PROCESSING"].includes(currentStatus),
    },
  ] as const;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="withdrawalId" value={withdrawalId} />
      <input type="hidden" name="decision" value={decision} />

      <FormError>{state.status === "error" ? state.message : null}</FormError>

      <div className="grid gap-2 sm:grid-cols-2">
        {options
          .filter((option) => option.enabled)
          .map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setDecision(option.id)}
              aria-pressed={decision === option.id}
              className={
                decision === option.id
                  ? "rounded-lg border border-accent-600 bg-accent-900/30 px-3 py-2.5 text-[12.5px] font-medium text-accent-200"
                  : "rounded-lg border border-ink-600 px-3 py-2.5 text-[12.5px] font-medium text-fg-muted transition-colors hover:text-fg"
              }
            >
              {option.label}
            </button>
          ))}
      </div>

      {decision === "PAID" ? (
        <Field
          label="Settlement transaction hash"
          htmlFor="paymentTxid"
          hint="Optional but strongly recommended — it becomes the investor's receipt."
          error={state.fieldErrors?.paymentTxid}
        >
          <Input id="paymentTxid" name="paymentTxid" className="font-mono text-[12.5px]" />
        </Field>
      ) : null}

      <Field
        label={decision === "REJECT" ? "Reason (shown to the investor)" : "Internal note"}
        htmlFor="withdrawal-reason"
        required={decision === "REJECT"}
        error={state.fieldErrors?.reason}
      >
        <Textarea
          id="withdrawal-reason"
          name={decision === "REJECT" ? "reason" : "notes"}
          rows={3}
          required={decision === "REJECT"}
        />
      </Field>

      <ConfirmSubmit
        label={options.find((option) => option.id === decision)?.label ?? "Apply"}
        tone={decision === "REJECT" ? "danger" : "primary"}
        title={
          decision === "PAID"
            ? `Confirm ${amount} has been settled?`
            : decision === "REJECT"
              ? "Reject this withdrawal?"
              : "Update this withdrawal?"
        }
        description={
          decision === "PAID"
            ? "Only mark this paid once the transfer has actually left the company wallet. The investment will be closed and the investor notified."
            : decision === "REJECT"
              ? "The investment returns to matured so the investor can request again or roll over."
              : "The investor will be notified of the new status."
        }
      />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Users, investments, cycles, broadcast
// ---------------------------------------------------------------------------

export function UserStatusForm({
  userId,
  suspended,
}: {
  userId: string;
  suspended: boolean;
}) {
  const [state, formAction] = useActionState(setUserStatusAction, idleState);

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="action" value={suspended ? "UNSUSPEND" : "SUSPEND"} />

      <FormError>{state.status === "error" ? state.message : null}</FormError>
      <FormSuccess>{state.status === "success" ? state.message : null}</FormSuccess>

      <Field label="Reason" htmlFor="status-reason" required error={state.fieldErrors?.reason}>
        <Textarea id="status-reason" name="reason" rows={2} required />
      </Field>

      <SubmitButton size="sm" variant={suspended ? "primary" : "danger"} pendingLabel="Applying…">
        {suspended ? "Reinstate account" : "Suspend account"}
      </SubmitButton>
      <p className="text-[11.5px] leading-relaxed text-fg-subtle">
        Suspending signs the account out everywhere and blocks sign-in. Investment records are not
        altered.
      </p>
    </form>
  );
}

export function InvestmentNoteForm({
  investmentId,
  currentNote,
}: {
  investmentId: string;
  currentNote: string | null;
}) {
  const [state, formAction] = useActionState(annotateInvestmentAction, idleState);

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="investmentId" value={investmentId} />

      <FormError>{state.status === "error" ? state.message : null}</FormError>
      <FormSuccess>{state.status === "success" ? state.message : null}</FormSuccess>

      <Field
        label="Administrative note"
        htmlFor="note"
        required
        hint="Recorded against the investment and written to the audit log. Monetary values are never edited here."
        error={state.fieldErrors?.note}
      >
        <Textarea id="note" name="note" rows={3} defaultValue={currentNote ?? ""} required />
      </Field>

      <Field label="Reason" htmlFor="note-reason" required error={state.fieldErrors?.reason}>
        <Input id="note-reason" name="reason" required />
      </Field>

      <SubmitButton size="sm" pendingLabel="Saving…">
        Record note
      </SubmitButton>
    </form>
  );
}

export function ManualCycleForm({ cycleId }: { cycleId: string }) {
  const [state, formAction] = useActionState(runCycleActivationAction, idleState);

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="cycleId" value={cycleId} />

      <FormError>{state.status === "error" ? state.message : null}</FormError>
      <FormSuccess>{state.status === "success" ? state.message : null}</FormSuccess>

      <InfoNote tone="warning">
        Activation normally runs automatically on the schedule. Use this only if the scheduled job
        did not run. It is idempotent and fully audited.
      </InfoNote>

      <Field label="Reason" htmlFor="cycle-reason" required error={state.fieldErrors?.reason}>
        <Input id="cycle-reason" name="reason" required placeholder="e.g. Scheduler outage" />
      </Field>

      <ConfirmSubmit
        label="Run activation now"
        title="Run cycle activation manually?"
        description="Every queued investment whose cycle boundary has passed will be activated and its 30-day term will start."
      />
    </form>
  );
}

export function BroadcastForm() {
  const [state, formAction] = useActionState(broadcastNotificationAction, idleState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError>{state.status === "error" ? state.message : null}</FormError>
      <FormSuccess>{state.status === "success" ? state.message : null}</FormSuccess>

      <Field label="Audience" htmlFor="audience" required>
        <Select id="audience" name="audience" defaultValue="ALL" required>
          <option value="ALL">All active investor accounts</option>
          <option value="VERIFIED">Verified investors only</option>
          <option value="ACTIVE_INVESTORS">Investors with an active investment</option>
        </Select>
      </Field>

      <Field label="Title" htmlFor="broadcast-title" required error={state.fieldErrors?.title}>
        <Input id="broadcast-title" name="title" required maxLength={120} />
      </Field>

      <Field
        label="Message"
        htmlFor="broadcast-message"
        required
        hint="Delivered as an in-app notification. Keep it factual — no performance claims."
        error={state.fieldErrors?.message}
      >
        <Textarea id="broadcast-message" name="message" rows={4} required maxLength={1000} />
      </Field>

      <SubmitButton size="sm" pendingLabel="Sending…">
        Send notification
      </SubmitButton>
    </form>
  );
}
