"use client";

import * as React from "react";
import { useActionState } from "react";

import { SubmitButton } from "@/components/ui/interactive";
import { Checkbox, Field, FormError, Input, Textarea } from "@/components/ui/form";
import { InfoNote } from "@/components/ui/feedback";
import { savePackageAction } from "@/server/actions/admin";
import { idleState } from "@/lib/action-state";

export interface PackageFormValues {
  id?: string;
  name: string;
  slug: string;
  minimumCapital: string;
  returnPercentage: string;
  durationDays: number;
  description: string;
  badge: string;
  displayOrder: number;
  isActive: boolean;
}

const EMPTY: PackageFormValues = {
  name: "",
  slug: "",
  minimumCapital: "",
  returnPercentage: "",
  durationDays: 30,
  description: "",
  badge: "",
  displayOrder: 0,
  isActive: true,
};

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function PackageForm({ values = EMPTY }: { values?: PackageFormValues }) {
  const [state, formAction] = useActionState(savePackageAction, idleState);
  const [capital, setCapital] = React.useState(values.minimumCapital);
  const [percentage, setPercentage] = React.useState(values.returnPercentage);
  const error = (name: string) => state.fieldErrors?.[name];

  // The maturity amount is derived, never typed — it cannot drift from the rate.
  const preview = React.useMemo(() => {
    const principal = Number(capital);
    const rate = Number(percentage);
    if (!Number.isFinite(principal) || !Number.isFinite(rate) || principal <= 0) return null;
    const maturity = principal + (principal * rate) / 100;
    return { maturity, profit: maturity - principal };
  }, [capital, percentage]);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <FormError>{state.status === "error" ? state.message : null}</FormError>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" required error={error("name")}>
          <Input id="name" name="name" defaultValue={values.name} required />
        </Field>
        <Field
          label="Slug"
          htmlFor="slug"
          required
          hint="Used in URLs, e.g. /packages/gold"
          error={error("slug")}
        >
          <Input id="slug" name="slug" defaultValue={values.slug} required />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Capital (USD)"
          htmlFor="minimumCapital"
          required
          error={error("minimumCapital")}
        >
          <Input
            id="minimumCapital"
            name="minimumCapital"
            inputMode="decimal"
            value={capital}
            onChange={(event) => setCapital(event.target.value)}
            placeholder="500.00"
            required
          />
        </Field>
        <Field
          label="Return (%)"
          htmlFor="returnPercentage"
          required
          error={error("returnPercentage")}
        >
          <Input
            id="returnPercentage"
            name="returnPercentage"
            inputMode="decimal"
            value={percentage}
            onChange={(event) => setPercentage(event.target.value)}
            placeholder="30"
            required
          />
        </Field>
        <Field
          label="Duration (days)"
          htmlFor="durationDays"
          required
          error={error("durationDays")}
        >
          <Input
            id="durationDays"
            name="durationDays"
            type="number"
            min={1}
            max={3650}
            defaultValue={values.durationDays}
            required
          />
        </Field>
      </div>

      <div className="rounded-xl border border-ink-700 bg-ink-880/50 p-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
          Calculated maturity amount
        </p>
        <p className="mt-1.5 text-2xl font-semibold tracking-tight text-accent-300">
          {preview ? usd.format(preview.maturity) : "—"}
        </p>
        <p className="mt-1 text-[12px] text-fg-muted">
          {preview
            ? `${usd.format(preview.profit)} above capital. Derived from capital and return, never entered by hand.`
            : "Enter a capital amount and return percentage to see the maturity value."}
        </p>
      </div>

      <Field label="Description" htmlFor="description" required error={error("description")}>
        <Textarea id="description" name="description" rows={3} defaultValue={values.description} required />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Badge"
          htmlFor="badge"
          hint="Optional label shown on the card, e.g. Most popular"
          error={error("badge")}
        >
          <Input id="badge" name="badge" defaultValue={values.badge} />
        </Field>
        <Field
          label="Display order"
          htmlFor="displayOrder"
          required
          hint="Lower numbers appear first."
          error={error("displayOrder")}
        >
          <Input
            id="displayOrder"
            name="displayOrder"
            type="number"
            min={0}
            max={999}
            defaultValue={values.displayOrder}
            required
          />
        </Field>
      </div>

      <div className="rounded-lg border border-ink-700 bg-ink-880/50 p-3.5">
        <Checkbox
          id="isActive"
          name="isActive"
          defaultChecked={values.isActive}
          label="Active — visible on the public site and available for new subscriptions"
        />
      </div>

      <InfoNote tone="warning">
        Editing a package changes what new subscribers see. It never alters existing investments:
        each one carries the capital, percentage, maturity amount and term recorded at the moment
        the investor subscribed.
      </InfoNote>

      <SubmitButton pendingLabel="Saving…">
        {values.id ? "Save package" : "Create package"}
      </SubmitButton>
    </form>
  );
}
