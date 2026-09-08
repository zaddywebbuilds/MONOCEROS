"use client";

import * as React from "react";
import { useActionState } from "react";
import { ShieldCheck, ShieldOff, Copy, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/interactive";
import { Field, FormError, FormSuccess, Input } from "@/components/ui/form";
import {
  generateTotpSetupAction,
  confirmTotpSetupAction,
  disableTotpAction,
} from "@/server/actions/two-factor";
import { idleState } from "@/lib/action-state";

// ---------------------------------------------------------------------------
// Enabled state — shows disable form
// ---------------------------------------------------------------------------

function DisableForm() {
  const [state, formAction] = useActionState(disableTotpAction, idleState);
  const [open, setOpen] = React.useState(false);

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-emerald-700/60 bg-emerald-950/50 text-emerald-400">
            <ShieldCheck className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-[13px] font-medium text-fg">Two-factor authentication is on</p>
            <p className="text-[11.5px] text-fg-subtle">Your account is protected by an authenticator app.</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          Disable
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-emerald-700/60 bg-emerald-950/50 text-emerald-400">
          <ShieldCheck className="size-4" aria-hidden />
        </span>
        <p className="text-[13px] font-medium text-fg">Disable two-factor authentication</p>
      </div>

      <FormError>{state.status === "error" ? state.message : null}</FormError>

      <form action={formAction} className="space-y-4" noValidate>
        <Field
          label="Confirm your password"
          htmlFor="disable-password"
          required
          hint="Enter your current password to disable 2FA."
          error={state.fieldErrors?.password}
        >
          <Input
            id="disable-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>

        <div className="flex gap-2">
          <SubmitButton variant="danger" size="sm" pendingLabel="Disabling…">
            Disable 2FA
          </SubmitButton>
          <Button variant="ghost" size="sm" type="button" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recovery codes display (shown once after setup)
// ---------------------------------------------------------------------------

function RecoveryCodesDisplay({ codes }: { codes: string[] }) {
  const [copied, setCopied] = React.useState(false);

  const copyAll = () => {
    void navigator.clipboard.writeText(codes.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] leading-relaxed text-fg-muted">
        Save these recovery codes somewhere safe. Each can only be used once to sign in
        if you lose access to your authenticator app.
      </p>
      <div className="rounded-lg border border-ink-600 bg-ink-880/70 p-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {codes.map((code) => (
            <code key={code} className="font-mono text-[12px] tracking-wider text-fg">
              {code}
            </code>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={copyAll}
        className="flex items-center gap-1.5 text-[12px] text-accent-400 hover:text-accent-300"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy all codes"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Setup flow — step 1 (QR code) + step 2 (confirm)
// ---------------------------------------------------------------------------

function SetupFlow() {
  const [step, setStep] = React.useState<"idle" | "scanning" | "confirming" | "done">("idle");
  const [secret, setSecret] = React.useState("");
  const [qrDataUri, setQrDataUri] = React.useState("");
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [genError, setGenError] = React.useState("");

  const [confirmState, confirmAction] = useActionState(confirmTotpSetupAction, {
    ...idleState,
    recoveryCodes: undefined as string[] | undefined,
  });

  // When confirmation succeeds, move to done and show recovery codes
  React.useEffect(() => {
    if (confirmState.status === "success" && confirmState.recoveryCodes) {
      setRecoveryCodes(confirmState.recoveryCodes);
      setStep("done");
    }
  }, [confirmState]);

  const startSetup = async () => {
    setLoading(true);
    setGenError("");
    const result = await generateTotpSetupAction();
    setLoading(false);
    if (result.status === "error") {
      setGenError(result.message ?? "Failed to start setup.");
      return;
    }
    setSecret(result.secret ?? "");
    setQrDataUri(result.qrDataUri ?? "");
    setStep("scanning");
  };

  if (step === "idle") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-ink-600 bg-ink-850 text-fg-muted">
            <ShieldOff className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-[13px] font-medium text-fg">Two-factor authentication is off</p>
            <p className="text-[11.5px] text-fg-subtle">
              Add an extra layer of protection to your account.
            </p>
          </div>
        </div>
        {genError ? <p className="text-[12.5px] text-status-rejected">{genError}</p> : null}
        <Button size="sm" onClick={() => void startSetup()} disabled={loading}>
          {loading ? "Setting up…" : "Enable 2FA"}
        </Button>
      </div>
    );
  }

  if (step === "scanning") {
    return (
      <div className="space-y-5">
        <p className="text-[13px] font-medium text-fg">Step 1 — Scan the QR code</p>
        <p className="text-[12.5px] leading-relaxed text-fg-muted">
          Open your authenticator app (Google Authenticator, Authy, or any TOTP app) and
          scan the code below.
        </p>
        {qrDataUri ? (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUri}
              alt="Scan this QR code with your authenticator app"
              width={200}
              height={200}
              className="rounded-lg border border-ink-600 bg-white p-2"
            />
          </div>
        ) : null}
        <details className="text-[12px] text-fg-subtle">
          <summary className="cursor-pointer hover:text-fg-muted">Can&apos;t scan? Enter the key manually</summary>
          <code className="mt-2 block break-all font-mono text-[11px] leading-relaxed text-fg">
            {secret}
          </code>
        </details>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setStep("confirming")}>
            I&apos;ve scanned it →
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setStep("idle")}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (step === "confirming") {
    return (
      <div className="space-y-4">
        <p className="text-[13px] font-medium text-fg">Step 2 — Confirm with a code</p>
        <p className="text-[12.5px] leading-relaxed text-fg-muted">
          Enter the 6-digit code your authenticator app is showing now.
        </p>

        <FormError>{confirmState.status === "error" ? confirmState.message : null}</FormError>

        <form action={confirmAction} className="space-y-4" noValidate>
          <input type="hidden" name="secret" value={secret} />
          <Field
            label="Authenticator code"
            htmlFor="totp-code"
            required
            error={confirmState.fieldErrors?.code}
          >
            <Input
              id="totp-code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000 000"
              autoFocus
              required
              className="text-center tracking-[0.25em] text-lg"
            />
          </Field>
          <div className="flex gap-2">
            <SubmitButton size="sm" pendingLabel="Verifying…">
              Enable 2FA
            </SubmitButton>
            <Button variant="ghost" size="sm" type="button" onClick={() => setStep("scanning")}>
              Back
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // done
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-emerald-700/60 bg-emerald-950/50 text-emerald-400">
          <ShieldCheck className="size-4" aria-hidden />
        </span>
        <p className="text-[13px] font-medium text-fg">Two-factor authentication enabled!</p>
      </div>
      <p className="text-[12.5px] text-fg-subtle">
        From now on you will need your authenticator app whenever you sign in.
      </p>
      <RecoveryCodesDisplay codes={recoveryCodes} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public export — rendered by the security page
// ---------------------------------------------------------------------------

export function TwoFactorSection({ enabled }: { enabled: boolean }) {
  return enabled ? <DisableForm /> : <SetupFlow />;
}
