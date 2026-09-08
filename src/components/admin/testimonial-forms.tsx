"use client";

import * as React from "react";
import { useActionState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/interactive";
import { Field, FormError, FormSuccess, Input, Textarea, Checkbox } from "@/components/ui/form";
import {
  createTestimonialAction,
  updateTestimonialAction,
  deleteTestimonialAction,
} from "@/server/actions/testimonials";
import { idleState } from "@/lib/action-state";
import type { Testimonial } from ".prisma/client";

// ---------------------------------------------------------------------------
// Shared form fields (used in both Add and Edit forms)
// ---------------------------------------------------------------------------

function TestimonialFields({
  testimonial,
  fieldErrors,
}: {
  testimonial?: Testimonial;
  fieldErrors?: Record<string, string>;
}) {
  const err = (name: string) => fieldErrors?.[name];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Investor name" htmlFor="t-name" required error={err("name")}>
          <Input
            id="t-name"
            name="name"
            defaultValue={testimonial?.name}
            placeholder='e.g. "John D." or "Amaka O."'
            required
          />
        </Field>
        <Field label="Location (optional)" htmlFor="t-location" error={err("location")}>
          <Input
            id="t-location"
            name="location"
            defaultValue={testimonial?.location ?? ""}
            placeholder="e.g. Lagos, Nigeria"
          />
        </Field>
      </div>

      <Field label="Testimonial text" htmlFor="t-content" required error={err("content")}>
        <Textarea
          id="t-content"
          name="content"
          defaultValue={testimonial?.content}
          rows={4}
          maxLength={1000}
          placeholder="What did the investor say about their experience?"
          required
        />
      </Field>

      <Field
        label="Receipt / proof image URL (optional)"
        htmlFor="t-image"
        hint="Paste a link to an image of the withdrawal or deposit receipt."
        error={err("receiptImageUrl")}
      >
        <Input
          id="t-image"
          name="receiptImageUrl"
          type="url"
          defaultValue={testimonial?.receiptImageUrl ?? ""}
          placeholder="https://..."
        />
      </Field>

      <div className="flex flex-wrap gap-5">
        <Field label="" htmlFor="t-published" error={err("published")}>
          <Checkbox
            id="t-published"
            name="published"
            defaultChecked={testimonial?.published ?? false}
            label="Published (visible on site)"
          />
        </Field>
        <Field label="" htmlFor="t-featured" error={err("featured")}>
          <Checkbox
            id="t-featured"
            name="featured"
            defaultChecked={testimonial?.featured ?? false}
            label="Featured (shown first)"
          />
        </Field>
      </div>

      <Field
        label="Sort order"
        htmlFor="t-sort"
        hint="Lower numbers appear first."
        error={err("sortOrder")}
      >
        <Input
          id="t-sort"
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={testimonial?.sortOrder ?? 0}
          className="w-24"
        />
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit / delete form (rendered inline in the admin list)
// ---------------------------------------------------------------------------

export function TestimonialForm({ testimonial }: { testimonial: Testimonial }) {
  const [state, formAction] = useActionState(updateTestimonialAction, idleState);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  return (
    <div className="space-y-4">
      <FormError>{state.status === "error" ? state.message : null}</FormError>
      <FormSuccess>{state.status === "success" ? state.message : null}</FormSuccess>

      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="id" value={testimonial.id} />
        <TestimonialFields testimonial={testimonial} fieldErrors={state.fieldErrors} />
        <div className="flex items-center gap-3">
          <SubmitButton size="sm" pendingLabel="Saving…">
            Save changes
          </SubmitButton>

          {confirmDelete ? (
            <>
              <Button
                variant="danger"
                size="sm"
                type="button"
                onClick={async () => {
                  await deleteTestimonialAction(testimonial.id);
                  setConfirmDelete(false);
                }}
              >
                Yes, delete
              </Button>
              <Button variant="ghost" size="sm" type="button" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-status-rejected hover:text-status-rejected"
            >
              <Trash2 className="mr-1.5 size-3.5" aria-hidden />
              Delete
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add panel (slide-open form)
// ---------------------------------------------------------------------------

export function AddTestimonialPanel() {
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useActionState(createTestimonialAction, idleState);

  React.useEffect(() => {
    if (state.status === "success") setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 size-4" aria-hidden />
        Add testimonial
      </Button>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-ink-600 bg-ink-900/60 p-5 sm:p-6">
      <h3 className="mb-5 text-[14px] font-semibold text-fg">New testimonial</h3>

      <FormError>{state.status === "error" ? state.message : null}</FormError>

      <form action={formAction} className="space-y-4" noValidate>
        <TestimonialFields fieldErrors={state.fieldErrors} />
        <div className="flex gap-3">
          <SubmitButton size="sm" pendingLabel="Adding…">
            Add testimonial
          </SubmitButton>
          <Button variant="ghost" size="sm" type="button" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
