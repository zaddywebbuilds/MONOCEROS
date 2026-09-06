import type { Metadata } from "next";
import Link from "next/link";
import { Wallet } from "lucide-react";

import { DashboardPage, PageTitle } from "@/components/dashboard/page-parts";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
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
import { formatUSD } from "@/lib/money";
import { formatShortDate } from "@/lib/time";
import { truncateMiddle } from "@/lib/utils";
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from "@/lib/domain/investment-status";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const user = await requireUser("/dashboard/payments");

  const payments = await prisma.payment.findMany({
    where: { userId: user.id },
    include: { investment: { select: { id: true, packageNameSnapshot: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DashboardPage>
      <PageTitle
        title="Payments"
        description="Every subscription payment you have submitted, and where each one stands."
      />

      {payments.length === 0 ? (
        <EmptyState
          icon={<Wallet className="size-5" />}
          title="No payments yet"
          description="When you subscribe to a package, its payment appears here with instructions and status."
          actionLabel="View packages"
          actionHref="/dashboard/packages"
        />
      ) : (
        <>
          {/* Desktop */}
          <TableScroll className="hidden sm:block">
            <Table>
              <THead>
                <tr>
                  <TH>Reference</TH>
                  <TH>Package</TH>
                  <TH className="text-right">Expected</TH>
                  <TH className="text-right">Submitted</TH>
                  <TH>Transaction hash</TH>
                  <TH>Status</TH>
                  <TH>Date</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {payments.map((payment) => (
                  <TR key={payment.id}>
                    <TD className="font-mono text-[11.5px] text-fg">{payment.reference}</TD>
                    <TD className="text-fg">{payment.investment.packageNameSnapshot}</TD>
                    <TD className="text-right tabular-nums text-fg">
                      {formatUSD(payment.expectedAmount)}
                    </TD>
                    <TD className="text-right tabular-nums">
                      {payment.submittedAmount ? formatUSD(payment.submittedAmount) : "—"}
                    </TD>
                    <TD className="font-mono text-[11px]">
                      {payment.transactionHash ? truncateMiddle(payment.transactionHash) : "—"}
                    </TD>
                    <TD>
                      <StatusPill tone={PAYMENT_STATUS_TONE[payment.status]}>
                        {PAYMENT_STATUS_LABEL[payment.status]}
                      </StatusPill>
                    </TD>
                    <TD>{formatShortDate(payment.submittedAt ?? payment.createdAt)}</TD>
                    <TD className="text-right">
                      <Link
                        href={`/dashboard/payments/${payment.investmentId}`}
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

          {/* Mobile */}
          <MobileCardList className="sm:hidden">
            {payments.map((payment) => (
              <MobileCard
                key={payment.id}
                title={payment.investment.packageNameSnapshot}
                subtitle={payment.reference}
                right={
                  <StatusPill tone={PAYMENT_STATUS_TONE[payment.status]}>
                    {PAYMENT_STATUS_LABEL[payment.status]}
                  </StatusPill>
                }
                rows={[
                  { label: "Expected", value: formatUSD(payment.expectedAmount) },
                  {
                    label: "Submitted",
                    value: payment.submittedAmount ? formatUSD(payment.submittedAmount) : "—",
                  },
                  {
                    label: "TXID",
                    value: payment.transactionHash
                      ? truncateMiddle(payment.transactionHash, 6, 4)
                      : "—",
                  },
                  { label: "Date", value: formatShortDate(payment.submittedAt ?? payment.createdAt) },
                ]}
                footer={
                  <Link
                    href={`/dashboard/payments/${payment.investmentId}`}
                    className="text-[13px] font-medium text-accent-300"
                  >
                    Open payment →
                  </Link>
                }
              />
            ))}
          </MobileCardList>
        </>
      )}
    </DashboardPage>
  );
}
