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
import { appUrl } from "@/lib/env";

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
  const [action, setAction] = React.useState("REGENERATE");

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="userId" value={userId} />
      {code ? null : <input type="hidden" name="action" value="ISSUE" />}

      <h3 className="text-[13px] font-semibold text-fg">This account&rsquo;s own referral link</h3>
      <p className="-mt-1.5 text-[11.5px] text-fg-subtle">
        The link they share to introduce other people.
      </p>

      <FormError>{state.status === "error" ? state.message : null}</FormError>
      <FormSuccess>{state.status === "success" ? state.message : null}</FormSuccess>

      {code ? (
        <>
          <p className="break-all text-[12.5px] text-fg-muted">
            <a
              href={`${appUrl}/r/${code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all font-mono text-accent-300 underline underline-offset-2"
            >
              {appUrl}/r/{code}
            </a>
          </p>

          <Field label="Action" htmlFor={`code-action-${userId}`}>
            <Select
              id={`code-action-${userId}`}
              name="action"
              value={action}
              onChange={(event) => setAction(event.target.value)}
            >
              <option value="REGENERATE">Replace with a new link</option>
              <option value="REVOKE">Withdraw from the programme</option>
            </Select>
          </Field>

          <p className="text-[11.5px] leading-relaxed text-fg-subtle">
            {action === "REGENERATE"
              ? "The old link stops working immediately. People already introduced stay credited to them, and so does anything earned."
              : "They keep every commission already earned. Only the ability to introduce new people is removed."}
          </p>
        </>
      ) : (
        <p className="text-[12.5px] leading-relaxed text-fg-muted">
          This account cannot earn commission. Issuing a link admits them to the referral
          programme.
        </p>
      )}

      <Field
        label="Reason"
        htmlFor={`code-reason-${userId}`}
        required={code ? action === "REVOKE" : false}
        error={state.fieldErrors?.reason}
      >
        <Input
          id={`code-reason-${userId}`}
          name="reason"
          required={code ? action === "REVOKE" : false}
        />
      </Field>

      <SubmitButton
        size="sm"
        variant={code && action === "REVOKE" ? "danger" : "primary"}
        pendingLabel="Saving…"
      >
        {!code
          ? "Issue referral link"
          : action === "REGENERATE"
            ? "Generate new link"
            : "Withdraw referral link"}
      </SubmitButton>
    </form>
  );
}

/** Records who introduced an investor, for links that were never used. */
export function SetReferrerForm({
  userId,
  currentCode,
  referrerName,
}: {
  userId: string;
  currentCode: string | null;
  referrerName?: string | null;
}) {
  const [state, formAction] = useActionState(setReferrerAction, idleState);

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="userId" value={userId} />

      {/* Named as a person rather than shown as a bare link. The two halves of
          this card were previously two near-identical URLs, and the referrer's
          link was read as this account's own link having been generated wrongly. */}
      <h3 className="text-[13px] font-semibold text-fg">Who introduced this account</h3>
      <p className="-mt-1.5 text-[11.5px] text-fg-subtle">
        Someone else&rsquo;s link, used when this account registered. It earns commission for
        them, not for this account.
      </p>

      <FormError>{state.status === "error" ? state.message : null}</FormError>
      <FormSuccess>{state.status === "success" ? state.message : null}</FormSuccess>

      {currentCode ? (
        <p className="text-[12.5px] text-fg-muted">
          Introduced by{" "}
          <span className="font-semibold text-fg">{referrerName ?? currentCode}</span>{" "}
          <span className="break-all font-mono text-[11.5px] text-fg-subtle">({currentCode})</span>
        </p>
      ) : (
        <p className="text-[12.5px] text-fg-muted">Nobody. This account registered directly.</p>
      )}

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
