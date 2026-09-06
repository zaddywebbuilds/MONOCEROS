"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { countdownTo } from "@/lib/time";

/**
 * Live countdown.
 *
 * The target is an absolute server-issued instant; the component only
 * subtracts the current time from it. Nothing is decremented or stored, so a
 * reload, a restart or a wrong device clock cannot corrupt an investment term.
 */

interface CountdownProps {
  /** ISO-8601 target instant, produced on the server. */
  target: string;
  /** Server-rendered initial value, so first paint matches the server. */
  initial?: { days: number; hours: number; minutes: number; seconds: number };
  variant?: "hero" | "compact" | "inline";
  showSeconds?: boolean;
  className?: string;
  expiredLabel?: string;
}

export function Countdown({
  target,
  initial,
  variant = "compact",
  showSeconds = true,
  className,
  expiredLabel = "Cycle opening",
}: CountdownProps) {
  const [value, setValue] = React.useState(() =>
    initial
      ? { ...initial, expired: false, totalMs: 1 }
      : countdownTo(target),
  );

  React.useEffect(() => {
    const tick = () => setValue(countdownTo(target));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  if (value.expired) {
    return (
      <p className={cn("text-sm font-medium text-accent-300", className)} aria-live="polite">
        {expiredLabel}
      </p>
    );
  }

  const units = [
    { label: value.days === 1 ? "Day" : "Days", value: value.days },
    { label: value.hours === 1 ? "Hour" : "Hours", value: value.hours },
    { label: value.minutes === 1 ? "Minute" : "Minutes", value: value.minutes },
    ...(showSeconds
      ? [{ label: value.seconds === 1 ? "Second" : "Seconds", value: value.seconds }]
      : []),
  ];

  if (variant === "inline") {
    return (
      <span className={cn("tabular-nums", className)}>
        {value.days}d {String(value.hours).padStart(2, "0")}h{" "}
        {String(value.minutes).padStart(2, "0")}m
      </span>
    );
  }

  return (
    <div
      className={cn("flex flex-wrap gap-2 sm:gap-3", className)}
      role="timer"
      aria-live="off"
      aria-label="Time until the next investment cycle opens"
    >
      {units.map((unit) => (
        <div
          key={unit.label}
          className={cn(
            "flex min-w-[68px] flex-1 flex-col items-center rounded-xl border border-ink-600 bg-ink-880/70 px-2 py-3 sm:min-w-[84px]",
            variant === "hero" && "sm:px-4 sm:py-4",
          )}
        >
          <span
            className={cn(
              "font-semibold tabular-nums tracking-tight text-fg",
              variant === "hero" ? "text-2xl sm:text-3xl" : "text-xl",
            )}
          >
            {String(unit.value).padStart(2, "0")}
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
            {unit.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Compact "23 Days 14 Hours" label for tables and cards. */
export function RemainingLabel({
  target,
  className,
  maturedLabel = "Matured",
}: {
  target: string;
  className?: string;
  maturedLabel?: string;
}) {
  const [value, setValue] = React.useState(() => countdownTo(target));

  React.useEffect(() => {
    const tick = () => setValue(countdownTo(target));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [target]);

  if (value.expired) {
    return <span className={cn("text-accent-300", className)}>{maturedLabel}</span>;
  }

  return (
    <span className={cn("tabular-nums", className)}>
      {value.days > 0 ? `${value.days}d ` : ""}
      {String(value.hours).padStart(2, "0")}h {String(value.minutes).padStart(2, "0")}m
    </span>
  );
}
