"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/ui/interactive";
import { Field, FormError, FormSuccess, Select } from "@/components/ui/form";
import { setTicketStatusAction } from "@/server/actions/support";
import { idleState } from "@/lib/action-state";
import { TICKET_STATUS_LABEL } from "@/lib/domain/support-status";

export function TicketStatusForm({
  ticketId,
  currentStatus,
}: {
  ticketId: string;
  currentStatus: string;
}) {
  const [state, formAction] = useActionState(setTicketStatusAction, idleState);

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="ticketId" value={ticketId} />

      <FormError>{state.status === "error" ? state.message : null}</FormError>
      <FormSuccess>{state.status === "success" ? state.message : null}</FormSuccess>

      <Field label="Status" htmlFor="status">
        <Select id="status" name="status" defaultValue={currentStatus}>
          {Object.entries(TICKET_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>

      <SubmitButton size="sm" variant="secondary" pendingLabel="Updating…">
        Update status
      </SubmitButton>
    </form>
  );
}
