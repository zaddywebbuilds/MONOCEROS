import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { TIMELINE_STEPS, timelineIndexFor } from "@/lib/domain/investment-status";
import type { InvestmentStatus } from "@prisma/client";

/**
 * Investment progress timeline.
 * Mirrors the state machine so a user can always see where they are and what
 * has not happened yet.
 */
export function InvestmentTimeline({
  status,
  className,
}: {
  status: InvestmentStatus;
  className?: string;
}) {
  const current = timelineIndexFor(status);
  const rejected = status === "PAYMENT_REJECTED";

  return (
    <ol className={cn("space-y-0", className)} aria-label="Investment progress">
      {TIMELINE_STEPS.map((step, index) => {
        const done = index < current || (index === current && !rejected);
        const active = index === current;
        const last = index === TIMELINE_STEPS.length - 1;

        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                aria-hidden
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border text-[10px] font-semibold transition-colors",
                  rejected && active
                    ? "border-status-rejected bg-status-rejected/15 text-status-rejected"
                    : done
                      ? "border-accent-600 bg-accent-600 text-ink-950"
                      : "border-ink-600 text-fg-subtle",
                )}
              >
                {done && !(rejected && active) ? <Check className="size-3" /> : index + 1}
              </span>
              {!last ? (
                <span
                  aria-hidden
                  className={cn(
                    "my-1 w-px flex-1",
                    index < current ? "bg-accent-700" : "bg-ink-700",
                  )}
                />
              ) : null}
            </div>

            <div className={cn("min-w-0 pb-5", last && "pb-0")}>
              <p
                className={cn(
                  "text-[13px] font-medium",
                  active ? "text-fg" : done ? "text-fg-muted" : "text-fg-subtle",
                )}
              >
                {step}
              </p>
              {active ? (
                <p
                  className={cn(
                    "mt-0.5 text-[11.5px]",
                    rejected ? "text-status-rejected" : "text-accent-300",
                  )}
                >
                  {rejected ? "Needs your attention" : "Current stage"}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
