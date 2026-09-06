import * as React from "react";

import { cn } from "@/lib/utils";

export function Card({
  className,
  interactive,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "surface relative overflow-hidden",
        interactive &&
          "transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-700/60",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 p-5 sm:p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-semibold tracking-tight text-fg sm:text-lg", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-relaxed text-fg-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0 sm:p-6 sm:pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 border-t border-ink-700/60 p-5 sm:p-6",
        className,
      )}
      {...props}
    />
  );
}

/** Dashboard summary tile: label, value, optional hint and icon. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "accent" | "gold";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface group relative p-4 sm:p-5",
        tone === "accent" && "border-accent-800/70",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full blur-2xl transition-opacity duration-500",
          tone === "accent"
            ? "bg-accent-500/20"
            : tone === "gold"
              ? "bg-gold-400/15"
              : "bg-ink-500/20",
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
            {label}
          </p>
          <p className="mt-2 truncate text-xl font-semibold tracking-tight text-fg sm:text-2xl">
            {value}
          </p>
          {hint ? <p className="mt-1.5 text-xs text-fg-muted">{hint}</p> : null}
        </div>
        {icon ? (
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-lg border",
              tone === "accent"
                ? "border-accent-800/70 bg-accent-900/40 text-accent-300"
                : tone === "gold"
                  ? "border-gold-600/40 bg-gold-600/10 text-gold-300"
                  : "border-ink-600 bg-ink-800 text-fg-muted",
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
    </div>
  );
}
