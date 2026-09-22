"use client";

import * as React from "react";
import { useActionState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/interactive";
import { Field, FormError, FormSuccess, Input } from "@/components/ui/form";
import { requestReferralPayoutAction } from "@/server/actions/referrals";
import { idleState } from "@/lib/action-state";

export function ReferralLinkCard({ link, code }: { link: string; code: string }) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the link is on screen to be copied by
      // hand, so this needs no error of its own.
    }
  };

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-880/50 p-5">
      <p className="text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">Your referral link</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <code className="break-all rounded-lg bg-ink-950/60 px-3 py-2 font-mono text-[13px] text-accent-300">
          {link}
        </code>
        <Button type="button" size="sm" variant="ghost" onClick={() => void copy()}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="mt-2.5 text-[12px] text-fg-subtle">
        Anyone who registers through this link is permanently recorded as your introduction. Your
        code is <span className="font-mono">{code}</span>.
      </p>
    </div>
  );
}

export function ReferralPayoutForm({
  payable,
  minimum,
  belowMinimum,
  savedAddress,
  savedNetwork,
}: {
  payable: string;
  minimum: number;
  belowMinimum: boolean;
  savedAddress: string;
  savedNetwork: string;
}) {
  const [state, formAction] = useActionState(requestReferralPayoutAction, idleState);

  if (belowMinimum) {
    return (
      <p className="text-[12.5px] leading-relaxed text-fg-muted">
        You have {payable} USDT available. Payouts can be requested once you reach{" "}
        {minimum.toFixed(2)} USDT, which keeps transfer fees from eating the commission.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError>{state.status === "error" ? state.message : null}</FormError>
      <FormSuccess>{state.status === "success" ? state.message : null}</FormSuccess>

      <p className="text-[12.5px] leading-relaxed text-fg-muted">
        Requesting a payout of <span className="font-semibold text-fg">{payable} USDT</span>, which
        is everything currently available. It is reviewed before it is sent.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Wallet address"
          htmlFor="walletAddress"
          required
          error={state.fieldErrors?.walletAddress}
        >
          <Input
            id="walletAddress"
            name="walletAddress"
            defaultValue={savedAddress}
            spellCheck={false}
            required
          />
        </Field>
        <Field
          label="Network"
          htmlFor="walletNetwork"
          required
          hint="For example TRC20 or BEP20"
          error={state.fieldErrors?.walletNetwork}
        >
          <Input
            id="walletNetwork"
            name="walletNetwork"
            defaultValue={savedNetwork}
            spellCheck={false}
            required
          />
        </Field>
      </div>

      <p className="text-[11.5px] leading-relaxed text-fg-subtle">
        Check the address character by character. A payment sent to a wrong address cannot be
        recovered by anyone.
      </p>

      <SubmitButton size="sm" pendingLabel="Requesting…">
        Request payout
      </SubmitButton>
    </form>
  );
}
