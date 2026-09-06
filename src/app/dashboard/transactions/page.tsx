import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import type { Prisma, TransactionStatus, TransactionType } from "@prisma/client";

import { DashboardPage, PageTitle } from "@/components/dashboard/page-parts";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { FilterSelect, Pagination } from "@/components/ui/interactive";
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
import { formatShortDate, formatBusinessDateTime } from "@/lib/time";
import { TRANSACTION_TYPE_LABEL } from "@/server/services/ledger";
import type { StatusTone } from "@/lib/domain/investment-status";

export const metadata: Metadata = { title: "Transactions" };

const PER_PAGE = 20;

const STATUS_TONE: Record<TransactionStatus, StatusTone> = {
  PENDING: "pending",
  COMPLETED: "active",
  FAILED: "rejected",
  CANCELLED: "neutral",
};

const TYPE_OPTIONS = Object.entries(TRANSACTION_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}));

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; page?: string }>;
}) {
  const user = await requireUser("/dashboard/transactions");
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.TransactionWhereInput = {
    userId: user.id,
    ...(params.type && params.type in TRANSACTION_TYPE_LABEL
      ? { type: params.type as TransactionType }
      : {}),
    ...(params.status && params.status in STATUS_TONE
      ? { status: params.status as TransactionStatus }
      : {}),
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.transaction.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <DashboardPage>
      <PageTitle
        title="Transactions"
        description="A dated record of every event on your account: deposits, activations, maturities, withdrawals and rollovers."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterSelect paramName="type" label="Type" options={TYPE_OPTIONS} />
        <FilterSelect
          paramName="status"
          label="Status"
          options={Object.keys(STATUS_TONE).map((value) => ({
            value,
            label: value.charAt(0) + value.slice(1).toLowerCase(),
          }))}
        />
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          icon={<Receipt className="size-5" />}
          title="No transactions to show"
          description={
            total === 0
              ? "Activity on your account will be recorded here."
              : "No transactions match the selected filters."
          }
        />
      ) : (
        <>
          <TableScroll className="hidden md:block">
            <Table>
              <THead>
                <tr>
                  <TH>Reference</TH>
                  <TH>Type</TH>
                  <TH>Description</TH>
                  <TH className="text-right">Amount</TH>
                  <TH>Status</TH>
                  <TH>Date</TH>
                </tr>
              </THead>
              <TBody>
                {transactions.map((transaction) => (
                  <TR key={transaction.id}>
                    <TD className="font-mono text-[11.5px] text-fg">{transaction.reference}</TD>
                    <TD className="text-fg">{TRANSACTION_TYPE_LABEL[transaction.type]}</TD>
                    <TD className="max-w-xs truncate">{transaction.description}</TD>
                    <TD className="text-right tabular-nums text-fg">
                      {formatUSD(transaction.amount)}
                    </TD>
                    <TD>
                      <StatusPill tone={STATUS_TONE[transaction.status]}>
                        {transaction.status.charAt(0) + transaction.status.slice(1).toLowerCase()}
                      </StatusPill>
                    </TD>
                    <TD title={formatBusinessDateTime(transaction.createdAt)}>
                      {formatShortDate(transaction.createdAt)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableScroll>

          <MobileCardList className="md:hidden">
            {transactions.map((transaction) => (
              <MobileCard
                key={transaction.id}
                title={TRANSACTION_TYPE_LABEL[transaction.type]}
                subtitle={transaction.reference}
                right={
                  <StatusPill tone={STATUS_TONE[transaction.status]}>
                    {transaction.status.charAt(0) + transaction.status.slice(1).toLowerCase()}
                  </StatusPill>
                }
                rows={[
                  { label: "Amount", value: formatUSD(transaction.amount) },
                  { label: "Date", value: formatShortDate(transaction.createdAt) },
                ]}
                footer={
                  <p className="text-[12px] leading-relaxed text-fg-muted">
                    {transaction.description}
                  </p>
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
