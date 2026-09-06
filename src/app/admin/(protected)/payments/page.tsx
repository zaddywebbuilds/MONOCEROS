import type { Metadata } from "next";
import Link from "next/link";
import { Wallet } from "lucide-react";
import type { PaymentStatus, Prisma } from "@prisma/client";

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
import { formatShortDate, formatBusinessDateTime } from "@/lib/time";
import { truncateMiddle } from "@/lib/utils";
import {
  KYC_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
} from "@/lib/domain/investment-status";

export const metadata: Metadata = { title: "Payments" };

const PER_PAGE = 20;

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.PaymentWhereInput = {
    ...(params.status && params.status in PAYMENT_STATUS_LABEL
      ? { status: params.status as PaymentStatus }
      : { status: { not: "PENDING" } }),
    ...(params.q
      ? {
          OR: [
            { reference: { contains: params.q, mode: "insensitive" } },
            { transactionHash: { contains: params.q, mode: "insensitive" } },
            { user: { email: { contains: params.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [payments, total, waiting] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        user: { include: { profile: true } },
        investment: { select: { id: true, packageNameSnapshot: true, reference: true } },
      },
      orderBy: [{ status: "asc" }, { submittedAt: "asc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.payment.count({ where }),
    prisma.payment.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <DashboardPage className="max-w-7xl">
      <PageTitle
        title="Payment verification"
        description={
          waiting > 0
            ? `${waiting} payment${waiting === 1 ? "" : "s"} awaiting manual verification.`
            : "No payments are waiting for verification."
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput placeholder="Search reference, TXID or email" className="w-full sm:w-80" />
        <FilterSelect
          paramName="status"
          label="Status"
          options={(Object.keys(PAYMENT_STATUS_LABEL) as PaymentStatus[]).map((value) => ({
            value,
            label: PAYMENT_STATUS_LABEL[value],
          }))}
        />
      </div>

      {payments.length === 0 ? (
        <EmptyState
          icon={<Wallet className="size-5" />}
          title="No payments found"
          description="Submitted payments appear here for manual verification."
        />
      ) : (
        <>
          <TableScroll className="hidden lg:block">
            <Table className="min-w-[1020px]">
              <THead>
                <tr>
                  <TH>Reference</TH>
                  <TH>Investor</TH>
                  <TH>Package</TH>
                  <TH className="text-right">Expected</TH>
                  <TH className="text-right">Submitted</TH>
                  <TH>TXID</TH>
                  <TH>KYC</TH>
                  <TH>Status</TH>
                  <TH>Date</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {payments.map((payment) => {
                  const mismatch =
                    payment.submittedAmount &&
                    !payment.submittedAmount.equals(payment.expectedAmount);
                  return (
                    <TR key={payment.id}>
                      <TD className="font-mono text-[11.5px] text-fg">{payment.reference}</TD>
                      <TD className="text-fg">
                        {payment.user.profile
                          ? `${payment.user.profile.firstName} ${payment.user.profile.surname}`
                          : payment.user.email}
                      </TD>
                      <TD>{payment.investment.packageNameSnapshot}</TD>
                      <TD className="text-right tabular-nums text-fg">
                        {formatUSD(payment.expectedAmount)}
                      </TD>
                      <TD
                        className={
                          mismatch
                            ? "text-right tabular-nums font-semibold text-status-pending"
                            : "text-right tabular-nums"
                        }
                      >
                        {payment.submittedAmount ? formatUSD(payment.submittedAmount) : "—"}
                      </TD>
                      <TD className="font-mono text-[11px]">
                        {payment.transactionHash ? truncateMiddle(payment.transactionHash) : "—"}
                      </TD>
                      <TD className="text-[12px]">{KYC_STATUS_LABEL[payment.user.kycStatus]}</TD>
                      <TD>
                        <StatusPill tone={PAYMENT_STATUS_TONE[payment.status]}>
                          {PAYMENT_STATUS_LABEL[payment.status]}
                        </StatusPill>
                      </TD>
                      <TD title={formatBusinessDateTime(payment.submittedAt ?? payment.createdAt)}>
                        {formatShortDate(payment.submittedAt ?? payment.createdAt)}
                      </TD>
                      <TD className="text-right">
                        <Link
                          href={`/admin/payments/${payment.id}`}
                          className="text-[12.5px] font-medium text-accent-300 hover:underline"
                        >
                          Review
                        </Link>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableScroll>

          <MobileCardList className="lg:hidden">
            {payments.map((payment) => (
              <MobileCard
                key={payment.id}
                title={payment.user.email}
                subtitle={payment.reference}
                right={
                  <StatusPill tone={PAYMENT_STATUS_TONE[payment.status]}>
                    {PAYMENT_STATUS_LABEL[payment.status]}
                  </StatusPill>
                }
                rows={[
                  { label: "Package", value: payment.investment.packageNameSnapshot },
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
                ]}
                footer={
                  <Link
                    href={`/admin/payments/${payment.id}`}
                    className="text-[13px] font-medium text-accent-300"
                  >
                    Review payment →
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
