"use client";

import * as React from "react";
import { useActionState } from "react";
import { ArrowDownToLine, Repeat } from "lucide-react";

import { cn } from "@/lib/utils";
import { SubmitButton } from "@/components/ui/interactive";
import { Checkbox, Field, FormError, FormSuccess, Input, Select } from "@/components/ui/form";
import { InfoNote } from "@/components/ui/feedback";
import { createRolloverAction, requestWithdrawalAction } from "@/server/actions/investing";
import { idleState } from "@/lib/action-state";

interface RolloverPreview {
  mode: string;
  principal: string;
  percentage: string;
  projectedMaturity: string;
  durationDays: number;
  waitsForCycle: boolean;
}

export function MaturityActions({
  investmentId,
  maturityAmount,
  networks,
  savedWallet,
  savedNetwork,
  requirePassword,
  rollover,
  packages,
  cycleLabel,
}: {
  investmentId: string;
  maturityAmount: string;
  networks: string[];
  savedWallet: string | null;
  savedNetwork: string | null;
  requirePassword: boolean;
  rollover: RolloverPreview;
  packages: { slug: string; name: string; returnPercentage: string }[];
  cycleLabel: string;
}) {
  const [tab, setTab] = React.useState<"withdraw" | "rollover">("withdraw");

  return (
    <div>
      <div
        role="tablist"
        aria-label="Maturity options"
        className="grid grid-cols-2 gap-1 rounded-xl border border-ink-700 bg-ink-900/60 p-1"
      >
        {(
          [
            { id: "withdraw", label: "Withdraw", icon: ArrowDownToLine },
            { id: "rollover", label: "Rollover", icon: Repeat },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={tab === option.id}
            aria-controls={`panel-${option.id}`}
            id={`tab-${option.id}`}
            onClick={() => setTab(option.id)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
              tab === option.id
                ? "bg-ink-750 text-fg"
                : "text-fg-muted hover:text-fg",
            )}
          >
            <option.icon className="size-4" aria-hidden />
            {option.label}
          </button>
        ))}
      </div>

      <div
        id="panel-withdraw"
        role="tabpanel"
        aria-labelledby="tab-withdraw"
        hidden={tab !== "withdraw"}
        className="mt-5"
      >
        <WithdrawForm
          investmentId={investmentId}
          maturityAmount={maturityAmount}
          networks={networks}
          savedWallet={savedWallet}
          savedNetwork={savedNetwork}
          requirePassword={requirePassword}
        />
      </div>

      <div
        id="panel-rollover"
        role="tabpanel"
        aria-labelledby="tab-rollover"
        hidden={tab !== "rollover"}
        className="mt-5"
      >
        <RolloverForm
          investmentId={investmentId}
          preview={rollover}
          packages={packages}
          cycleLabel={cycleLabel}
        />
      </div>
    </div>
  );
}

