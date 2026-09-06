import * as React from "react";

import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/domain/investment-status";

const TONE_CLASS: Record<StatusTone, string> = {
  pending: "border-status-pending/35 bg-status-pending/12 text-status-pending",
  active: "border-accent-600/40 bg-accent-900/40 text-accent-300",
  matured: "border-status-matured/35 bg-status-matured/12 text-status-matured",
  rejected: "border-status-rejected/35 bg-status-rejected/12 text-status-rejected",
  neutral: "border-ink-600 bg-ink-800 text-fg-muted",
};

export function StatusPill({
  tone = "neutral",
  children,
  className,
  dot = true,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full bg-current",
            tone === "active" && "animate-shimmer",
          )}
        />
      ) : null}
      {children}
    </span>
  );
}

export function Badge({
  children,
  className,
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "accent" | "gold" | "outline";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]",
        variant === "default" && "bg-ink-750 text-fg-muted",
        variant === "accent" && "bg-accent-900/60 text-accent-300",
        variant === "gold" && "bg-gold-600/15 text-gold-300",
        variant === "outline" && "border border-ink-600 text-fg-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
