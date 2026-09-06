"use client";

import * as React from "react";
import { useActionState } from "react";

import { SubmitButton } from "@/components/ui/interactive";
import { Field, FormError, FormSuccess, Input, Select } from "@/components/ui/form";
import { PasswordStrength } from "@/components/auth/password-strength";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateProfileAction, updateWithdrawalWalletAction } from "@/server/actions/account";
import { changePasswordAction, revokeOtherSessionsAction } from "@/server/actions/auth";
import { idleState } from "@/lib/action-state";

export function ProfileForm({ phone }: { phone: string }) {
  const [state, formAction] = useActionState(updateProfileAction, idleState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError>{state.status === "error" ? state.message : null}</FormError>
      <FormSuccess>{state.status === "success" ? state.message : null}</FormSuccess>

      <Field
        label="Mobile number"
        htmlFor="phone"
        required
        hint="Nigerian mobile number."
        error={state.fieldErrors?.phone}
      >
        <Input id="phone" name="phone" type="tel" defaultValue={phone} required />
      </Field>

      <SubmitButton size="sm" pendingLabel="Saving…">
        Save changes
      </SubmitButton>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, idleState);
  const [password, setPassword] = React.useState("");
  const error = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError>{state.status === "error" ? state.message : null}</FormError>
      <FormSuccess>{state.status === "success" ? state.message : null}</FormSuccess>

      <Field
        label="Current password"
        htmlFor="currentPassword"
        required
        error={error("currentPassword")}
      >
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Field label="New password" htmlFor="newPassword" required error={error("password")}>
        <Input
          id="newPassword"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
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
        />
      </Field>

      <SubmitButton size="sm" pendingLabel="Updating…">
        Change password
      </SubmitButton>
    </form>
  );
}

export function WithdrawalWalletForm({
  networks,
  savedAddress,
  savedNetwork,
}: {
  networks: string[];
  savedAddress: string | null;
  savedNetwork: string | null;
}) {
  const [state, formAction] = useActionState(updateWithdrawalWalletAction, idleState);
  const error = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError>{state.status === "error" ? state.message : null}</FormError>
      <FormSuccess>{state.status === "success" ? state.message : null}</FormSuccess>

      <Field label="Network" htmlFor="walletNetwork" required error={error("walletNetwork")}>
        <Select
          id="walletNetwork"
          name="walletNetwork"
          defaultValue={savedNetwork ?? networks[0]}
          required
        >
          {networks.map((network) => (
            <option key={network} value={network}>
              {network}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Wallet address"
        htmlFor="walletAddress"
        required
        hint="Used as the default destination when you request a withdrawal."
        error={error("walletAddress")}
      >
        <Input
          id="walletAddress"
          name="walletAddress"
          defaultValue={savedAddress ?? ""}
          spellCheck={false}
          autoComplete="off"
          className="font-mono text-[12.5px]"
          required
        />
      </Field>

      <Field
        label="Confirm your password"
        htmlFor="walletPassword"
        required
        hint="Changing this address is a security-sensitive action, so we ask for your password and email you a confirmation."
        error={error("password")}
      >
        <Input
          id="walletPassword"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <SubmitButton size="sm" pendingLabel="Saving…">
        Save withdrawal wallet
      </SubmitButton>
    </form>
  );
}

export function RevokeSessionsButton() {
  const [pending, startTransition] = React.useTransition();
  const { toast } = useToast();

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await revokeOtherSessionsAction();
          toast({
            title: result.status === "success" ? "Sessions" : "Could not sign out sessions",
            description: result.message ?? undefined,
            tone: result.status === "success" ? "success" : "error",
          });
        })
      }
    >
      {pending ? "Working…" : "Sign out other devices"}
    </Button>
  );
}
