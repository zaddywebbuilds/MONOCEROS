"use client";

import * as React from "react";
import { useActionState } from "react";

import { SubmitButton } from "@/components/ui/interactive";
import { Field, FormError, FormSuccess, Input, Select, Textarea } from "@/components/ui/form";
import {
  setReferralCodeAction,
  setReferrerAction,
  decideReferralPayoutAction,
} from "@/server/actions/referrals";
import { idleState } from "@/lib/action-state";

/**
 * Approve, mark paid, or decline a payout.
 *
 * "Approved" and "Paid" are kept apart deliberately: approving says the claim
 * is good, marking paid says the USDT has actually left. Collapsing them would
 * mean the ledger records money as sent the moment somebody clicks, which is
 * the wrong thing to have written down if the transfer then fails.
 */
export function ReferralPayoutDecisionForm({ payoutId }: { payoutId: string }) {
  const [state, formAction] = useActionState(decideReferralPayoutAction, idleState);
  const [decision, setDecision] = React.useState("APPROVED");

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="payoutId" value={payoutId} />

      <FormError>{state.status === "error" ? state.message : null}</FormError>
      <FormSuccess>{state.status === "success" ? state.message : null}</FormSuccess>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Decision" htmlFor={`decision-${payoutId}`}>
          <Select
            id={`decision-${payoutId}`}
            name="decision"
            value={decision}
            onChange={(event) => setDecision(event.target.value)}
          >
            <option value="APPROVED">Approve (not yet sent)</option>
            <option value="PAID">Mark as paid</option>
            <option value="REJECTED">Decline</option>
          </Select>
        </Field>

        {decision === "PAID" ? (
          <Field
            label="Transaction hash"
            htmlFor={`txid-${payoutId}`}
            hint="Optional, but worth recording"
            error={state.fieldErrors?.paymentTxid}
          >
            <Input id={`txid-${payoutId}`} name="paymentTxid" spellCheck={false} />
          </Field>
        ) : null}
      </div>

      {decision === "REJECTED" ? (
        <Field
          label="Reason"
          htmlFor={`reason-${payoutId}`}
          required
          hint="Shown to the affiliate. Their commission returns to available."
          error={state.fieldErrors?.reason}
        >
          <Textarea id={`reason-${payoutId}`} name="reason" rows={2} required />
        </Field>
      ) : null}

      <SubmitButton
        size="sm"
        variant={decision === "REJECTED" ? "danger" : "primary"}
        pendingLabel="Saving…"
      >
        {decision === "PAID" ? "Mark as paid" : decision === "REJECTED" ? "Decline" : "Approve"}
      </SubmitButton>
    </form>
  );
}

/** Admits an account to the referral programme, or withdraws it. */
export function ReferralCodeForm({
  userId,
  code,
}: {
  userId: string;
  code: string | null;
}) {
  const [state, formAction] = useActionState(setReferralCodeAction, idleState);

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="action" value={code ? "REVOKE" : "ISSUE"} />

      <FormError>{state.status === "error" ? state.message : null}</FormError>
      <FormSuccess>{state.status === "success" ? state.message : null}</FormSuccess>

      {code ? (
        <p className="break-all text-[12.5px] text-fg-muted">
          Referral link: <span className="font-mono text-fg">/r/{code}</span>
        </p>
      ) : (
        <p className="text-[12.5px] leading-relaxed text-fg-muted">
          This account cannot earn commission. Issuing a link admits them to the referral
          programme.
        </p>
      )}

      <Field
        label="Reason"
        htmlFor={`code-reason-${userId}`}
        required={Boolean(code)}
        error={state.fieldErrors?.reason}
      >
        <Input id={`code-reason-${userId}`} name="reason" required={Boolean(code)} />
      </Field>

      <SubmitButton size="sm" variant={code ? "danger" : "primary"} pendingLabel="Saving…">
        {code ? "Withdraw referral link" : "Issue referral link"}
      </SubmitButton>
    </form>
  );
}

/** Records who introduced an investor, for links that were never used. */
export function SetReferrerForm({
  userId,
  currentCode,
}: {
  userId: string;
  currentCode: string | null;
}) {
  const [state, formAction] = useActionState(setReferrerAction, idleState);

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="userId" value={userId} />

      <FormError>{state.status === "error" ? state.message : null}</FormError>
      <FormSuccess>{state.status === "success" ? state.message : null}</FormSuccess>

      <Field
        label="Referrer's code"
        htmlFor={`referrer-${userId}`}
        hint="Leave empty to clear. Future maturities pay this person; past ones are not backdated."
        error={state.fieldErrors?.referrerCode}
      >
        <Input
          id={`referrer-${userId}`}
          name="referrerCode"
          defaultValue={currentCode ?? ""}
          spellCheck={false}
        />
      </Field>

      <Field
        label="Reason"
        htmlFor={`referrer-reason-${userId}`}
        required
        error={state.fieldErrors?.reason}
      >
        <Input id={`referrer-reason-${userId}`} name="reason" required />
      </Field>

      <SubmitButton size="sm" pendingLabel="Saving…">
        Save referrer
      </SubmitButton>
    </form>
  );
}
