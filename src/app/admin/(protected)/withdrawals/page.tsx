import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import type { Prisma, WithdrawalStatus } from "@prisma/client";

import { DashboardPage, PageTitle } from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState, InfoNote } from "@/components/ui/feedback";
import { CopyButton, FilterSelect, Pagination, SearchInput } from "@/components/ui/interactive";
import { WithdrawalDecisionForm } from "@/components/admin/review-forms";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import { formatBusinessDateTime, formatShortDate } from "@/lib/time";
import { WITHDRAWAL_STATUS_LABEL, WITHDRAWAL_STATUS_TONE } from "@/lib/domain/investment-status";

export const metadata: Metadata = { title: "Withdrawals" };

const PER_PAGE = 15;

const OPEN_STATUSES: WithdrawalStatus[] = ["PENDING", "UNDER_REVIEW", "APPROVED", "PROCESSING"];

export default async function AdminWithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.WithdrawalWhereInput = {
    ...(params.status && params.status in WITHDRAWAL_STATUS_LABEL
      ? { status: params.status as WithdrawalStatus }
      : {}),
    ...(params.q
      ? {
          OR: [
            { reference: { contains: params.q, mode: "insensitive" } },
            { walletAddress: { contains: params.q, mode: "insensitive" } },
            { user: { email: { contains: params.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [withdrawals, total, open] = await Promise.all([
    prisma.withdrawal.findMany({
      where,
      include: {
        user: { include: { profile: true } },
        investment: { select: { id: true, reference: true, packageNameSnapshot: true } },
      },
      orderBy: [{ status: "asc" }, { requestedAt: "asc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.withdrawal.count({ where }),
    prisma.withdrawal.count({ where: { status: { in: OPEN_STATUSES } } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <DashboardPage className="max-w-7xl">
      <PageTitle
        title="Withdrawals"
        description={
          open > 0
            ? `${open} withdrawal${open === 1 ? "" : "s"} awaiting action.`
            : "No withdrawals are awaiting action."
        }
      />

      <InfoNote tone="warning" className="mb-5">
        Settlement is manual. Only mark a withdrawal <strong className="font-semibold">Paid</strong>{" "}
        after the transfer has actually left the company wallet, and record the settlement hash so
        the investor has a receipt.
      </InfoNote>

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput placeholder="Search reference, wallet or email" className="w-full sm:w-96" />
        <FilterSelect
          paramName="status"
          label="Status"
          options={(Object.keys(WITHDRAWAL_STATUS_LABEL) as WithdrawalStatus[]).map((value) => ({
            value,
            label: WITHDRAWAL_STATUS_LABEL[value],
          }))}
        />
      </div>

      {withdrawals.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-5" />}
          title="No withdrawals found"
          description="Requests appear here once investors reach maturity and ask to withdraw."
        />
      ) : (
        <>
          <ul className="space-y-4">
            {withdrawals.map((withdrawal) => {
              const profile = withdrawal.user.profile;
              const actionable = OPEN_STATUSES.includes(withdrawal.status);

              return (
                <li key={withdrawal.id}>
                  <Card className="p-5">
                    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-mono text-[11.5px] text-fg">
                              {withdrawal.reference}
                            </p>
                            <p className="mt-1 text-[14px] font-semibold text-fg">
                              {formatUSD(withdrawal.amount)}
                            </p>
                          </div>
                          <StatusPill tone={WITHDRAWAL_STATUS_TONE[withdrawal.status]}>
                            {WITHDRAWAL_STATUS_LABEL[withdrawal.status]}
                          </StatusPill>
                        </div>

                        <dl className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                          <div>
                            <dt className="text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">
                              Investor
                            </dt>
                            <dd className="mt-0.5 text-[12.5px] text-fg">
                              <Link
                                href={`/admin/users/${withdrawal.userId}`}
                                className="hover:text-accent-300"
                              >
                                {profile
                                  ? `${profile.firstName} ${profile.surname}`
                                  : withdrawal.user.email}
                              </Link>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">
                              Investment
                            </dt>
                            <dd className="mt-0.5 text-[12.5px]">
                              <Link
                                href={`/admin/investments/${withdrawal.investmentId}`}
                                className="font-mono text-accent-300 hover:underline"
                              >
                                {withdrawal.investment.reference}
                              </Link>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">
                              Network
                            </dt>
                            <dd className="mt-0.5 text-[12.5px] text-fg">
                              {withdrawal.walletNetwork ?? "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">
                              Requested
                            </dt>
                            <dd
                              className="mt-0.5 text-[12.5px] text-fg"
                              title={formatBusinessDateTime(withdrawal.requestedAt)}
                            >
                              {formatShortDate(withdrawal.requestedAt)}
                            </dd>
                          </div>
                        </dl>

                        {withdrawal.walletAddress ? (
                          <div className="mt-4">
                            <p className="text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">
                              Destination address
                            </p>
                            <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
                              <code className="min-w-0 flex-1 break-all rounded-lg border border-ink-600 bg-ink-900/70 px-3 py-2 font-mono text-[11.5px] text-fg">
                                {withdrawal.walletAddress}
                              </code>
                              <CopyButton value={withdrawal.walletAddress} label="Copy" />
                            </div>
                          </div>
                        ) : null}

                        {withdrawal.paymentTxid ? (
                          <p className="mt-3 break-all font-mono text-[11.5px] text-fg-muted">
                            Settlement TXID: {withdrawal.paymentTxid}
                          </p>
                        ) : null}
                        {withdrawal.rejectionReason ? (
                          <p className="mt-3 text-[12.5px] text-status-rejected">
                            {withdrawal.rejectionReason}
                          </p>
                        ) : null}
                      </div>

                      <div className="border-t border-ink-700/60 pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                        {actionable ? (
                          <WithdrawalDecisionForm
                            withdrawalId={withdrawal.id}
                            amount={formatUSD(withdrawal.amount)}
                            currentStatus={withdrawal.status}
                          />
                        ) : (
                          <p className="text-[12.5px] text-fg-muted">
                            This withdrawal is {WITHDRAWAL_STATUS_LABEL[withdrawal.status].toLowerCase()}
                            {withdrawal.processedAt
                              ? ` (${formatBusinessDateTime(withdrawal.processedAt)})`
                              : ""}
                            .
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>

          <Pagination page={page} totalPages={totalPages} />
        </>
      )}
    </DashboardPage>
  );
}
