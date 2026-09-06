import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine } from "lucide-react";

import { DashboardPage, PageTitle } from "@/components/dashboard/page-parts";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState, InfoNote } from "@/components/ui/feedback";
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
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatUSD } from "@/lib/money";
import { formatShortDate } from "@/lib/time";
import { truncateMiddle } from "@/lib/utils";
import { WITHDRAWAL_STATUS_LABEL, WITHDRAWAL_STATUS_TONE } from "@/lib/domain/investment-status";

export const metadata: Metadata = { title: "Withdrawals" };

export default async function WithdrawalsPage() {
  const user = await requireUser("/dashboard/withdrawals");

  const [withdrawals, maturedCount, settings] = await Promise.all([
    prisma.withdrawal.findMany({
      where: { userId: user.id },
      include: { investment: { select: { id: true, reference: true } } },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.investment.count({ where: { userId: user.id, status: "MATURED" } }),
    getSettings(),
  ]);

  return (
    <DashboardPage>
      <PageTitle
        title="Withdrawals"
        description="Withdrawal requests are reviewed and settled manually by the finance team."
      />

      {maturedCount > 0 ? (
        <InfoNote className="mb-6">
          You have {maturedCount} matured investment{maturedCount === 1 ? "" : "s"} available.{" "}
          <Link href="/dashboard/investments" className="font-medium underline underline-offset-2">
            Open it to withdraw or roll over
          </Link>
          .
        </InfoNote>
      ) : null}

      {withdrawals.length === 0 ? (
        <EmptyState
          icon={<ArrowDownToLine className="size-5" />}
          title="No withdrawal requests yet"
          description="Withdrawals become available once an investment reaches maturity. Open the matured investment to request one."
          actionLabel="View investments"
          actionHref="/dashboard/investments"
        />
      ) : (
        <>
          <TableScroll className="hidden md:block">
            <Table className="min-w-[800px]">
              <THead>
                <tr>
                  <TH>Reference</TH>
                  <TH>Investment</TH>
                  <TH className="text-right">Amount</TH>
                  <TH>Destination</TH>
                  <TH>Status</TH>
                  <TH>Requested</TH>
                  <TH>Settlement TXID</TH>
                </tr>
              </THead>
              <TBody>
                {withdrawals.map((withdrawal) => (
                  <TR key={withdrawal.id}>
                    <TD className="font-mono text-[11.5px] text-fg">{withdrawal.reference}</TD>
                    <TD>
                      <Link
                        href={`/dashboard/investments/${withdrawal.investmentId}`}
                        className="font-mono text-[11.5px] text-accent-300 hover:underline"
                      >
                        {withdrawal.investment.reference}
                      </Link>
                    </TD>
                    <TD className="text-right tabular-nums text-fg">
                      {formatUSD(withdrawal.amount)}
                    </TD>
                    <TD className="font-mono text-[11px]">
                      {withdrawal.walletAddress
                        ? `${withdrawal.walletNetwork} · ${truncateMiddle(withdrawal.walletAddress, 6, 5)}`
                        : "—"}
                    </TD>
                    <TD>
                      <StatusPill tone={WITHDRAWAL_STATUS_TONE[withdrawal.status]}>
                        {WITHDRAWAL_STATUS_LABEL[withdrawal.status]}
                      </StatusPill>
                    </TD>
                    <TD>{formatShortDate(withdrawal.requestedAt)}</TD>
                    <TD className="font-mono text-[11px]">
                      {withdrawal.paymentTxid ? truncateMiddle(withdrawal.paymentTxid) : "—"}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableScroll>

          <MobileCardList className="md:hidden">
            {withdrawals.map((withdrawal) => (
              <MobileCard
                key={withdrawal.id}
                title={formatUSD(withdrawal.amount)}
                subtitle={withdrawal.reference}
                right={
                  <StatusPill tone={WITHDRAWAL_STATUS_TONE[withdrawal.status]}>
                    {WITHDRAWAL_STATUS_LABEL[withdrawal.status]}
                  </StatusPill>
                }
                rows={[
                  { label: "Network", value: withdrawal.walletNetwork ?? "—" },
                  {
                    label: "Destination",
                    value: withdrawal.walletAddress
                      ? truncateMiddle(withdrawal.walletAddress, 6, 4)
                      : "—",
                  },
                  { label: "Requested", value: formatShortDate(withdrawal.requestedAt) },
                  {
                    label: "Settled",
                    value: withdrawal.paymentTxid
                      ? truncateMiddle(withdrawal.paymentTxid, 6, 4)
                      : "—",
                  },
                ]}
              />
            ))}
          </MobileCardList>
        </>
      )}

      <p className="mt-6 text-[12px] leading-relaxed text-fg-subtle">
        {settings["withdrawal.instructions"]}
      </p>
    </DashboardPage>
  );
}
