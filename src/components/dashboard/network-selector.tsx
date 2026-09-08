"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { FormError } from "@/components/ui/form";
import { choosePaymentNetworkAction } from "@/server/actions/investing";
import { idleState } from "@/lib/action-state";

/**
 * Lets an investor switch the network they intend to pay on.
 *
 * Only the network code is submitted — the server resolves the matching
 * address, so nothing here can redirect a payment to an arbitrary wallet.
 */
export function NetworkSelector({
  investmentId,
  wallets,
  selected,
}: {
  investmentId: string;
  wallets: { network: string; label: string }[];
  selected: string;
}) {
  const [state, formAction, pending] = useActionState(choosePaymentNetworkAction, idleState);

  // With a single configured wallet there is nothing to choose between.
  if (wallets.length <= 1) return null;

  return (
    <div className="mt-5 border-t border-ink-700/60 pt-5">
      <p className="text-[11px] uppercase tracking-[0.14em] text-fg-subtle">Choose your network</p>

      <form action={formAction} className="mt-2.5">
        <input type="hidden" name="investmentId" value={investmentId} />
        <div className="flex flex-wrap gap-2">
          {wallets.map((wallet) => {
            const active = wallet.network === selected;
            return (
              <button
                key={wallet.network}
                type="submit"
                name="network"
                value={wallet.network}
                disabled={pending}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-medium transition-colors disabled:opacity-60",
                  active
                    ? "border-accent-700 bg-accent-900 text-accent-200"
                    : "border-ink-600 text-fg-muted hover:border-ink-500 hover:text-fg",
                )}
              >
                {active ? <Check className="size-3.5 shrink-0" aria-hidden /> : null}
                {wallet.label}
              </button>
            );
          })}
        </div>
      </form>

      <div className="mt-3">
        <FormError>{state.status === "error" ? state.message : null}</FormError>
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-fg-subtle">
        The address and QR code below change to match the network you pick. Send on that network
        only.
      </p>
    </div>
  );
}
