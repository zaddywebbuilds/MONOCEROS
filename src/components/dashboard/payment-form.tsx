"use client";

import * as React from "react";
import { useActionState } from "react";
import { CheckCircle2, FileCheck2, Upload } from "lucide-react";

import { SubmitButton } from "@/components/ui/interactive";
import { Field, FormError, FormSuccess, Input } from "@/components/ui/form";
import { InfoNote } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { submitPaymentAction } from "@/server/actions/investing";
import { idleState } from "@/lib/action-state";

export function PaymentSubmissionForm({
  investmentId,
  expectedAmount,
  asset,
  maxUploadMb,
}: {
  investmentId: string;
  expectedAmount: string;
  asset: string;
  maxUploadMb: number;
}) {
  const [state, formAction] = useActionState(submitPaymentAction, idleState);
  const [open, setOpen] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const error = (name: string) => state.fieldErrors?.[name];

  if (state.status === "success") {
    return (
      <div className="rounded-xl border border-accent-700/40 bg-accent-900/20 p-5 text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-full border border-accent-700/50 bg-accent-900/40 text-accent-300">
          <CheckCircle2 className="size-5" aria-hidden />
        </span>
        <p className="mt-3 text-[14.5px] font-semibold text-fg">Payment submitted</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">{state.message}</p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="space-y-3">
        <Button block size="lg" onClick={() => setOpen(true)}>
          I Have Made Payment
        </Button>
        <p className="text-center text-[12px] leading-relaxed text-fg-subtle">
          Only press this once the transfer has actually been sent. You will be asked for the
          transaction hash.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" encType="multipart/form-data" noValidate>
      <input type="hidden" name="investmentId" value={investmentId} />

      <FormError>{state.status === "error" ? state.message : null}</FormError>
      <FormSuccess>{null}</FormSuccess>

      <Field
        label="Transaction hash (TXID)"
        htmlFor="transactionHash"
        required
        hint="Copy it from your wallet or the block explorer. Each hash can be submitted once."
        error={error("transactionHash")}
      >
        <Input
          id="transactionHash"
          name="transactionHash"
          autoComplete="off"
          spellCheck={false}
          className="font-mono text-[12.5px]"
          required
          aria-invalid={Boolean(error("transactionHash"))}
        />
      </Field>

      <Field
        label={`Amount sent (${asset})`}
        htmlFor="submittedAmount"
        required
        hint={`This should match the expected amount of ${expectedAmount} ${asset}.`}
        error={error("submittedAmount")}
      >
        <Input
          id="submittedAmount"
          name="submittedAmount"
          inputMode="decimal"
          defaultValue={expectedAmount}
          required
          aria-invalid={Boolean(error("submittedAmount"))}
        />
      </Field>

      <Field
        label="Proof of payment"
        htmlFor="proof"
        hint={`Optional. A screenshot or receipt, up to ${maxUploadMb}MB.`}
        error={fileError}
      >
        <label
          htmlFor="proof"
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-ink-600 bg-ink-900/50 px-4 py-3.5 transition-colors hover:border-accent-700"
        >
          {fileName ? (
            <FileCheck2 className="size-4 text-accent-400" aria-hidden />
          ) : (
            <Upload className="size-4 text-fg-subtle" aria-hidden />
          )}
          <span className="text-[13px] text-fg-muted">
            {fileName ?? "Attach a screenshot or receipt (optional)"}
          </span>
          <input
            id="proof"
            name="proof"
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setFileError(null);
              if (!file) return setFileName(null);
              if (file.size > maxUploadMb * 1024 * 1024) {
                setFileError(`That file is larger than ${maxUploadMb}MB.`);
                event.target.value = "";
                return setFileName(null);
              }
              setFileName(file.name);
            }}
          />
        </label>
      </Field>

      <InfoNote>
        Payments are verified by a person, not automatically. You will be notified by email and in
        your dashboard once the finance team has checked the transfer.
      </InfoNote>

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <SubmitButton block pendingLabel="Submitting…">
          Submit payment details
        </SubmitButton>
        <Button type="button" variant="secondary" block onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