function WithdrawForm({
  investmentId,
  maturityAmount,
  networks,
  savedWallet,
  savedNetwork,
  requirePassword,
}: {
  investmentId: string;
  maturityAmount: string;
  networks: string[];
  savedWallet: string | null;
  savedNetwork: string | null;
  requirePassword: boolean;
}) {
  const [state, formAction] = useActionState(requestWithdrawalAction, idleState);
  const error = (name: string) => state.fieldErrors?.[name];

  if (state.status === "success") {
    return <FormSuccess>{state.message}</FormSuccess>;
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="investmentId" value={investmentId} />
      <input type="hidden" name="method" value="USDT_WALLET" />

      <FormError>{state.status === "error" ? state.message : null}</FormError>

      <div className="rounded-xl border border-ink-700 bg-ink-880/50 p-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-fg-subtle">Amount to withdraw</p>
        <p className="mt-1.5 text-2xl font-semibold tracking-tight text-fg">{maturityAmount}</p>
        <p className="mt-1 text-[12px] text-fg-muted">
          The full matured amount. Partial withdrawals are not available.
        </p>
      </div>

      <Field label="Network" htmlFor="walletNetwork" required error={error("walletNetwork")}>
        <Select
          id="walletNetwork"
          name="walletNetwork"
          defaultValue={savedNetwork ?? networks[0]}
          required
        >
          {networks.map((network) => (
            <option key={network} value={network}>
              {network}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Destination wallet address"
        htmlFor="walletAddress"
        required
        hint="Check this carefully — blockchain transfers cannot be reversed."
        error={error("walletAddress")}
      >
        <Input
          id="walletAddress"
          name="walletAddress"
          defaultValue={savedWallet ?? ""}
          spellCheck={false}
          autoComplete="off"
          className="font-mono text-[12.5px]"
          required
          aria-invalid={Boolean(error("walletAddress"))}
        />
      </Field>

      <Checkbox
        id="saveWallet"
        name="saveWallet"
        defaultChecked={!savedWallet}
        label="Save this wallet as my default withdrawal destination"
      />

      {requirePassword ? (
        <Field
          label="Confirm your password"
          htmlFor="password"
          required
          hint="Required to authorise a withdrawal."
          error={error("password")}
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(error("password"))}
          />
        </Field>
      ) : (
        <input type="hidden" name="password" value="not-required" />
      )}

      <InfoNote tone="warning">
        Withdrawals are reviewed and settled manually. If you change your saved wallet, we email you
        a confirmation and record the change.
      </InfoNote>

      <SubmitButton block pendingLabel="Submitting request…">
        Request withdrawal
      </SubmitButton>
    </form>
  );
}

function RolloverForm({
  investmentId,
  preview,
  packages,
  cycleLabel,
}: {
  investmentId: string;
  preview: RolloverPreview;
  packages: { slug: string; name: string; returnPercentage: string }[];
  cycleLabel: string;
}) {
  const [state, formAction] = useActionState(createRolloverAction, idleState);
  const requiresPackage = preview.mode === "REQUIRE_PACKAGE_SELECTION";

  if (state.status === "success") {
    return <FormSuccess>{state.message}</FormSuccess>;
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="investmentId" value={investmentId} />

      <FormError>{state.status === "error" ? state.message : null}</FormError>

      <div className="rounded-xl border border-ink-700 bg-ink-880/50 p-4">
        <dl className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[12.5px] text-fg-muted">New capital (full matured amount)</dt>
            <dd className="text-[13px] font-semibold text-fg">{preview.principal}</dd>
          </div>
          {!requiresPackage ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[12.5px] text-fg-muted">Return percentage applied</dt>
                <dd className="text-[13px] font-semibold text-accent-300">
                  {preview.percentage}%
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-ink-700/60 pt-2.5">
                <dt className="text-[12.5px] text-fg-muted">Projected maturity value</dt>
                <dd className="text-[13px] font-semibold text-fg">{preview.projectedMaturity}</dd>
              </div>
            </>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[12.5px] text-fg-muted">Term</dt>
            <dd className="text-[13px] font-semibold text-fg">{preview.durationDays} days</dd>
          </div>
        </dl>
      </div>

      {requiresPackage ? (
        <Field
          label="Choose a package for the rollover"
          htmlFor="packageSlug"
          required
          hint="Your full matured amount becomes the capital; this package supplies the return percentage."
          error={state.fieldErrors?.packageSlug}
        >
          <Select id="packageSlug" name="packageSlug" required defaultValue="">
            <option value="" disabled>
              Select a package
            </option>
            {packages.map((pkg) => (
              <option key={pkg.slug} value={pkg.slug}>
                {pkg.name} — {pkg.returnPercentage}%
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <InfoNote>
        {preview.waitsForCycle
          ? `Your rollover joins the next investment cycle, opening ${cycleLabel}. It does not start immediately.`
          : "Your rollover starts immediately, as configured by the administrator."}
      </InfoNote>

      <SubmitButton block pendingLabel="Creating rollover…">
        Roll over the full amount
      </SubmitButton>
    </form>
  );
}
