import * as React from "react";
import { CalendarCheck, Clock, MoveRight } from "lucide-react";

import { Countdown } from "@/components/countdown";
import { CycleVisual } from "@/components/visuals/illustrations";
import { GlowOrbs, SectionEyebrow } from "@/components/visuals/decor";
import { countdownTo, formatCycleLabel, formatBusinessDateTime, WEEKDAY_NAMES } from "@/lib/time";
import type { Weekday } from "@/lib/time";

export function CycleSection({
  cycleStart,
  weekday,
  time,
  durationDays,
}: {
  cycleStart: Date;
  weekday: Weekday;
  time: string;
  durationDays: number;
}) {
  const dayName = WEEKDAY_NAMES[weekday] ?? "Friday";
  const initial = countdownTo(cycleStart);

  return (
    <section id="cycles" className="relative overflow-hidden py-16 sm:py-20 lg:py-24">
      <GlowOrbs variant="section" />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-14">
          <div>
            <SectionEyebrow>Weekly cycles</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
              New investment cycles begin every {dayName}
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-fg-muted">
              A cycle opens every {dayName} at {time} West Africa Time. Subscriptions whose payment
              is approved before that moment join the cycle that is about to open. Subscriptions
              approved at or after it are queued for the following {dayName}.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                {
                  icon: CalendarCheck,
                  text: `Approved before ${dayName} ${time} WAT — joins the cycle opening next.`,
                },
                {
                  icon: Clock,
                  text: `Approved at or after ${dayName} ${time} WAT — waits for the following ${dayName}.`,
                },
                {
                  icon: MoveRight,
                  text: `Once activated, the ${durationDays}-day term runs from the cycle opening timestamp.`,
                },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-3">
                  <item.icon className="mt-0.5 size-4 shrink-0 text-accent-400" aria-hidden />
                  <span className="text-[13.5px] leading-relaxed text-fg-muted">{item.text}</span>
                </li>
              ))}
            </ul>

            <div className="surface mt-8 p-5 sm:p-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
                Next trading cycle
              </p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-fg sm:text-2xl">
                {formatCycleLabel(cycleStart)}
              </p>
              <p className="mt-1 text-[12.5px] text-fg-subtle">
                Opens {formatBusinessDateTime(cycleStart)}
              </p>

              <Countdown
                target={cycleStart.toISOString()}
                initial={{
                  days: initial.days,
                  hours: initial.hours,
                  minutes: initial.minutes,
                  seconds: initial.seconds,
                }}
                variant="hero"
                className="mt-5"
                expiredLabel="This cycle is opening now"
              />
            </div>
          </div>

          <div className="relative">
            <CycleVisual />
          </div>
        </div>
      </div>
    </section>
  );
}
