import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  Layers,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { DashboardPage, PageTitle, Section } from "@/components/dashboard/page-parts";
import { StatCard, Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { Progress, EmptyState, InfoNote } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { Countdown, RemainingLabel } from "@/components/countdown";
import { InvestmentTimeline } from "@/components/dashboard/investment-timeline";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import {
  countdownTo,
  formatBusinessDate,
  formatCycleLabel,
  progressBetween,
} from "@/lib/time";
import {
  INVESTMENT_STATUS_LABEL,
  INVESTMENT_STATUS_TONE,
  KYC_STATUS_LABEL,
  KYC_STATUS_TONE,
  nextActionFor,
} from "@/lib/domain/investment-status";
import { getPortfolioSummary } from "@/server/services/investments";
import { upcomingCycleStart } from "@/server/services/cycles";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardOverviewPage() {
  const user = await requireUser("/dashboard");

  const [summary, investments, cycleStart, recentNotifications] = await Promise.all([
    getPortfolioSummary(user.id),
    prisma.investment.findMany({
      where: {
        userId: user.id,
        status: { in: ["ACTIVE", "QUEUED", "MATURED", "PAYMENT_PENDING", "PAYMENT_SUBMITTED", "PAYMENT_UNDER_REVIEW", "PAYMENT_REJECTED"] },
      },
      include: { cycle: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 5,
    }),
    upcomingCycleStart(),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  const cycleCountdown = countdownTo(cycleStart);
  const activeInvestment = investments.find((investment) => investment.status === "ACTIVE");
  const queuedInvestment = investments.find((investment) => investment.status === "QUEUED");
  const maturedInvestment = investments.find((investment) => investment.status === "MATURED");
  const awaitingPayment = investments.find((investment) =>
    ["PAYMENT_PENDING", "PAYMENT_REJECTED"].includes(investment.status),
  );

  return (
    <DashboardPage>
      <PageTitle
        title={`Welcome back${user.firstName ? `, ${user.firstName}` : ""}`}
        description="Your investments, their current stage and the single next action for each."
        actions={
          user.kycStatus === "APPROVED" ? (
            <ButtonLink href="/dashboard/packages" size="sm">
              New investment
            </ButtonLink>
          ) : (
            <ButtonLink href="/dashboard/verification" size="sm">
              Complete verification
            </ButtonLink>
          )
        }
      />

      {/* Gating notices ------------------------------------------------- */}
      {!user.emailVerified ? (
        <InfoNote tone="warning" className="mb-6">
          Confirm your email address to continue.{" "}
          <Link href="/verify-email" className="font-medium underline underline-offset-2">
            Open the verification page
          </Link>
          .
        </InfoNote>
      ) : user.kycStatus !== "APPROVED" ? (
        <InfoNote tone="warning" className="mb-6">
          Complete your identity verification to begin investing.{" "}
          <Link
            href="/dashboard/verification"
            className="font-medium underline underline-offset-2"
          >
            Start verification
          </Link>
          .
        </InfoNote>
      ) : null}

      {/* Summary tiles --------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total invested"
          value={formatUSD(summary.totalInvested)}
          hint="Capital committed across all terms"
          icon={<CircleDollarSign className="size-4" />}
        />
        <StatCard
          label="Active investments"
          value={summary.activeCount}
          hint={summary.queuedCount > 0 ? `${summary.queuedCount} queued` : "Currently running"}
          icon={<TrendingUp className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Projected maturity value"
          value={formatUSD(summary.projectedMaturityValue)}
          hint="Sum of active investment maturity amounts"
          icon={<Layers className="size-4" />}
          tone="gold"
        />
        <StatCard
          label="Next maturity"
          value={
            summary.nextMaturityDate ? formatBusinessDate(summary.nextMaturityDate) : "—"
          }
          hint={summary.nextMaturityDate ? "Earliest active investment" : "No active investment"}
          icon={<CalendarClock className="size-4" />}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Completed"
          value={summary.completedCount}
          hint="Withdrawn or rolled over"
          icon={<BadgeCheck className="size-4" />}
        />
        <StatCard
          label="Pending withdrawals"
          value={summary.pendingWithdrawals}
          hint="Awaiting review or settlement"
          icon={<Wallet className="size-4" />}
        />
        <StatCard
          label="Verification"
          value={KYC_STATUS_LABEL[user.kycStatus]}
          hint={user.kycStatus === "APPROVED" ? "You can subscribe" : "Required before investing"}
          icon={<BadgeCheck className="size-4" />}
        />
        <StatCard
          label="Next cycle opens"
          value={<span className="text-base">{formatCycleLabel(cycleStart)}</span>}
          hint={`In ${cycleCountdown.days}d ${cycleCountdown.hours}h`}
          icon={<Clock3 className="size-4" />}
        />
      </div>

      {/* Current investment --------------------------------------------- */}
      <Section title="Current investment">
        {activeInvestment ? (
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-lg font-semibold tracking-tight text-fg">
                    {activeInvestment.packageNameSnapshot}
                  </h3>
                  <StatusPill tone={INVESTMENT_STATUS_TONE[activeInvestment.status]}>
                    {INVESTMENT_STATUS_LABEL[activeInvestment.status]}
                  </StatusPill>
                </div>
                <p className="mt-1 font-mono text-[11.5px] text-fg-subtle">
                  {activeInvestment.reference}
                </p>
              </div>
              <ButtonLink
                href={`/dashboard/investments/${activeInvestment.id}`}
                variant="secondary"
                size="sm"
              >
                View details
                <ArrowUpRight />
              </ButtonLink>
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Capital", value: formatUSD(activeInvestment.principalAmount) },
                {
                  label: "Return",
                  value: `${activeInvestment.returnPercentageSnapshot.toDecimalPlaces(2).toString()}%`,
                },
                { label: "Maturity value", value: formatUSD(activeInvestment.maturityAmount) },
                {
                  label: "Remaining",
                  value: activeInvestment.maturesAt ? (
                    <RemainingLabel target={activeInvestment.maturesAt.toISOString()} />
                  ) : (
                    "—"
                  ),
                },
              ].map((item) => (
                <div key={item.label} className="surface-muted p-3.5">
                  <dt className="text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">
                    {item.label}
                  </dt>
                  <dd className="mt-1.5 text-[15px] font-semibold text-fg">{item.value}</dd>
                </div>
              ))}
            </dl>

            {activeInvestment.startedAt && activeInvestment.maturesAt ? (
              <div className="mt-5">
                <Progress
                  value={progressBetween(activeInvestment.startedAt, activeInvestment.maturesAt)}
                  label={`${formatBusinessDate(activeInvestment.startedAt)} → ${formatBusinessDate(activeInvestment.maturesAt)}`}
                />
              </div>
            ) : null}
          </Card>
        ) : queuedInvestment ? (
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-lg font-semibold tracking-tight text-fg">
                {queuedInvestment.packageNameSnapshot}
              </h3>
              <StatusPill tone="pending">Queued</StatusPill>
            </div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">
              Your subscription has been verified and is waiting for the next investment cycle. It
              will activate automatically — there is nothing more for you to do.
            </p>

            <div className="mt-5 rounded-xl border border-ink-700 bg-ink-880/50 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
                Next investment cycle
              </p>
              <p className="mt-1.5 text-[15px] font-semibold text-fg">
                {formatCycleLabel(queuedInvestment.cycle?.cycleStart ?? cycleStart)}
              </p>
              <Countdown
                target={(queuedInvestment.cycle?.cycleStart ?? cycleStart).toISOString()}
                initial={{
                  days: cycleCountdown.days,
                  hours: cycleCountdown.hours,
                  minutes: cycleCountdown.minutes,
                  seconds: cycleCountdown.seconds,
                }}
                className="mt-4"
              />
            </div>

            <ButtonLink
              href={`/dashboard/investments/${queuedInvestment.id}`}
              variant="secondary"
              size="sm"
              className="mt-5"
            >
              View subscription
            </ButtonLink>
          </Card>
        ) : maturedInvestment ? (
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-lg font-semibold tracking-tight text-fg">
                {maturedInvestment.packageNameSnapshot}
              </h3>
              <StatusPill tone="matured">Matured</StatusPill>
            </div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">
              Your investment has reached maturity at{" "}
              <strong className="font-semibold text-fg">
                {formatUSD(maturedInvestment.maturityAmount)}
              </strong>
              . Choose to withdraw it, or roll the full amount into the next cycle.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <ButtonLink href={`/dashboard/investments/${maturedInvestment.id}#withdraw`}>
                Withdraw
              </ButtonLink>
              <ButtonLink
                href={`/dashboard/investments/${maturedInvestment.id}#rollover`}
                variant="secondary"
              >
                Rollover
              </ButtonLink>
            </div>
          </Card>
        ) : awaitingPayment ? (
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-lg font-semibold tracking-tight text-fg">
                {awaitingPayment.packageNameSnapshot}
              </h3>
              <StatusPill tone={INVESTMENT_STATUS_TONE[awaitingPayment.status]}>
                {INVESTMENT_STATUS_LABEL[awaitingPayment.status]}
              </StatusPill>
            </div>
            <p className="mt-2 text-[13.5px] text-fg-muted">
              {nextActionFor(awaitingPayment.status)}.
            </p>
            <ButtonLink href={`/dashboard/payments/${awaitingPayment.id}`} className="mt-5">
              Open payment instructions
            </ButtonLink>
          </Card>
        ) : (
          <EmptyState
            icon={<TrendingUp className="size-5" />}
            title="You don't have an active investment yet."
            description={
              user.kycStatus === "APPROVED"
                ? "Choose a package to start your first subscription."
                : "Complete your identity verification to begin investing."
            }
            actionLabel={user.kycStatus === "APPROVED" ? "View Packages" : "Complete Verification"}
            actionHref={
              user.kycStatus === "APPROVED" ? "/dashboard/packages" : "/dashboard/verification"
            }
          />
        )}
      </Section>

      {/* Two-up: pipeline + recent activity ------------------------------ */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Section title="In progress" className="mt-0">
          {investments.length === 0 ? (
            <EmptyState title="Nothing in progress" description="New subscriptions appear here." />
          ) : (
            <ul className="space-y-3">
              {investments.map((investment) => (
                <li key={investment.id}>
                  <Link
                    href={`/dashboard/investments/${investment.id}`}
                    className="surface-muted flex items-center justify-between gap-4 p-4 transition-colors hover:border-accent-800"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-fg">
                        {investment.packageNameSnapshot}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-fg-subtle">
                        {investment.reference}
                      </p>
                      <p className="mt-1.5 text-[12px] text-fg-muted">
                        {nextActionFor(investment.status)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <StatusPill tone={INVESTMENT_STATUS_TONE[investment.status]}>
                        {INVESTMENT_STATUS_LABEL[investment.status]}
                      </StatusPill>
                      <p className="mt-2 text-[13px] font-semibold text-fg">
                        {formatUSD(investment.principalAmount)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <div className="space-y-6">
          {activeInvestment || queuedInvestment || awaitingPayment ? (
            <Section title="Where you are" className="mt-0">
              <Card className="p-5">
                <InvestmentTimeline
                  status={
                    (activeInvestment ?? queuedInvestment ?? awaitingPayment ?? investments[0])!
                      .status
                  }
                />
              </Card>
            </Section>
          ) : null}

          <Section
            title="Recent notifications"
            className="mt-0"
            actions={
              <Link
                href="/dashboard/notifications"
                className="text-[12.5px] text-accent-300 hover:underline"
              >
                See all
              </Link>
            }
          >
            {recentNotifications.length === 0 ? (
              <EmptyState title="No notifications yet" />
            ) : (
              <ul className="space-y-2.5">
                {recentNotifications.map((notification) => (
                  <li key={notification.id} className="surface-muted p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[13px] font-medium text-fg">{notification.title}</p>
                      {!notification.isRead ? (
                        <span
                          aria-label="Unread"
                          className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-400"
                        />
                      ) : null}
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">
                      {notification.message}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </DashboardPage>
  );
}
