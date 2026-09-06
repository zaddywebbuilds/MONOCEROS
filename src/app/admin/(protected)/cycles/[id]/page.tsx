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
import { Card, StatCard } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
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
import { formatUSD, money } from "@/lib/money";
import { formatBusinessDate, formatBusinessDateTime, formatCycleLabel } from "@/lib/time";
import {
  INVESTMENT_STATUS_LABEL,
  INVESTMENT_STATUS_TONE,
} from "@/lib/domain/investment-status";

export const metadata: Metadata = { title: "Cycle" };

export default async function AdminCycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cycle = await prisma.investmentCycle.findUnique({
    where: { id },
    include: {
      investments: {
        include: { user: { include: { profile: true } } },
        orderBy: { queuedAt: "asc" },
      },
    },
  });

  if (!cycle) notFound();

  const principal = cycle.investments.reduce(
    (sum, investment) => sum.add(investment.principalAmount),
    money(0),
  );
  const maturity = cycle.investments.reduce(
    (sum, investment) => sum.add(investment.maturityAmount),
    money(0),
  );

  const dueNow = cycle.cycleStart.getTime() <= Date.now();
  const queued = cycle.investments.filter((investment) => investment.status === "QUEUED").length;

  return (
    <DashboardPage className="max-w-7xl">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Cycles", href: "/admin/cycles" },
          { label: cycle.reference },
        ]}
      />

      <PageTitle
        title={formatCycleLabel(cycle.cycleStart)}
        description={`Opens ${formatBusinessDateTime(cycle.cycleStart)} · closes ${formatBusinessDateTime(cycle.cycleEnd)}`}
        actions={
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
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Participants" value={cycle.investments.length} />
        <StatCard label="Still queued" value={queued} tone={queued > 0 ? "gold" : "default"} />
        <StatCard label="Total principal" value={formatUSD(principal)} tone="accent" />
        <StatCard label="Total maturity value" value={formatUSD(maturity)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr] xl:items-start">
        <Section title="Participants" className="mt-0">
          {cycle.investments.length === 0 ? (
            <EmptyState
              title="No investments in this cycle"
              description="Investments join a cycle when their payment is approved."
            />
          ) : (
            <TableScroll>
              <Table className="min-w-[760px]">
                <THead>
                  <tr>
                    <TH>Reference</TH>
                    <TH>Investor</TH>
                    <TH>Package</TH>
                    <TH className="text-right">Principal</TH>
                    <TH className="text-right">Maturity</TH>
                    <TH>Matures</TH>
                    <TH>Status</TH>
                  </tr>
                </THead>
                <TBody>
                  {cycle.investments.map((investment) => (
                    <TR key={investment.id}>
                      <TD>
                        <Link
                          href={`/admin/investments/${investment.id}`}
                          className="font-mono text-[11.5px] text-accent-300 hover:underline"
                        >
                          {investment.reference}
                        </Link>
                      </TD>
                      <TD className="text-fg">
                        {investment.user.profile
                          ? `${investment.user.profile.firstName} ${investment.user.profile.surname}`
                          : investment.user.email}
                      </TD>
                      <TD>{investment.packageNameSnapshot}</TD>
                      <TD className="text-right tabular-nums text-fg">
                        {formatUSD(investment.principalAmount)}
                      </TD>
                      <TD className="text-right tabular-nums text-accent-300">
                        {formatUSD(investment.maturityAmount)}
                      </TD>
                      <TD>
                        {investment.maturesAt ? formatBusinessDate(investment.maturesAt) : "—"}
                      </TD>
                      <TD>
                        <StatusPill tone={INVESTMENT_STATUS_TONE[investment.status]}>
                          {INVESTMENT_STATUS_LABEL[investment.status]}
                        </StatusPill>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableScroll>
          )}
        </Section>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-[14px] font-semibold text-fg">Cycle record</h2>
            <dl className="mt-3 border-t border-ink-700/60 pt-2">
              <DetailRow label="Reference" mono>
                {cycle.reference}
              </DetailRow>
              <DetailRow label="Opens">{formatBusinessDateTime(cycle.cycleStart)}</DetailRow>
              <DetailRow label="Closes">{formatBusinessDateTime(cycle.cycleEnd)}</DetailRow>
              <DetailRow label="Activated">
                {cycle.activatedAt ? formatBusinessDateTime(cycle.activatedAt) : "—"}
              </DetailRow>
              <DetailRow label="Completed">
                {cycle.completedAt ? formatBusinessDateTime(cycle.completedAt) : "—"}
              </DetailRow>
            </dl>
          </Card>

          {dueNow && queued > 0 ? (
            <Card className="p-5">
              <h2 className="text-[14px] font-semibold text-fg">Emergency activation</h2>
              <div className="mt-4">
                <ManualCycleForm cycleId={cycle.id} />
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </DashboardPage>
  );
}
