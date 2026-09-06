"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { FormError, FormSuccess } from "@/components/ui/form";
import { resendVerificationAction } from "@/server/actions/auth";
import type { ActionState } from "@/lib/action-state";

export function ResendVerificationButton() {
  const [pending, startTransition] = React.useTransition();
  const [state, setState] = React.useState<ActionState | null>(null);

  return (
    <div className="space-y-3">
      {state?.status === "success" ? <FormSuccess>{state.message}</FormSuccess> : null}
      {state?.status === "error" ? <FormError>{state.message}</FormError> : null}

      <Button
        type="button"
        variant="secondary"
        block
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setState(await resendVerificationAction());
          })
        }
      >
        {pending ? "Sending…" : "Send a new confirmation link"}
      </Button>
    </div>
  );
}
