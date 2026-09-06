"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";

import { SubmitButton } from "@/components/ui/interactive";
import { FormError } from "@/components/ui/form";
import { subscribeAction } from "@/server/actions/investing";
import { idleState } from "@/lib/action-state";

export function SubscribeForm({
  packageSlug,
  disabled,
  disabledReason,
}: {
  packageSlug: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [state, formAction] = useActionState(subscribeAction, idleState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="packageSlug" value={packageSlug} />

      <FormError>{state.status === "error" ? state.message : null}</FormError>

      {disabled ? (
        <p className="rounded-lg border border-status-pending/30 bg-status-pending/[0.07] px-3.5 py-3 text-[13px] text-status-pending">
          {disabledReason}
        </p>
      ) : (
        <SubmitButton block size="lg" pendingLabel="Creating subscription…">
          Proceed to Payment
          <ArrowRight />
        </SubmitButton>
      )}

      <p className="text-center text-[12px] leading-relaxed text-fg-subtle">
        Creating a subscription does not move any money. You will see the payment instructions on
        the next screen.
      </p>
    </form>
  );
}
