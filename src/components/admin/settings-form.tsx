"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/ui/interactive";
import { Checkbox, Field, FormError, FormSuccess, Input, Select, Textarea } from "@/components/ui/form";
import { saveSettingsAction } from "@/server/actions/admin";
import { idleState } from "@/lib/action-state";

export interface SettingFieldModel {
  key: string;
  label: string;
  description?: string;
  /** Rendered control, derived from the default value's type. */
  kind: "text" | "textarea" | "number" | "boolean" | "list" | "select";
  value: string | number | boolean | string[];
  options?: { value: string; label: string }[];
}

export function SettingsGroupForm({
  group,
  title,
  description,
  fields,
}: {
  group: string;
  title: string;
  description?: string;
  fields: SettingFieldModel[];
}) {
  const [state, formAction] = useActionState(saveSettingsAction, idleState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="group" value={group} />

      <div>
        <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
        {description ? (
          <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">{description}</p>
        ) : null}
      </div>

      <FormError>{state.status === "error" ? state.message : null}</FormError>
      <FormSuccess>{state.status === "success" ? state.message : null}</FormSuccess>

      <div className="space-y-4">
        {fields.map((field) => {
          const id = `setting-${field.key}`;

          if (field.kind === "boolean") {
            return (
              <div key={field.key} className="rounded-lg border border-ink-700 bg-ink-880/50 p-3.5">
                <Checkbox
                  id={id}
                  name={field.key}
                  defaultChecked={Boolean(field.value)}
                  label={
                    <>
                      <span className="font-medium text-fg">{field.label}</span>
                      {field.description ? (
                        <span className="mt-0.5 block text-[11.5px] text-fg-subtle">
                          {field.description}
                        </span>
                      ) : null}
                    </>
                  }
                />
              </div>
            );
          }

          return (
            <Field
              key={field.key}
              label={field.label}
              htmlFor={id}
              hint={field.description}
              error={state.fieldErrors?.[field.key]}
            >
              {field.kind === "textarea" ? (
                <Textarea id={id} name={field.key} rows={4} defaultValue={String(field.value)} />
              ) : field.kind === "number" ? (
                <Input id={id} name={field.key} type="number" defaultValue={Number(field.value)} />
              ) : field.kind === "list" ? (
                <Input
                  id={id}
                  name={field.key}
                  defaultValue={(field.value as string[]).join(", ")}
                  placeholder="Comma separated"
                />
              ) : field.kind === "select" ? (
                <Select id={id} name={field.key} defaultValue={String(field.value)}>
                  {(field.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input id={id} name={field.key} defaultValue={String(field.value)} />
              )}
            </Field>
          );
        })}
      </div>

      <SubmitButton size="sm" pendingLabel="Saving…">
        Save {title.toLowerCase()}
      </SubmitButton>
    </form>
  );
}
