import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import type { Prisma } from "@prisma/client";

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
import { formatShortDate } from "@/lib/time";
import { KYC_STATUS_LABEL, KYC_STATUS_TONE } from "@/lib/domain/investment-status";

export const metadata: Metadata = { title: "Users" };

const PER_PAGE = 20;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const filter = params.filter ?? "";

  const where: Prisma.UserWhereInput = {
    role: "USER",
    ...(filter === "verified" ? { kycStatus: "APPROVED" } : {}),
    ...(filter === "unverified" ? { kycStatus: { not: "APPROVED" } } : {}),
    ...(filter === "suspended" ? { status: "SUSPENDED" } : {}),
    ...(params.q
      ? {
          OR: [
            { email: { contains: params.q, mode: "insensitive" } },
            { reference: { contains: params.q, mode: "insensitive" } },
            {
              profile: {
                OR: [
                  { firstName: { contains: params.q, mode: "insensitive" } },
                  { surname: { contains: params.q, mode: "insensitive" } },
                  { phone: { contains: params.q, mode: "insensitive" } },
                ],
              },
            },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        profile: true,
        _count: { select: { investments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.user.count({ where }),
  ]);

  // Totals per user, computed in one grouped query rather than N queries.
  const totals = await prisma.investment.groupBy({
    by: ["userId"],
    where: {
      userId: { in: users.map((user) => user.id) },
      status: { in: ["QUEUED", "ACTIVE", "MATURED", "WITHDRAWAL_REQUESTED", "COMPLETED", "ROLLED_OVER"] },
    },
    _sum: { principalAmount: true },
  });
  const investedByUser = new Map(totals.map((row) => [row.userId, row._sum.principalAmount]));

  const activeCounts = await prisma.investment.groupBy({
    by: ["userId"],
    where: { userId: { in: users.map((user) => user.id) }, status: "ACTIVE" },
    _count: { _all: true },
  });
  const activeByUser = new Map(activeCounts.map((row) => [row.userId, row._count._all]));

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <DashboardPage className="max-w-7xl">
      <PageTitle title="Users" description={`${total} investor account${total === 1 ? "" : "s"}.`} />

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput placeholder="Search name, email, phone or reference" className="w-full sm:w-96" />
        <FilterSelect
          paramName="filter"
          label="Filter"
          options={[
            { value: "verified", label: "Verified" },
            { value: "unverified", label: "Unverified" },
            { value: "suspended", label: "Suspended" },
          ]}
        />
      </div>

      {users.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5" />}
          title="No accounts found"
          description="Registered investor accounts appear here."
        />
      ) : (
        <>
          <TableScroll className="hidden lg:block">
            <Table className="min-w-[1000px]">
              <THead>
                <tr>
                  <TH>Name</TH>
                  <TH>Email</TH>
                  <TH>Phone</TH>
                  <TH>KYC</TH>
                  <TH>Account</TH>
                  <TH>Registered</TH>
                  <TH className="text-right">Total invested</TH>
                  <TH className="text-right">Active</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {users.map((user) => (
                  <TR key={user.id}>
                    <TD className="text-fg">
                      {user.profile
                        ? `${user.profile.firstName} ${user.profile.surname}`
                        : "—"}
                      <span className="mt-0.5 block font-mono text-[10.5px] text-fg-subtle">
                        {user.reference}
                      </span>
                    </TD>
                    <TD className="break-all">{user.email}</TD>
                    <TD className="font-mono text-[11.5px]">{user.profile?.phone ?? "—"}</TD>
                    <TD>
                      <StatusPill tone={KYC_STATUS_TONE[user.kycStatus]}>
                        {KYC_STATUS_LABEL[user.kycStatus]}
                      </StatusPill>
                    </TD>
                    <TD>
                      <StatusPill tone={user.status === "ACTIVE" ? "active" : "rejected"}>
                        {user.status === "ACTIVE" ? "Active" : "Suspended"}
                      </StatusPill>
                    </TD>
                    <TD>{formatShortDate(user.createdAt)}</TD>
                    <TD className="text-right tabular-nums text-fg">
                      {formatUSD(investedByUser.get(user.id) ?? 0)}
                    </TD>
                    <TD className="text-right tabular-nums">{activeByUser.get(user.id) ?? 0}</TD>
                    <TD className="text-right">
                      <Link
                        href={`/admin/users/${user.id}`}
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
            {users.map((user) => (
              <MobileCard
                key={user.id}
                title={
                  user.profile ? `${user.profile.firstName} ${user.profile.surname}` : user.email
                }
                subtitle={user.reference}
                right={
                  <StatusPill tone={KYC_STATUS_TONE[user.kycStatus]}>
                    {KYC_STATUS_LABEL[user.kycStatus]}
                  </StatusPill>
                }
                rows={[
                  { label: "Email", value: user.email },
                  { label: "Phone", value: user.profile?.phone ?? "—" },
                  { label: "Invested", value: formatUSD(investedByUser.get(user.id) ?? 0) },
                  { label: "Active", value: activeByUser.get(user.id) ?? 0 },
                ]}
                footer={
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="text-[13px] font-medium text-accent-300"
                  >
                    Open account →
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
