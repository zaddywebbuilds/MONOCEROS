"use client";

import * as React from "react";
import { useActionState } from "react";

import { SubmitButton } from "@/components/ui/interactive";
import { Field, FormError, FormSuccess, Input, Textarea } from "@/components/ui/form";
import { contactAction } from "@/server/actions/support";
import { idleState } from "@/lib/action-state";

export function ContactForm() {
  const [state, formAction] = useActionState(contactAction, idleState);
  const error = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError>{state.status === "error" ? state.message : null}</FormError>
      <FormSuccess>{state.status === "success" ? state.message : null}</FormSuccess>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="name" required error={error("name")}>
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
        <Field label="Email address" htmlFor="email" required error={error("email")}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
      </div>

      <Field label="Subject" htmlFor="subject" required error={error("subject")}>
        <Input id="subject" name="subject" required />
      </Field>

      <Field
        label="Message"
        htmlFor="message"
        required
        hint="Do not include your password, NIN or any wallet recovery phrase."
        error={error("message")}
      >
        <Textarea id="message" name="message" rows={6} required />
      </Field>

      <SubmitButton pendingLabel="Sending…">Send message</SubmitButton>
    </form>
  );
}
