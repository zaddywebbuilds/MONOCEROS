import type { Metadata } from "next";
import Link from "next/link";
import { CalendarRange } from "lucide-react";

import { DashboardPage, PageTitle, Section } from "@/components/dashboard/page-parts";
import { Card, StatCard } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState, InfoNote } from "@/components/ui/feedback";
import { Countdown } from "@/components/countdown";
import { ManualCycleForm } from "@/components/admin/review-forms";
import {
  Table,
  TableScroll,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import { countdownTo, formatBusinessDateTime, formatCycleLabel, WEEKDAY_NAMES } from "@/lib/time";
import { getCycleSummaries } from "@/server/queries/admin";
import { getUpcomingCycleSummary, ensureCycle } from "@/server/services/cycles";
import { getSettings } from "@/lib/settings";
import type { Weekday } from "@/lib/time";

export const metadata: Metadata = { title: "Investment cycles" };

export default async function AdminCyclesPage() {
  const [upcoming, settings] = await Promise.all([getUpcomingCycleSummary(), getSettings()]);

  // Make sure the boundary everyone is looking at actually has a row.
  const upcomingCycle = await ensureCycle(upcoming.cycleStart);
  const cycles = await getCycleSummaries(12);

  const countdown = countdownTo(upcoming.cycleStart);
  const dayName = WEEKDAY_NAMES[settings["cycle.weekday"] as Weekday] ?? "Friday";

  const dueNow = upcoming.cycleStart.getTime() <= Date.now();

  return (
    <DashboardPage className="max-w-7xl">
      <PageTitle
        title="Investment cycles"
        description={`A new cycle opens every ${dayName} at ${settings["cycle.time"]} ${settings["general.timezone"]}. Activation runs automatically on the schedule.`}
      />

      <Section title="Upcoming cycle" className="mt-0">
        <Card className="p-5 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl border border-ink-600 bg-ink-850 text-accent-300">
                  <CalendarRange className="size-4.5" aria-hidden />
                </span>
                <div>
                  <p className="text-[16px] font-semibold text-fg">
                    {formatCycleLabel(upcoming.cycleStart)}
                  </p>
                  <p className="mt-0.5 font-mono text-[11.5px] text-fg-subtle">
                    {upcomingCycle.reference}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <StatCard
                  label="Queued investors"
                  value={upcoming.queuedCount}
                  hint="Payments already approved"
                />
                <StatCard
                  label="Queued capital"
                  value={formatUSD(upcoming.queuedCapital ?? 0)}
                  hint="Principal entering this cycle"
                  tone="accent"
                />
              </div>

              <p className="mt-5 text-[12.5px] leading-relaxed text-fg-muted">
                Opens {formatBusinessDateTime(upcoming.cycleStart)}. A payment approved before that
                instant joins this cycle; one approved at or after it waits for the next {dayName}.
              </p>
            </div>

            <div>
              <Countdown
                target={upcoming.cycleStart.toISOString()}
                initial={{
                  days: countdown.days,
                  hours: countdown.hours,
                  minutes: countdown.minutes,
                  seconds: countdown.seconds,
                }}
                expiredLabel="This cycle is due for activation"
              />

              <div className="mt-5 border-t border-ink-700/60 pt-5">
                {dueNow ? (
                  <ManualCycleForm cycleId={upcomingCycle.id} />
                ) : (
                  <InfoNote>
                    Manual activation becomes available once the cycle boundary has passed. Until
                    then the scheduler handles it.
                  </InfoNote>
                )}
              </div>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Cycle history" description="The twelve most recent cycles.">
        {cycles.length === 0 ? (
          <EmptyState
            icon={<CalendarRange className="size-5" />}
            title="No cycles recorded yet"
            description="A cycle row is created the first time a payment is approved for it."
          />
        ) : (
          <TableScroll>
            <Table className="min-w-[860px]">
              <THead>
                <tr>
                  <TH>Cycle</TH>
                  <TH>Reference</TH>
                  <TH>Opens</TH>
                  <TH>Closes</TH>
                  <TH className="text-right">Participants</TH>
                  <TH className="text-right">Principal</TH>
                  <TH className="text-right">Maturity value</TH>
                  <TH>Status</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {cycles.map((cycle) => (
                  <TR key={cycle.id}>
                    <TD className="text-fg">{formatCycleLabel(cycle.cycleStart)}</TD>
                    <TD className="font-mono text-[11.5px]">{cycle.reference}</TD>
                    <TD title={formatBusinessDateTime(cycle.cycleStart)}>
                      {formatBusinessDateTime(cycle.cycleStart)}
                    </TD>
                    <TD>{formatBusinessDateTime(cycle.cycleEnd)}</TD>
                    <TD className="text-right tabular-nums">{cycle.participants}</TD>
                    <TD className="text-right tabular-nums text-fg">
                      {formatUSD(cycle.principal)}
                    </TD>
                    <TD className="text-right tabular-nums text-accent-300">
                      {formatUSD(cycle.maturityValue)}
                    </TD>
                    <TD>
                      <StatusPill
                        tone={
                          cycle.status === "ACTIVE"
                            ? "active"
                            : cycle.status === "UPCOMING"
                              ? "pending"
                              : "neutral"
                        }
                      >
                        {cycle.status.charAt(0) + cycle.status.slice(1).toLowerCase()}
                      </StatusPill>
                    </TD>
                    <TD className="text-right">
                      <Link
                        href={`/admin/cycles/${cycle.id}`}
                        className="text-[12.5px] font-medium text-accent-300 hover:underline"
                      >
                        Open
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableScroll>
        )}
      </Section>
    </DashboardPage>
  );
}
