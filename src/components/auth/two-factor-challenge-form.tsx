"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";

import { SubmitButton } from "@/components/ui/interactive";
import { Field, FormError, Input } from "@/components/ui/form";
import { verifyTotpLoginAction } from "@/server/actions/auth";
import { idleState } from "@/lib/action-state";

export function TwoFactorChallengeForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(verifyTotpLoginAction, idleState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <FormError>{state.status === "error" ? state.message : null}</FormError>

      <div className="flex justify-center py-2">
        <span className="grid size-12 place-items-center rounded-xl border border-ink-600 bg-ink-850">
          <ShieldCheck className="size-6 text-accent-400" aria-hidden />
        </span>
      </div>

      <Field
        label="Authenticator code"
        htmlFor="code"
        required
        hint="6-digit code from your app, or a recovery code."
        error={state.fieldErrors?.code}
      >
        <Input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={10}
          placeholder="000 000"
          autoFocus
          required
          className="text-center tracking-[0.25em] text-lg"
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Verifying…">
        Verify and sign in
      </SubmitButton>

      <p className="text-center text-[12px] text-fg-subtle">
        Lost your device?{" "}
        <span className="text-fg-muted">
          Enter one of your recovery codes above instead.
        </span>
      </p>

      <p className="text-center text-[12px] text-fg-subtle">
        <Link href="/login" className="text-accent-400 underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
