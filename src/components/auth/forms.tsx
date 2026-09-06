"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { SubmitButton } from "@/components/ui/interactive";
import { Field, FormError, FormSuccess, Input } from "@/components/ui/form";
import { PasswordStrength } from "@/components/auth/password-strength";
import {
  adminLoginAction,
  forgotPasswordAction,
  loginAction,
  resetPasswordAction,
} from "@/server/actions/auth";
import { idleState } from "@/lib/action-state";

export function LoginForm({
  next,
  admin = false,
  notice,
}: {
  next?: string;
  admin?: boolean;
  notice?: string;
}) {
  const [state, formAction] = useActionState(admin ? adminLoginAction : loginAction, idleState);
  const [show, setShow] = React.useState(false);
  const error = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {notice ? <FormSuccess>{notice}</FormSuccess> : null}
      <FormError>{state.status === "error" ? state.message : null}</FormError>

      <Field label="Email address" htmlFor="email" required error={error("email")}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          required
          aria-invalid={Boolean(error("email"))}
        />
      </Field>

      <Field label="Password" htmlFor="password" required error={error("password")}>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            className="pr-11"
            required
            aria-invalid={Boolean(error("password"))}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle transition-colors hover:text-fg"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>

      {!admin ? (
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-[12.5px] text-fg-muted transition-colors hover:text-accent-300"
          >
            Forgot your password?
          </Link>
        </div>
      ) : null}

      <SubmitButton block pendingLabel="Signing in…">
        Sign in
      </SubmitButton>

      {!admin ? (
        <p className="pt-1 text-center text-[13px] text-fg-muted">
          New to Monoceros?{" "}
          <Link href="/register" className="font-medium text-accent-300 hover:underline">
            Create an account
          </Link>
        </p>
      ) : null}
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, idleState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError>{state.status === "error" ? state.message : null}</FormError>
      <FormSuccess>{state.status === "success" ? state.message : null}</FormSuccess>

      {state.status !== "success" ? (
        <>
          <Field
            label="Email address"
            htmlFor="email"
            required
            hint="We will send a reset link if an account exists for this address."
            error={state.fieldErrors?.email}
          >
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              required
            />
          </Field>
          <SubmitButton block pendingLabel="Sending…">
            Send reset link
          </SubmitButton>
        </>
      ) : null}

      <p className="pt-1 text-center text-[13px] text-fg-muted">
        <Link href="/login" className="font-medium text-accent-300 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, idleState);
  const [password, setPassword] = React.useState("");
  const error = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />

      <FormError>{state.status === "error" ? state.message : null}</FormError>

      <Field label="New password" htmlFor="password" required error={error("password")}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          aria-invalid={Boolean(error("password"))}
        />
      </Field>

      <PasswordStrength value={password} />

      <Field
        label="Confirm new password"
        htmlFor="confirmPassword"
        required
        error={error("confirmPassword")}
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(error("confirmPassword"))}
        />
      </Field>

      <SubmitButton block pendingLabel="Updating…">
        Set new password
      </SubmitButton>

      <p className="text-center text-[12px] leading-relaxed text-fg-subtle">
        Changing your password signs out every other device.
      </p>
    </form>
  );
}
