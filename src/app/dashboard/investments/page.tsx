import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp } from "lucide-react";

import { DashboardPage, PageTitle } from "@/components/dashboard/page-parts";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { RemainingLabel } from "@/components/countdown";
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
import { requireUser } from "@/lib/auth/rbac";
import { getUserInvestments } from "@/server/services/investments";
import { formatUSD } from "@/lib/money";
import { formatShortDate } from "@/lib/time";
import {
  INVESTMENT_STATUS_LABEL,
  INVESTMENT_STATUS_TONE,
  nextActionFor,
} from "@/lib/domain/investment-status";

export const metadata: Metadata = { title: "Investments" };

export default async function InvestmentsPage() {
  const user = await requireUser("/dashboard/investments");
  const investments = await getUserInvestments(user.id);

  return (
    <DashboardPage>
      <PageTitle
        title="Investments"
        description="Every subscription you have made, with its stage, dates and the next action."
        actions={
          user.kycStatus === "APPROVED" ? (
            <ButtonLink href="/dashboard/packages" size="sm">
              New investment
            </ButtonLink>
          ) : null
        }
      />

      {investments.length === 0 ? (
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
      ) : (
        <>
          <TableScroll className="hidden md:block">
            <Table className="min-w-[860px]">
              <THead>
                <tr>
                  <TH>Reference</TH>
                  <TH>Package</TH>
                  <TH className="text-right">Capital</TH>
                  <TH className="text-right">Maturity value</TH>
                  <TH>Status</TH>
                  <TH>Started</TH>
                  <TH>Matures</TH>
                  <TH>Remaining</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {investments.map((investment) => (
                  <TR key={investment.id}>
                    <TD className="font-mono text-[11.5px] text-fg">{investment.reference}</TD>
                    <TD className="text-fg">{investment.packageNameSnapshot}</TD>
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
                    <TD>{formatShortDate(investment.startedAt)}</TD>
                    <TD>{formatShortDate(investment.maturesAt)}</TD>
                    <TD>
                      {investment.status === "ACTIVE" && investment.maturesAt ? (
                        <RemainingLabel target={investment.maturesAt.toISOString()} />
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD className="text-right">
                      <Link
                        href={`/dashboard/investments/${investment.id}`}
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

          <MobileCardList className="md:hidden">
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
                  { label: "Capital", value: formatUSD(investment.principalAmount) },
                  { label: "Maturity", value: formatUSD(investment.maturityAmount) },
                  { label: "Started", value: formatShortDate(investment.startedAt) },
                  { label: "Matures", value: formatShortDate(investment.maturesAt) },
                ]}
                footer={
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] text-fg-subtle">
                      {nextActionFor(investment.status)}
                    </span>
                    <Link
                      href={`/dashboard/investments/${investment.id}`}
                      className="shrink-0 text-[13px] font-medium text-accent-300"
                    >
                      Open →
                    </Link>
                  </div>
                }
              />
            ))}
          </MobileCardList>
        </>
      )}
    </DashboardPage>
  );
}
