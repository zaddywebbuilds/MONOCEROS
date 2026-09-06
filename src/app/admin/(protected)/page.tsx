import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarRange,
  ClipboardList,
  Layers,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { DashboardPage, PageTitle, Section } from "@/components/dashboard/page-parts";
import { Card, StatCard } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/feedback";
import {
  PackageDistributionChart,
  SubscriptionsChart,
  WithdrawalsChart,
} from "@/components/admin/charts";
import { Countdown } from "@/components/countdown";
import { formatUSD } from "@/lib/money";
import { countdownTo, formatCycleLabel } from "@/lib/time";
import { getSettings, paymentConfigured } from "@/lib/settings";
import {
  getAdminOverview,
  getPackageDistribution,
  getSubscriptionSeries,
  getWithdrawalSeries,
} from "@/server/queries/admin";
import { getUpcomingCycleSummary } from "@/server/services/cycles";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  const [overview, subscriptions, distribution, withdrawals, cycle, settings] = await Promise.all([
    getAdminOverview(),
    getSubscriptionSeries(30),
    getPackageDistribution(),
    getWithdrawalSeries(8),
    getUpcomingCycleSummary(),
    getSettings(),
  ]);

  const countdown = countdownTo(cycle.cycleStart);
  const configured = paymentConfigured(settings);

  const queue = [
    {
      label: "KYC awaiting review",
      value: overview.pendingKyc,
      href: "/admin/kyc",
      icon: BadgeCheck,
    },
    {
      label: "Payments awaiting verification",
      value: overview.pendingPayments,
      href: "/admin/payments",
      icon: Wallet,
    },
    {
      label: "Withdrawals awaiting action",
      value: overview.pendingWithdrawals,
      href: "/admin/withdrawals",
      icon: ClipboardList,
    },
    {
      label: "Investments matured",
      value: overview.maturedInvestments,
      href: "/admin/investments?status=MATURED",
      icon: Layers,
    },
  ];

  return (
    <DashboardPage className="max-w-7xl">
      <PageTitle
        title="Operations overview"
        description="Live figures from the database. Nothing on this page is illustrative."
      />

      {!configured ? (
        <InfoNote tone="warning" className="mb-6">
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <strong className="font-semibold">Payments are not configured.</strong> Investors
              cannot subscribe until a payment network and company wallet address are set.{" "}
              <Link href="/admin/settings" className="underline underline-offset-2">
                Open payment settings
              </Link>
              .
            </span>
          </span>
        </InfoNote>
      ) : null}

      {/* Action queue --------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {queue.map((item) => (
          <Link key={item.label} href={item.href} className="group">
            <StatCard
              label={item.label}
              value={item.value}
              hint={item.value > 0 ? "Needs attention" : "Nothing waiting"}
              tone={item.value > 0 ? "gold" : "default"}
              icon={<item.icon className="size-4" />}
            />
          </Link>
        ))}
      </div>

      {/* Portfolio figures ---------------------------------------------- */}
      <Section title="Platform figures">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total users"
            value={overview.totalUsers}
            hint={`${overview.verifiedUsers} verified`}
            icon={<Users className="size-4" />}
          />
          <StatCard
            label="Active investments"
            value={overview.activeInvestments}
            hint={`${overview.queuedInvestments} queued`}
            icon={<TrendingUp className="size-4" />}
            tone="accent"
          />
          <StatCard
            label="Total subscription value"
            value={formatUSD(overview.totalSubscriptionValue)}
            hint="Capital across all subscriptions"
            icon={<Layers className="size-4" />}
          />
          <StatCard
            label="Total withdrawals paid"
            value={formatUSD(overview.totalWithdrawalsPaid)}
            hint="Settled to investors"
            icon={<Wallet className="size-4" />}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <StatCard
            label="Active + queued capital"
            value={formatUSD(overview.activeCapital)}
            hint="Principal currently committed"
            icon={<Layers className="size-4" />}
          />
          <StatCard
            label="Outstanding maturity value"
            value={formatUSD(overview.outstandingMaturityLiability)}
            hint="Amount payable if every open investment matures"
            icon={<AlertTriangle className="size-4" />}
            tone="gold"
          />
        </div>
      </Section>

      {/* Next cycle ------------------------------------------------------ */}
      <Section title="Next investment cycle">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-lg border border-ink-600 bg-ink-850 text-accent-300">
                  <CalendarRange className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-fg">
                    {formatCycleLabel(cycle.cycleStart)}
                  </p>
                  <p className="mt-0.5 text-[12px] text-fg-subtle">
                    {cycle.reference ?? "Cycle record will be created automatically"}
                  </p>
                </div>
              </div>

              <dl className="mt-5 flex flex-wrap gap-6">
                <div>
                  <dt className="text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">
                    Queued investors
                  </dt>
                  <dd className="mt-1 text-xl font-semibold text-fg">{cycle.queuedCount}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">
                    Queued capital
                  </dt>
                  <dd className="mt-1 text-xl font-semibold text-fg">
                    {formatUSD(cycle.queuedCapital ?? 0)}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <Countdown
                target={cycle.cycleStart.toISOString()}
                initial={{
                  days: countdown.days,
                  hours: countdown.hours,
                  minutes: countdown.minutes,
                  seconds: countdown.seconds,
                }}
              />
              <Link
                href="/admin/cycles"
                className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent-300 hover:underline"
              >
                Manage cycles
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </Card>
      </Section>

      {/* Charts ---------------------------------------------------------- */}
      <Section title="Trends">
        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="p-5">
            <h3 className="text-[14px] font-semibold text-fg">Subscription value (30 days)</h3>
            <p className="mt-1 text-[12px] text-fg-subtle">
              Capital of subscriptions created each day.
            </p>
            <div className="mt-4">
              <SubscriptionsChart data={subscriptions} />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-[14px] font-semibold text-fg">Withdrawal requests (8 weeks)</h3>
            <p className="mt-1 text-[12px] text-fg-subtle">Value requested per week.</p>
            <div className="mt-4">
              <WithdrawalsChart data={withdrawals} />
            </div>
          </Card>

          <Card className="p-5 xl:col-span-2">
            <h3 className="text-[14px] font-semibold text-fg">Package distribution</h3>
            <p className="mt-1 text-[12px] text-fg-subtle">
              Open investments grouped by the package recorded on each one.
            </p>
            <div className="mt-5">
              <PackageDistributionChart data={distribution} />
            </div>
          </Card>
        </div>
      </Section>
    </DashboardPage>
  );
}
