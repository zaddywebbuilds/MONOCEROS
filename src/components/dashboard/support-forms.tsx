"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";

import { SubmitButton } from "@/components/ui/interactive";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { createTicketAction, replyTicketAction } from "@/server/actions/support";
import { idleState } from "@/lib/action-state";
import { TICKET_CATEGORIES } from "@/lib/validation/platform";

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: "General",
  ACCOUNT: "My account",
  KYC: "Identity verification",
  PAYMENT: "Payments",
  WITHDRAWAL: "Withdrawals",
  TECHNICAL: "Technical problem",
  OTHER: "Something else",
};

export function NewTicketForm() {
  const [state, formAction] = useActionState(createTicketAction, idleState);
  const error = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError>{state.status === "error" ? state.message : null}</FormError>

      <Field label="Subject" htmlFor="subject" required error={error("subject")}>
        <Input
          id="subject"
          name="subject"
          placeholder="Briefly, what is this about?"
          required
          aria-invalid={Boolean(error("subject"))}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor="category" required error={error("category")}>
          <Select id="category" name="category" defaultValue="GENERAL" required>
            {TICKET_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category] ?? category}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Priority" htmlFor="priority" required error={error("priority")}>
          <Select id="priority" name="priority" defaultValue="NORMAL" required>
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </Select>
        </Field>
      </div>

      <Field
        label="Message"
        htmlFor="message"
        required
        hint="Include any reference numbers. Never include your password or a wallet recovery phrase."
        error={error("message")}
      >
        <Textarea id="message" name="message" rows={7} required />
      </Field>

      <SubmitButton pendingLabel="Creating ticket…">
        <Send />
        Create ticket
      </SubmitButton>
    </form>
  );
}

export function TicketReplyForm({
  ticketId,
  disabled,
}: {
  ticketId: string;
  disabled?: boolean;
}) {
  const [state, formAction] = useActionState(replyTicketAction, idleState);

  if (disabled) {
    return (
      <p className="rounded-lg border border-ink-700 bg-ink-880/50 px-4 py-3 text-[13px] text-fg-muted">
        This ticket is closed. Open a new ticket if you need more help.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="ticketId" value={ticketId} />

      <FormError>{state.status === "error" ? state.message : null}</FormError>

      <Field label="Reply" htmlFor="message" error={state.fieldErrors?.message}>
        <Textarea id="message" name="message" rows={4} placeholder="Add a reply…" required />
      </Field>

      <SubmitButton size="sm" pendingLabel="Sending…">
        <Send />
        Send reply
      </SubmitButton>
    </form>
  );
}
