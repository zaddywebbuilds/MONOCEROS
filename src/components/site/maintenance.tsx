import * as React from "react";
import { Wrench } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { GlowOrbs, GridBackdrop } from "@/components/visuals/decor";

export function MaintenanceNotice({ message }: { message: string }) {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4">
      <GridBackdrop />
      <GlowOrbs variant="section" />
      <div className="relative w-full max-w-md text-center">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="surface mt-8 p-8">
          <span className="mx-auto grid size-12 place-items-center rounded-xl border border-gold-600/40 bg-gold-600/10 text-gold-300">
            <Wrench className="size-5" />
          </span>
          <h1 className="mt-5 text-lg font-semibold tracking-tight text-fg">
            Scheduled maintenance
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">{message}</p>
        </div>
        <p className="mt-6 text-xs text-fg-subtle">
          Existing investment terms are unaffected — maturity is calculated from stored timestamps.
        </p>
      </div>
    </div>
  );
}
