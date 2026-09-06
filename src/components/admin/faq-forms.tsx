"use client";

import * as React from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/interactive";
import { Checkbox, Field, FormError, FormSuccess, Input, Textarea } from "@/components/ui/form";
import { saveFaqAction, saveContentAction } from "@/server/actions/admin";
import { idleState } from "@/lib/action-state";

export interface FaqValues {
  id?: string;
  question: string;
  answer: string;
  category: string;
  displayOrder: number;
  isActive: boolean;
}

export function FaqForm({
  values,
  onDone,
  compact,
}: {
  values?: FaqValues;
  onDone?: () => void;
  compact?: boolean;
}) {
  const [state, formAction] = useActionState(saveFaqAction, idleState);
  const error = (name: string) => state.fieldErrors?.[name];

  React.useEffect(() => {
    if (state.status === "success") onDone?.();
  }, [state.status, onDone]);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {values?.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <FormError>{state.status === "error" ? state.message : null}</FormError>
      <FormSuccess>{state.status === "success" ? state.message : null}</FormSuccess>

      <Field label="Question" htmlFor={`q-${values?.id ?? "new"}`} required error={error("question")}>
        <Input
          id={`q-${values?.id ?? "new"}`}
          name="question"
          defaultValue={values?.question}
          required
        />
      </Field>

      <Field label="Answer" htmlFor={`a-${values?.id ?? "new"}`} required error={error("answer")}>
        <Textarea
          id={`a-${values?.id ?? "new"}`}
          name="answer"
          rows={compact ? 4 : 6}
          defaultValue={values?.answer}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor={`c-${values?.id ?? "new"}`} error={error("category")}>
          <Input
            id={`c-${values?.id ?? "new"}`}
            name="category"
            defaultValue={values?.category ?? "General"}
          />
        </Field>
        <Field label="Display order" htmlFor={`o-${values?.id ?? "new"}`} error={error("displayOrder")}>
          <Input
            id={`o-${values?.id ?? "new"}`}
            name="displayOrder"
            type="number"
            min={0}
            max={999}
            defaultValue={values?.displayOrder ?? 0}
          />
        </Field>
      </div>

      <Checkbox
        id={`active-${values?.id ?? "new"}`}
        name="isActive"
        defaultChecked={values?.isActive ?? true}
        label="Published on the public site"
      />

      <SubmitButton size="sm" pendingLabel="Saving…">
        {values?.id ? "Save question" : "Add question"}
      </SubmitButton>
    </form>
  );
}

export function AddFaqPanel() {
  const [open, setOpen] = React.useState(false);

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        Add question
      </Button>
    );
  }

  return (
    <div className="surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-fg">New question</h2>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      <FaqForm compact onDone={() => setOpen(false)} />
    </div>
  );
}

export function ContentForm({
  slug,
  title,
  body,
  hint,
}: {
  slug: string;
  title: string;
  body: string;
  hint?: string;
}) {
  const [state, formAction] = useActionState(saveContentAction, idleState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="slug" value={slug} />

      <FormError>{state.status === "error" ? state.message : null}</FormError>
      <FormSuccess>{state.status === "success" ? state.message : null}</FormSuccess>

      <Field label="Page title" htmlFor={`title-${slug}`} required error={state.fieldErrors?.title}>
        <Input id={`title-${slug}`} name="title" defaultValue={title} required />
      </Field>

      <Field
        label="Body"
        htmlFor={`body-${slug}`}
        required
        hint={
          hint ??
          "Plain text. Start a line with ## for a heading, ### for a sub-heading, and - for a list item. Leave a blank line between paragraphs."
        }
        error={state.fieldErrors?.body}
      >
        <Textarea
          id={`body-${slug}`}
          name="body"
          rows={18}
          defaultValue={body}
          required
          className="font-mono text-[12.5px] leading-relaxed"
        />
      </Field>

      <SubmitButton size="sm" pendingLabel="Publishing…">
        Save and publish
      </SubmitButton>
    </form>
  );
}
