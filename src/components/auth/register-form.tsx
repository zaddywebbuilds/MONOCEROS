"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/interactive";
import { Checkbox, Field, FormError, Input, Label } from "@/components/ui/form";
import { PasswordStrength } from "@/components/auth/password-strength";
import { registerAction } from "@/server/actions/auth";
import { idleState } from "@/lib/action-state";

const STEPS = ["Your details", "Security"] as const;

/** Client-side gate so a user is not sent to step 2 with an empty step 1. */
function step1Missing(values: Record<string, string>): string[] {
  return ["firstName", "surname", "dateOfBirth", "phone", "email"].filter(
    (key) => !values[key]?.trim(),
  );
}

export function RegisterForm({ packageSlug }: { packageSlug?: string }) {
  const [state, formAction] = useActionState(registerAction, idleState);
  const [step, setStep] = React.useState(0);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  const fieldError = (name: string) => state.fieldErrors?.[name];

  // If the server rejected a step-1 field, bring the user back to step 1.
  React.useEffect(() => {
    if (!state.fieldErrors) return;
    const step1Keys = ["firstName", "surname", "otherName", "dateOfBirth", "phone", "email"];
    if (step1Keys.some((key) => state.fieldErrors?.[key])) setStep(0);
  }, [state.fieldErrors]);

  const set = (name: string) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [name]: event.target.value }));

  const missing = step1Missing(values);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {packageSlug ? <input type="hidden" name="package" value={packageSlug} /> : null}

      {/* Step indicator */}
      <ol className="flex items-center gap-3" aria-label="Registration progress">
        {STEPS.map((label, index) => (
          <li key={label} className="flex flex-1 items-center gap-2.5">
            <span
              aria-current={index === step ? "step" : undefined}
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full border text-[12px] font-semibold transition-colors",
                index < step
                  ? "border-accent-600 bg-accent-600 text-ink-950"
                  : index === step
                    ? "border-accent-500 text-accent-300"
                    : "border-ink-600 text-fg-subtle",
              )}
            >
              {index + 1}
            </span>
            <span
              className={cn(
                "text-[12.5px] font-medium",
                index === step ? "text-fg" : "text-fg-subtle",
              )}
            >
              {label}
            </span>
            {index < STEPS.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "hidden h-px flex-1 sm:block",
                  index < step ? "bg-accent-700" : "bg-ink-700",
                )}
              />
            ) : null}
          </li>
        ))}
      </ol>

      <FormError>{state.status === "error" ? state.message : null}</FormError>

      {/* -------------------------------------------------- Step 1 */}
      <div className={cn("space-y-4", step !== 0 && "hidden")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="firstName" required error={fieldError("firstName")}>
            <Input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              value={values.firstName ?? ""}
              onChange={set("firstName")}
              aria-invalid={Boolean(fieldError("firstName"))}
              required
            />
          </Field>
          <Field label="Surname" htmlFor="surname" required error={fieldError("surname")}>
            <Input
              id="surname"
              name="surname"
              autoComplete="family-name"
              value={values.surname ?? ""}
              onChange={set("surname")}
              aria-invalid={Boolean(fieldError("surname"))}
              required
            />
          </Field>
        </div>

        <Field
          label="Other name"
          htmlFor="otherName"
          hint="Optional"
          error={fieldError("otherName")}
        >
          <Input
            id="otherName"
            name="otherName"
            autoComplete="additional-name"
            value={values.otherName ?? ""}
            onChange={set("otherName")}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Date of birth"
            htmlFor="dateOfBirth"
            required
            hint="You must be 18 or older"
            error={fieldError("dateOfBirth")}
          >
            <Input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              autoComplete="bday"
              max={new Date().toISOString().slice(0, 10)}
              value={values.dateOfBirth ?? ""}
              onChange={set("dateOfBirth")}
              aria-invalid={Boolean(fieldError("dateOfBirth"))}
              required
            />
          </Field>
          <Field
            label="Mobile number"
            htmlFor="phone"
            required
            hint="Nigerian mobile, e.g. 0801 234 5678"
            error={fieldError("phone")}
          >
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0801 234 5678"
              value={values.phone ?? ""}
              onChange={set("phone")}
              aria-invalid={Boolean(fieldError("phone"))}
              required
            />
          </Field>
        </div>

        <Field label="Email address" htmlFor="email" required error={fieldError("email")}>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={values.email ?? ""}
            onChange={set("email")}
            aria-invalid={Boolean(fieldError("email"))}
            required
          />
        </Field>

        <p className="rounded-lg border border-ink-700 bg-ink-880/50 px-3.5 py-3 text-[12px] leading-relaxed text-fg-subtle">
          Your National Identification Number is not collected here. You will provide it during
          identity verification, after your account is created.
        </p>

        {touched && missing.length > 0 ? (
          <p role="alert" className="text-xs font-medium text-status-rejected">
            Complete every required field before continuing.
          </p>
        ) : null}

        <Button
          type="button"
          block
          onClick={() => {
            setTouched(true);
            if (missing.length === 0) setStep(1);
          }}
        >
          Continue
          <ArrowRight />
        </Button>
      </div>

      {/* -------------------------------------------------- Step 2 */}
      <div className={cn("space-y-4", step !== 1 && "hidden")}>
        <Field label="Password" htmlFor="password" required error={fieldError("password")}>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className="pr-11"
              value={values.password ?? ""}
              onChange={set("password")}
              aria-invalid={Boolean(fieldError("password"))}
              aria-describedby="password-policy"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle transition-colors hover:text-fg"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>

        <div id="password-policy">
          <PasswordStrength value={values.password ?? ""} />
        </div>

        <Field
          label="Confirm password"
          htmlFor="confirmPassword"
          required
          error={fieldError("confirmPassword")}
        >
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={values.confirmPassword ?? ""}
            onChange={set("confirmPassword")}
            aria-invalid={Boolean(fieldError("confirmPassword"))}
            required
          />
        </Field>

        <div className="rounded-lg border border-ink-700 bg-ink-880/50 p-3.5">
          <Checkbox
            id="acceptedTerms"
            name="acceptedTerms"
            required
            label={
              <>
                I agree to the{" "}
                <Link href="/terms" className="text-accent-300 underline underline-offset-2">
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-accent-300 underline underline-offset-2">
                  Privacy Policy
                </Link>
                , and I have read the{" "}
                <Link
                  href="/risk-disclosure"
                  className="text-accent-300 underline underline-offset-2"
                >
                  Risk Disclosure
                </Link>
                .
              </>
            }
          />
          {fieldError("acceptedTerms") ? (
            <p role="alert" className="mt-2 text-xs font-medium text-status-rejected">
              {fieldError("acceptedTerms")}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <SubmitButton block pendingLabel="Creating account…">
            Create account
          </SubmitButton>
          <Button type="button" variant="secondary" block onClick={() => setStep(0)}>
            <ArrowLeft />
            Back
          </Button>
        </div>
      </div>

      {/* Step 1 stays mounted (only visually hidden) so its values post with the form. */}
      <p className="text-center text-[13px] text-fg-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent-300 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
