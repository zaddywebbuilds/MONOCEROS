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
import { InfoNote, Progress } from "@/components/ui/feedback";
import { InvestmentTimeline } from "@/components/dashboard/investment-timeline";
import { InvestmentNoteForm } from "@/components/admin/review-forms";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import {
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
} from "@/lib/domain/investment-status";

export const metadata: Metadata = { title: "Investment" };

export default async function AdminInvestmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const investment = await prisma.investment.findUnique({
    where: { id },
    include: {
      user: { include: { profile: true } },
      cycle: true,
      package: true,
      payments: { orderBy: { createdAt: "desc" } },
      withdrawals: { orderBy: { requestedAt: "desc" } },
      statusEvents: { orderBy: { createdAt: "asc" } },
      rolloverFrom: true,
      rolloverTo: true,
    },
  });

  if (!investment) notFound();

  const auditRecords = await prisma.auditLog.findMany({
    where: { entityType: "Investment", entityId: investment.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const profile = investment.user.profile;

  return (
    <DashboardPage className="max-w-7xl">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Investments", href: "/admin/investments" },
          { label: investment.reference },
        ]}
      />

      <PageTitle
        title={`${investment.packageNameSnapshot} · ${investment.reference}`}
        description={
          profile
            ? `${profile.firstName} ${profile.surname} · ${investment.user.email}`
            : investment.user.email
        }
        actions={
          <StatusPill tone={INVESTMENT_STATUS_TONE[investment.status]}>
            {INVESTMENT_STATUS_LABEL[investment.status]}
          </StatusPill>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr] xl:items-start">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-fg">Snapshotted terms</h2>
            <p className="mt-1 text-[12px] text-fg-subtle">
              Recorded when the investor subscribed. Editing the package does not alter these.
            </p>
            <dl className="mt-4 border-t border-ink-700/60 pt-2">
              <DetailRow label="Reference" mono>
                {investment.reference}
              </DetailRow>
              <DetailRow label="Package (snapshot)">{investment.packageNameSnapshot}</DetailRow>
              <DetailRow label="Package (current)">
                {investment.package ? (
                  <Link
                    href={`/admin/packages/${investment.package.id}`}
                    className="text-accent-300 hover:underline"
                  >
                    {investment.package.name} ·{" "}
                    {investment.package.returnPercentage.toDecimalPlaces(2).toString()}%
                  </Link>
                ) : (
                  "Package deleted"
                )}
              </DetailRow>
              <DetailRow label="Principal">{formatUSD(investment.principalAmount)}</DetailRow>
              <DetailRow label="Return (snapshot)">
                {investment.returnPercentageSnapshot.toDecimalPlaces(2).toString()}%
              </DetailRow>
              <DetailRow label="Maturity amount">
                {formatUSD(investment.maturityAmount)}
              </DetailRow>
              <DetailRow label="Term">{investment.durationDays} days</DetailRow>
              <DetailRow label="Cycle">
                {investment.cycle
                  ? `${formatCycleLabel(investment.cycle.cycleStart)} (${investment.cycle.reference})`
                  : "Not assigned"}
              </DetailRow>
              <DetailRow label="Queued at">
                {investment.queuedAt ? formatBusinessDateTime(investment.queuedAt) : "—"}
              </DetailRow>
              <DetailRow label="Started at">
                {investment.startedAt ? formatBusinessDateTime(investment.startedAt) : "—"}
              </DetailRow>
              <DetailRow label="Matures at">
                {investment.maturesAt ? formatBusinessDateTime(investment.maturesAt) : "—"}
              </DetailRow>
              <DetailRow label="Matured at">
                {investment.maturedAt ? formatBusinessDateTime(investment.maturedAt) : "—"}
              </DetailRow>
              <DetailRow label="Closed at">
                {investment.closedAt ? formatBusinessDateTime(investment.closedAt) : "—"}
              </DetailRow>
              {investment.parentInvestmentId ? (
                <DetailRow label="Rolled over from" mono>
                  <Link
                    href={`/admin/investments/${investment.parentInvestmentId}`}
                    className="text-accent-300 hover:underline"
                  >
                    Previous investment
                  </Link>
                </DetailRow>
              ) : null}
            </dl>

            {investment.startedAt && investment.maturesAt ? (
              <div className="mt-5 border-t border-ink-700/60 pt-5">
                <Progress
                  value={progressBetween(investment.startedAt, investment.maturesAt)}
                  label={`${formatBusinessDate(investment.startedAt)} → ${formatBusinessDate(investment.maturesAt)}`}
                />
              </div>
            ) : null}

            {investment.adminNote ? (
              <InfoNote className="mt-5">
                <strong className="font-semibold">Administrative note.</strong>{" "}
                {investment.adminNote}
              </InfoNote>
            ) : null}
          </Card>

          <Section title="Payments" className="mt-0">
            <ul className="space-y-2.5">
              {investment.payments.map((payment) => (
                <li key={payment.id} className="surface-muted p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                      href={`/admin/payments/${payment.id}`}
                      className="font-mono text-[11.5px] text-accent-300 hover:underline"
                    >
                      {payment.reference}
                    </Link>
                    <StatusPill tone={PAYMENT_STATUS_TONE[payment.status]}>
                      {PAYMENT_STATUS_LABEL[payment.status]}
                    </StatusPill>
                  </div>
                  <p className="mt-2 text-[12.5px] text-fg-muted">
                    Expected {formatUSD(payment.expectedAmount)}
                    {payment.submittedAmount
                      ? ` · reported ${formatUSD(payment.submittedAmount)}`
                      : ""}
                    {payment.approvedAt
                      ? ` · approved ${formatBusinessDateTime(payment.approvedAt)}`
                      : ""}
                  </p>
                </li>
              ))}
              {investment.payments.length === 0 ? (
                <li className="text-[12.5px] text-fg-muted">No payment records.</li>
              ) : null}
            </ul>
          </Section>

          {investment.withdrawals.length > 0 ? (
            <Section title="Withdrawals" className="mt-0">
              <ul className="space-y-2.5">
                {investment.withdrawals.map((withdrawal) => (
                  <li key={withdrawal.id} className="surface-muted p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="font-mono text-[11.5px] text-fg">
                        {withdrawal.reference}
                      </span>
                      <StatusPill tone={WITHDRAWAL_STATUS_TONE[withdrawal.status]}>
                        {WITHDRAWAL_STATUS_LABEL[withdrawal.status]}
                      </StatusPill>
                    </div>
                    <p className="mt-2 text-[12.5px] text-fg-muted">
                      {formatUSD(withdrawal.amount)} · {withdrawal.walletNetwork ?? "—"}
                      {withdrawal.paymentTxid ? ` · TXID ${withdrawal.paymentTxid}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-[14px] font-semibold text-fg">Stage</h2>
            <div className="mt-4">
              <InvestmentTimeline status={investment.status} />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-[14px] font-semibold text-fg">Status history</h2>
            <ol className="mt-3 space-y-3">
              {investment.statusEvents.map((event) => (
                <li key={event.id} className="border-l border-ink-700 pl-3.5">
                  <p className="text-[12.5px] font-medium text-fg">
                    {event.fromStatus ? `${INVESTMENT_STATUS_LABEL[event.fromStatus]} → ` : ""}
                    {INVESTMENT_STATUS_LABEL[event.toStatus]}
                  </p>
                  <p className="mt-0.5 text-[11px] text-fg-subtle">
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

          <Card className="p-5">
            <h2 className="text-[14px] font-semibold text-fg">Administrative note</h2>
            <p className="mt-1.5 text-[12px] leading-relaxed text-fg-subtle">
              Monetary values are never edited from this screen. If a correction is genuinely
              required, record the reason here and raise it through finance so the change is
              traceable.
            </p>
            <div className="mt-4">
              <InvestmentNoteForm
                investmentId={investment.id}
                currentNote={investment.adminNote}
              />
            </div>
          </Card>

          {auditRecords.length > 0 ? (
            <Card className="p-5">
              <h2 className="text-[14px] font-semibold text-fg">Audit records</h2>
              <ul className="mt-3 space-y-3">
                {auditRecords.map((record) => (
                  <li key={record.id} className="border-l border-ink-700 pl-3.5">
                    <p className="text-[12.5px] font-medium text-fg">{record.action}</p>
                    <p className="mt-0.5 text-[11px] text-fg-subtle">
                      {record.actorEmail ?? "system"} · {formatBusinessDateTime(record.createdAt)}
                    </p>
                    {record.reason ? (
                      <p className="mt-1 text-[11.5px] text-fg-muted">{record.reason}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </DashboardPage>
  );
}
