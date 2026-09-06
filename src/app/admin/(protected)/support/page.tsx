import type { Metadata } from "next";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import type { Prisma, TicketStatus } from "@prisma/client";

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
import { formatBusinessDateTime, formatShortDate } from "@/lib/time";
import {
  TICKET_CATEGORY_LABEL,
  TICKET_PRIORITY_LABEL,
  TICKET_STATUS_LABEL,
  TICKET_STATUS_TONE,
} from "@/lib/domain/support-status";

export const metadata: Metadata = { title: "Support" };

const PER_PAGE = 20;

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.SupportTicketWhereInput = {
    ...(params.status && params.status in TICKET_STATUS_LABEL
      ? { status: params.status as TicketStatus }
      : {}),
    ...(params.q
      ? {
          OR: [
            { reference: { contains: params.q, mode: "insensitive" } },
            { subject: { contains: params.q, mode: "insensitive" } },
            { user: { email: { contains: params.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [tickets, total, open] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      include: {
        user: { include: { profile: true } },
        _count: { select: { messages: true } },
      },
      orderBy: [{ status: "asc" }, { lastReplyAt: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <DashboardPage className="max-w-7xl">
      <PageTitle
        title="Support tickets"
        description={
          open > 0
            ? `${open} ticket${open === 1 ? "" : "s"} need attention.`
            : "No open tickets."
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput placeholder="Search reference, subject or email" className="w-full sm:w-96" />
        <FilterSelect
          paramName="status"
          label="Status"
          options={(Object.keys(TICKET_STATUS_LABEL) as TicketStatus[]).map((value) => ({
            value,
            label: TICKET_STATUS_LABEL[value],
          }))}
        />
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy className="size-5" />}
          title="No tickets found"
          description="Investor support requests appear here."
        />
      ) : (
        <>
          <TableScroll>
            <Table className="min-w-[900px]">
              <THead>
                <tr>
                  <TH>Reference</TH>
                  <TH>Subject</TH>
                  <TH>Investor</TH>
                  <TH>Category</TH>
                  <TH>Priority</TH>
                  <TH className="text-right">Messages</TH>
                  <TH>Last activity</TH>
                  <TH>Status</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {tickets.map((ticket) => (
                  <TR key={ticket.id}>
                    <TD className="font-mono text-[11.5px] text-fg">{ticket.reference}</TD>
                    <TD className="max-w-xs truncate text-fg" title={ticket.subject}>
                      {ticket.subject}
                    </TD>
                    <TD className="break-all">
                      <Link
                        href={`/admin/users/${ticket.userId}`}
                        className="hover:text-accent-300"
                      >
                        {ticket.user.profile
                          ? `${ticket.user.profile.firstName} ${ticket.user.profile.surname}`
                          : ticket.user.email}
                      </Link>
                    </TD>
                    <TD>{TICKET_CATEGORY_LABEL[ticket.category]}</TD>
                    <TD>{TICKET_PRIORITY_LABEL[ticket.priority]}</TD>
                    <TD className="text-right tabular-nums">{ticket._count.messages}</TD>
                    <TD title={formatBusinessDateTime(ticket.lastReplyAt)}>
                      {formatShortDate(ticket.lastReplyAt)}
                    </TD>
                    <TD>
                      <StatusPill tone={TICKET_STATUS_TONE[ticket.status]}>
                        {TICKET_STATUS_LABEL[ticket.status]}
                      </StatusPill>
                    </TD>
                    <TD className="text-right">
                      <Link
                        href={`/admin/support/${ticket.id}`}
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

          <Pagination page={page} totalPages={totalPages} />
        </>
      )}
    </DashboardPage>
  );
}
