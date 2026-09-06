"use client";

import * as React from "react";
import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { evaluatePassword } from "@/lib/auth/password";

/**
 * Live password policy meter.
 *
 * It calls the same `evaluatePassword` helper the server-side Zod schema
 * mirrors, so the requirements shown here cannot drift from the ones enforced.
 */
export function PasswordStrength({ value }: { value: string }) {
  const result = React.useMemo(() => evaluatePassword(value), [value]);

  if (!value) {
    return (
      <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {result.checks.map((check) => (
          <li key={check.label} className="flex items-center gap-1.5 text-[11.5px] text-fg-subtle">
            <span aria-hidden className="size-3.5 rounded-full border border-ink-600" />
            {check.label}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="mt-2.5">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden>
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                index < result.score
                  ? result.score <= 1
                    ? "bg-status-rejected"
                    : result.score === 2
                      ? "bg-status-pending"
                      : "bg-accent-500"
                  : "bg-ink-700",
              )}
            />
          ))}
        </div>
        <span
          className={cn(
            "text-[11.5px] font-medium",
            result.score <= 1
              ? "text-status-rejected"
              : result.score === 2
                ? "text-status-pending"
                : "text-accent-300",
          )}
        >
          {result.label}
        </span>
      </div>

      <ul className="mt-2 grid gap-1.5 sm:grid-cols-2" aria-live="polite">
        {result.checks.map((check) => (
          <li
            key={check.label}
            className={cn(
              "flex items-center gap-1.5 text-[11.5px]",
              check.passed ? "text-accent-300" : "text-fg-subtle",
            )}
          >
            {check.passed ? (
              <Check className="size-3.5" aria-hidden />
            ) : (
              <X className="size-3.5 opacity-50" aria-hidden />
            )}
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
