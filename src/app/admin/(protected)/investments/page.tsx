import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import type { InvestmentStatus, Prisma } from "@prisma/client";

import { DashboardPage, PageTitle } from "@/components/dashboard/page-parts";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { FilterSelect, Pagination, SearchInput } from "@/components/ui/interactive";
import {
  MobileCard,
  MobileCardList,
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
import { formatShortDate, formatCycleLabel } from "@/lib/time";
import {
  INVESTMENT_STATUS_LABEL,
  INVESTMENT_STATUS_TONE,
  PAYMENT_STATUS_LABEL,
} from "@/lib/domain/investment-status";

export const metadata: Metadata = { title: "Investments" };

const PER_PAGE = 20;

export default async function AdminInvestmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.InvestmentWhereInput = {
    ...(params.status && params.status in INVESTMENT_STATUS_LABEL
      ? { status: params.status as InvestmentStatus }
      : {}),
    ...(params.q
      ? {
          OR: [
            { reference: { contains: params.q, mode: "insensitive" } },
            { packageNameSnapshot: { contains: params.q, mode: "insensitive" } },
            { user: { email: { contains: params.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [investments, total] = await Promise.all([
    prisma.investment.findMany({
      where,
      include: {
        user: { include: { profile: true } },
        cycle: true,
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.investment.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <DashboardPage className="max-w-7xl">
      <PageTitle
        title="Investments"
        description="Every subscription on the platform. Values shown are the terms snapshotted when the investor subscribed."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput placeholder="Search reference, package or email" className="w-full sm:w-96" />
        <FilterSelect
          paramName="status"
          label="Status"
          options={(Object.keys(INVESTMENT_STATUS_LABEL) as InvestmentStatus[]).map((value) => ({
            value,
            label: INVESTMENT_STATUS_LABEL[value],
          }))}
        />
      </div>

      {investments.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="size-5" />}
          title="No investments found"
          description="Subscriptions appear here as investors create them."
        />
      ) : (
        <>
          <TableScroll className="hidden lg:block">
            <Table className="min-w-[1120px]">
              <THead>
                <tr>
                  <TH>Reference</TH>
                  <TH>Investor</TH>
                  <TH>Package</TH>
                  <TH className="text-right">Principal</TH>
                  <TH className="text-right">Maturity</TH>
                  <TH>Status</TH>
                  <TH>Payment</TH>
                  <TH>Started</TH>
                  <TH>Matures</TH>
                  <TH>Cycle</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {investments.map((investment) => (
                  <TR key={investment.id}>
                    <TD className="font-mono text-[11.5px] text-fg">{investment.reference}</TD>
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
                      <StatusPill tone={INVESTMENT_STATUS_TONE[investment.status]}>
                        {INVESTMENT_STATUS_LABEL[investment.status]}
                      </StatusPill>
                    </TD>
                    <TD className="text-[12px]">
                      {investment.payments[0]
                        ? PAYMENT_STATUS_LABEL[investment.payments[0].status]
                        : "—"}
                    </TD>
                    <TD>{formatShortDate(investment.startedAt)}</TD>
                    <TD>{formatShortDate(investment.maturesAt)}</TD>
                    <TD className="text-[12px]">
                      {investment.cycle ? formatCycleLabel(investment.cycle.cycleStart) : "—"}
                    </TD>
                    <TD className="text-right">
                      <Link
                        href={`/admin/investments/${investment.id}`}
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

          <MobileCardList className="lg:hidden">
            {investments.map((investment) => (
              <MobileCard
                key={investment.id}
                title={investment.packageNameSnapshot}
                subtitle={investment.reference}
                right={
                  <StatusPill tone={INVESTMENT_STATUS_TONE[investment.status]}>
                    {INVESTMENT_STATUS_LABEL[investment.status]}
                  </StatusPill>
                }
                rows={[
                  { label: "Investor", value: investment.user.email },
                  { label: "Principal", value: formatUSD(investment.principalAmount) },
                  { label: "Maturity", value: formatUSD(investment.maturityAmount) },
                  { label: "Matures", value: formatShortDate(investment.maturesAt) },
                ]}
                footer={
                  <Link
                    href={`/admin/investments/${investment.id}`}
                    className="text-[13px] font-medium text-accent-300"
                  >
                    Inspect investment →
                  </Link>
                }
              />
            ))}
          </MobileCardList>

          <Pagination page={page} totalPages={totalPages} />
        </>
      )}
    </DashboardPage>
  );
}
