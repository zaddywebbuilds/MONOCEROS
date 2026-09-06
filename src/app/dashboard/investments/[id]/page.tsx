import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Breadcrumbs,
  DashboardPage,
  DetailRow,
  PageTitle,
  Section,
} from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { Progress, InfoNote, EmptyState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { Countdown, RemainingLabel } from "@/components/countdown";
import { InvestmentTimeline } from "@/components/dashboard/investment-timeline";
import { MaturityActions } from "@/components/dashboard/maturity-actions";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { getInvestmentForUser } from "@/server/services/investments";
import { previewRollover } from "@/server/services/rollovers";
import { upcomingCycleStart } from "@/server/services/cycles";
import { getSettings } from "@/lib/settings";
import { formatUSD } from "@/lib/money";
import {
  countdownTo,
  formatBusinessDate,
  formatBusinessDateTime,
  formatCycleLabel,
  progressBetween,
} from "@/lib/time";
import {
  INVESTMENT_STATUS_LABEL,
  INVESTMENT_STATUS_TONE,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
  WITHDRAWAL_STATUS_LABEL,
  WITHDRAWAL_STATUS_TONE,
  nextActionFor,
} from "@/lib/domain/investment-status";

export const metadata: Metadata = { title: "Investment" };

export default async function InvestmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/investments/${id}`);

  const investment = await getInvestmentForUser(id, user.id);
  if (!investment) notFound();

  const [settings, cycleStart, profile, packages] = await Promise.all([
    getSettings(),
    upcomingCycleStart(),
    prisma.userProfile.findUnique({ where: { userId: user.id } }),
    prisma.package.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      select: { slug: true, name: true, returnPercentage: true },
    }),
  ]);

  const rolloverPreview =
    investment.status === "MATURED" ? await previewRollover(user.id, investment.id) : null;

  const latestPayment = investment.payments[0];
  const latestWithdrawal = investment.withdrawals[0];
  const cycleCountdown = countdownTo(investment.cycle?.cycleStart ?? cycleStart);

  return (
    <DashboardPage>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Investments", href: "/dashboard/investments" },
          { label: investment.reference },
        ]}
      />

      <PageTitle
        title={investment.packageNameSnapshot}
        description={nextActionFor(investment.status)}
        actions={
          <StatusPill tone={INVESTMENT_STATUS_TONE[investment.status]}>
            {INVESTMENT_STATUS_LABEL[investment.status]}
          </StatusPill>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-start">
        <div className="space-y-6">
          {/* Terms ---------------------------------------------------- */}
          <Card className="p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-fg">Investment terms</h2>
            <p className="mt-1 text-[12.5px] text-fg-muted">
              Recorded when you subscribed. These values do not change if the package is later
              edited.
            </p>
            <dl className="mt-4 border-t border-ink-700/60 pt-2">
              <DetailRow label="Reference" mono>
                {investment.reference}
              </DetailRow>
              <DetailRow label="Capital">{formatUSD(investment.principalAmount)}</DetailRow>
              <DetailRow label="Return percentage">
                {investment.returnPercentageSnapshot.toDecimalPlaces(2).toString()}%
              </DetailRow>
              <DetailRow label="Maturity value">
                <span className="text-accent-300">{formatUSD(investment.maturityAmount)}</span>
              </DetailRow>
              <DetailRow label="Term length">{investment.durationDays} calendar days</DetailRow>
              <DetailRow label="Cycle">
                {investment.cycle ? (
                  <>
                    {formatCycleLabel(investment.cycle.cycleStart)}{" "}
                    <span className="font-mono text-[11px] text-fg-subtle">
                      ({investment.cycle.reference})
                    </span>
                  </>
                ) : (
                  "Not yet assigned"
                )}
              </DetailRow>
              <DetailRow label="Started">
                {investment.startedAt ? formatBusinessDateTime(investment.startedAt) : "—"}
              </DetailRow>
              <DetailRow label="Matures">
                {investment.maturesAt ? formatBusinessDateTime(investment.maturesAt) : "—"}
              </DetailRow>
              {investment.parentInvestmentId ? (
                <DetailRow label="Rolled over from">
                  <Link
                    href={`/dashboard/investments/${investment.parentInvestmentId}`}
                    className="text-accent-300 hover:underline"
                  >
                    Previous investment
                  </Link>
                </DetailRow>
              ) : null}
            </dl>

            {investment.status === "ACTIVE" && investment.startedAt && investment.maturesAt ? (
              <div className="mt-5 border-t border-ink-700/60 pt-5">
                <Progress
                  value={progressBetween(investment.startedAt, investment.maturesAt)}
                  label={`${formatBusinessDate(investment.startedAt)} → ${formatBusinessDate(investment.maturesAt)}`}
                />
                <p className="mt-3 text-[13px] text-fg-muted">
                  Remaining:{" "}
                  <RemainingLabel
                    target={investment.maturesAt.toISOString()}
                    className="font-medium text-fg"
                  />
                </p>
              </div>
            ) : null}

            {investment.status === "QUEUED" && investment.cycle ? (
              <div className="mt-5 border-t border-ink-700/60 pt-5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
                  Activates when the cycle opens
                </p>
                <p className="mt-1.5 text-[15px] font-semibold text-fg">
                  {formatCycleLabel(investment.cycle.cycleStart)}
                </p>
                <Countdown
                  target={investment.cycle.cycleStart.toISOString()}
                  initial={{
                    days: cycleCountdown.days,
                    hours: cycleCountdown.hours,
                    minutes: cycleCountdown.minutes,
                    seconds: cycleCountdown.seconds,
                  }}
                  className="mt-4"
                />
              </div>
            ) : null}
          </Card>

          {/* Maturity actions ----------------------------------------- */}
          {investment.status === "MATURED" && rolloverPreview ? (
            <Card className="p-5 sm:p-6" id="withdraw">
              <h2 className="text-[15px] font-semibold text-fg">Your investment has matured</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
                Choose whether to withdraw {formatUSD(investment.maturityAmount)} to your wallet, or
                roll the full amount into the next investment cycle.
              </p>
              <div className="mt-5" id="rollover">
                <MaturityActions
                  investmentId={investment.id}
                  maturityAmount={formatUSD(investment.maturityAmount)}
                  networks={settings["payment.allowedNetworks"]}
                  savedWallet={profile?.withdrawalWalletAddress ?? null}
                  savedNetwork={profile?.withdrawalWalletNetwork ?? null}
                  requirePassword={settings["withdrawal.requirePasswordConfirmation"]}
                  rollover={{
                    mode: rolloverPreview.mode,
                    principal: formatUSD(rolloverPreview.principal),
                    percentage: rolloverPreview.percentage,
                    projectedMaturity: formatUSD(rolloverPreview.projectedMaturity),
                    durationDays: rolloverPreview.durationDays,
                    waitsForCycle: rolloverPreview.waitsForCycle,
                  }}
                  packages={packages.map((pkg) => ({
                    slug: pkg.slug,
                    name: pkg.name,
                    returnPercentage: pkg.returnPercentage.toDecimalPlaces(2).toString(),
                  }))}
                  cycleLabel={formatCycleLabel(cycleStart)}
                />
              </div>
            </Card>
          ) : null}

          {investment.status === "ACTIVE" ? (
            <InfoNote>
              Withdrawal and rollover become available automatically at maturity on{" "}
              {investment.maturesAt ? formatBusinessDate(investment.maturesAt) : "the maturity date"}
              . There is nothing to do before then.
            </InfoNote>
          ) : null}

          {/* Payments -------------------------------------------------- */}
          <Section title="Payments" className="mt-0">
            {investment.payments.length === 0 ? (
              <EmptyState title="No payment record" />
            ) : (
              <ul className="space-y-3">
                {investment.payments.map((payment) => (
                  <li key={payment.id} className="surface-muted p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-[11.5px] text-fg">{payment.reference}</p>
                        <p className="mt-1 text-[12.5px] text-fg-muted">
                          Expected {formatUSD(payment.expectedAmount)}
                          {payment.submittedAmount
                            ? ` · submitted ${formatUSD(payment.submittedAmount)}`
                            : ""}
                        </p>
                      </div>
                      <StatusPill tone={PAYMENT_STATUS_TONE[payment.status]}>
                        {PAYMENT_STATUS_LABEL[payment.status]}
                      </StatusPill>
                    </div>
                    {payment.rejectionReason ? (
                      <p className="mt-2.5 text-[12.5px] text-status-rejected">
                        {payment.rejectionReason}
                      </p>
                    ) : null}
                    {["PAYMENT_PENDING", "PAYMENT_REJECTED"].includes(investment.status) ? (
                      <ButtonLink
                        href={`/dashboard/payments/${investment.id}`}
                        size="sm"
                        variant="secondary"
                        className="mt-3"
                      >
                        Open payment
                      </ButtonLink>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Withdrawals ---------------------------------------------- */}
          {investment.withdrawals.length > 0 ? (
            <Section title="Withdrawals" className="mt-0">
              <ul className="space-y-3">
                {investment.withdrawals.map((withdrawal) => (
                  <li key={withdrawal.id} className="surface-muted p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-[11.5px] text-fg">{withdrawal.reference}</p>
                        <p className="mt-1 text-[12.5px] text-fg-muted">
                          {formatUSD(withdrawal.amount)} · {withdrawal.walletNetwork}
                        </p>
                      </div>
                      <StatusPill tone={WITHDRAWAL_STATUS_TONE[withdrawal.status]}>
                        {WITHDRAWAL_STATUS_LABEL[withdrawal.status]}
                      </StatusPill>
                    </div>
                    {withdrawal.rejectionReason ? (
                      <p className="mt-2.5 text-[12.5px] text-status-rejected">
                        {withdrawal.rejectionReason}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>

        {/* Sidebar ----------------------------------------------------- */}
        <div className="space-y-5 lg:sticky lg:top-6">
          <Card className="p-5">
            <h2 className="text-[14px] font-semibold text-fg">Progress</h2>
            <div className="mt-4">
              <InvestmentTimeline status={investment.status} />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-[14px] font-semibold text-fg">History</h2>
            <ol className="mt-3 space-y-3">
              {investment.statusEvents.map((event) => (
                <li key={event.id} className="border-l border-ink-700 pl-3.5">
                  <p className="text-[12.5px] font-medium text-fg">
                    {INVESTMENT_STATUS_LABEL[event.toStatus]}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-fg-subtle">
                    {formatBusinessDateTime(event.createdAt)}
                  </p>
                  {event.reason ? (
                    <p className="mt-1 text-[11.5px] leading-relaxed text-fg-muted">
                      {event.reason}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </Card>

          {latestPayment || latestWithdrawal ? (
            <Card className="p-5">
              <h2 className="text-[14px] font-semibold text-fg">Latest activity</h2>
              <dl className="mt-3 border-t border-ink-700/60 pt-2">
                {latestPayment?.transactionHash ? (
                  <DetailRow label="Payment TXID" mono>
                    {latestPayment.transactionHash}
                  </DetailRow>
                ) : null}
                {latestWithdrawal?.paymentTxid ? (
                  <DetailRow label="Settlement TXID" mono>
                    {latestWithdrawal.paymentTxid}
                  </DetailRow>
                ) : null}
                {latestWithdrawal?.walletAddress ? (
                  <DetailRow label="Destination" mono>
                    {latestWithdrawal.walletAddress}
                  </DetailRow>
                ) : null}
              </dl>
            </Card>
          ) : null}
        </div>
      </div>
    </DashboardPage>
  );
}
