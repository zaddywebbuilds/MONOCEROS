import * as React from "react";

import { cn } from "@/lib/utils";

const controlClass =
  "w-full rounded-lg border border-ink-600 bg-ink-900/70 px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-subtle transition-colors focus:border-accent-600 focus:bg-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/25 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-status-rejected/70";

export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn("text-[13px] font-medium text-fg", className)} {...props}>
      {children}
      {required ? (
        <span className="ml-1 text-status-rejected" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, "h-11", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClass, "min-h-28 resize-y", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlClass, "h-11 cursor-pointer pr-9", className)} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({
  className,
  label,
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        className={cn(
          "mt-0.5 size-4 shrink-0 cursor-pointer rounded border-ink-500 bg-ink-900 text-accent-500 accent-accent-500 focus-visible:ring-2 focus-visible:ring-accent-500/30",
          className,
        )}
        {...props}
      />
      <label htmlFor={id} className="cursor-pointer text-[13px] leading-relaxed text-fg-muted">
        {label}
      </label>
    </div>
  );
}

/** Label + control + hint + error, wired for accessibility. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  const hintId = htmlFor ? `${htmlFor}-hint` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      ) : null}
      {children}
      {hint && !error ? (
        <p id={hintId} className="text-xs leading-relaxed text-fg-subtle">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-status-rejected">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-status-rejected/30 bg-status-rejected/10 px-3.5 py-3 text-[13px] leading-relaxed text-status-rejected"
    >
      {children}
    </div>
  );
}

export function FormSuccess({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="status"
      className="rounded-lg border border-accent-700/40 bg-accent-900/25 px-3.5 py-3 text-[13px] leading-relaxed text-accent-200"
    >
      {children}
    </div>
  );
}

export function Fieldset({
  legend,
  description,
  children,
  className,
}: {
  legend: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("space-y-4", className)}>
      <legend className="sr-only">{legend}</legend>
      {description ? <p className="text-sm text-fg-muted">{description}</p> : null}
      {children}
    </fieldset>
  );
}
