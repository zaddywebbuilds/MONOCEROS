import * as React from "react";

import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-lg bg-ink-750/70", className)}
      {...props}
    />
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2.5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-10" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14" />
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  children,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-600 bg-ink-880/40 px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="mb-4 grid size-12 place-items-center rounded-xl border border-ink-600 bg-ink-800 text-fg-muted">
          {icon}
        </span>
      ) : null}
      <p className="text-[15px] font-medium text-fg">{title}</p>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-fg-muted">{description}</p>
      ) : null}
      {actionLabel && actionHref ? (
        <ButtonLink href={actionHref} size="sm" className="mt-5">
          {actionLabel}
        </ButtonLink>
      ) : null}
      {children}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  retry,
}: {
  title?: string;
  description?: string;
  retry?: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-status-rejected/25 bg-status-rejected/[0.06] px-5 py-6 text-center"
    >
      <p className="text-sm font-medium text-status-rejected">{title}</p>
      {description ? <p className="mt-2 text-sm text-fg-muted">{description}</p> : null}
      {retry ? <div className="mt-4 flex justify-center">{retry}</div> : null}
    </div>
  );
}

export function Progress({
  value,
  label,
  className,
  tone = "accent",
}: {
  value: number;
  label?: string;
  className?: string;
  tone?: "accent" | "gold";
}) {
  const pct = Math.min(100, Math.max(0, Math.round(value * 100)));
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <div className="flex items-center justify-between text-[11px] text-fg-subtle">
          <span>{label}</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className="h-1.5 w-full overflow-hidden rounded-full bg-ink-750"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700 ease-out",
            tone === "accent"
              ? "bg-gradient-to-r from-accent-600 to-accent-400"
              : "bg-gradient-to-r from-gold-600 to-gold-300",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function InfoNote({
  children,
  tone = "info",
  className,
}: {
  children: React.ReactNode;
  tone?: "info" | "warning" | "gold";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3.5 py-3 text-[13px] leading-relaxed",
        tone === "info" && "border-ink-600 bg-ink-850/70 text-fg-muted",
        tone === "warning" &&
          "border-status-pending/30 bg-status-pending/[0.07] text-status-pending",
        tone === "gold" && "border-gold-600/30 bg-gold-600/[0.07] text-gold-200",
        className,
      )}
    >
      {children}
    </div>
  );
}
