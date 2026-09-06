import type { Metadata } from "next";
import Link from "next/link";
import { Receipt } from "lucide-react";
import type { Prisma, TransactionStatus, TransactionType } from "@prisma/client";

import { DashboardPage, PageTitle } from "@/components/dashboard/page-parts";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { FilterSelect, Pagination, SearchInput } from "@/components/ui/interactive";
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
import { formatUSD } from "@/lib/money";
import { formatBusinessDateTime, formatShortDate } from "@/lib/time";
import { TRANSACTION_TYPE_LABEL } from "@/server/services/ledger";
import type { StatusTone } from "@/lib/domain/investment-status";

export const metadata: Metadata = { title: "Transactions" };

const PER_PAGE = 25;

const STATUS_TONE: Record<TransactionStatus, StatusTone> = {
  PENDING: "pending",
  COMPLETED: "active",
  FAILED: "rejected",
  CANCELLED: "neutral",
};

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.TransactionWhereInput = {
    ...(params.type && params.type in TRANSACTION_TYPE_LABEL
      ? { type: params.type as TransactionType }
      : {}),
    ...(params.status && params.status in STATUS_TONE
      ? { status: params.status as TransactionStatus }
      : {}),
    ...(params.q
      ? {
          OR: [
            { reference: { contains: params.q, mode: "insensitive" } },
            { description: { contains: params.q, mode: "insensitive" } },
            { user: { email: { contains: params.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { user: { select: { id: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.transaction.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <DashboardPage className="max-w-7xl">
      <PageTitle
        title="Transactions"
        description={`${total} ledger entries across every account.`}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput placeholder="Search reference, description or email" className="w-full sm:w-96" />
        <FilterSelect
          paramName="type"
          label="Type"
          options={Object.entries(TRANSACTION_TYPE_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
        />
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
          title="No transactions found"
          description="Ledger entries are written automatically as events occur."
        />
      ) : (
        <>
          <TableScroll>
            <Table className="min-w-[900px]">
              <THead>
                <tr>
                  <TH>Reference</TH>
                  <TH>Investor</TH>
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
                    <TD>
                      <Link
                        href={`/admin/users/${transaction.userId}`}
                        className="break-all hover:text-accent-300"
                      >
                        {transaction.user.email}
                      </Link>
                    </TD>
                    <TD className="text-fg">{TRANSACTION_TYPE_LABEL[transaction.type]}</TD>
                    <TD className="max-w-xs truncate" title={transaction.description}>
                      {transaction.description}
                    </TD>
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

          <Pagination page={page} totalPages={totalPages} />
        </>
      )}
    </DashboardPage>
  );
}
