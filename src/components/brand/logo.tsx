import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Monoceros mark.
 *
 * Monoceros is the "unicorn" constellation, so the mark is a constellation
 * figure: four stars linked into an ascending line with a single horn stroke.
 * Drawn as SVG so it stays sharp at every size and inherits currentColor.
 */
export function LogoMark({ className, id = "logo" }: { className?: string; id?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
      className={cn("size-9", className)}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0e1525" />
          <stop offset="100%" stopColor="#050a12" />
        </linearGradient>
        <linearGradient id={`${id}-stroke`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#0ba883" />
          <stop offset="55%" stopColor="#2fd4a7" />
          <stop offset="100%" stopColor="#dcb96f" />
        </linearGradient>
      </defs>

      <rect
        x="0.75"
        y="0.75"
        width="38.5"
        height="38.5"
        rx="11"
        fill={`url(#${id}-bg)`}
        stroke="#1f2c48"
        strokeWidth="1.5"
      />

      {/* Constellation links */}
      <path
        d="M10 28.5 L16.5 20.5 L23 24.5 L30 10"
        stroke={`url(#${id}-stroke)`}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* The horn */}
      <path
        d="M25.5 15.5 L30 10 L30.5 16"
        stroke="#dcb96f"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />

      {/* Stars */}
      <circle cx="10" cy="28.5" r="2.1" fill="#0b111e" stroke="#2fd4a7" strokeWidth="1.5" />
      <circle cx="16.5" cy="20.5" r="1.7" fill="#2fd4a7" />
      <circle cx="23" cy="24.5" r="1.7" fill="#12c99b" />
      <circle cx="30" cy="10" r="2.4" fill="#0b111e" stroke="#dcb96f" strokeWidth="1.6" />
    </svg>
  );
}

export function Logo({
  className,
  showWordmark = true,
  size = "md",
}: {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={size === "sm" ? "size-7" : size === "lg" ? "size-11" : "size-9"} />
      {showWordmark ? (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-semibold tracking-[-0.02em] text-fg",
              size === "sm" ? "text-[15px]" : size === "lg" ? "text-xl" : "text-[17px]",
            )}
          >
            Monoceros
          </span>
          {size !== "sm" ? (
            <span className="mt-1 text-[9px] uppercase tracking-[0.22em] text-fg-subtle">
              Investment Management
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
