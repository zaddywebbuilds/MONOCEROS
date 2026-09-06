import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  Breadcrumbs,
  DashboardPage,
  DetailRow,
  PageTitle,
} from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { TicketReplyForm } from "@/components/dashboard/support-forms";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { formatBusinessDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import {
  TICKET_CATEGORY_LABEL,
  TICKET_PRIORITY_LABEL,
  TICKET_STATUS_LABEL,
  TICKET_STATUS_TONE,
} from "@/lib/domain/support-status";

export const metadata: Metadata = { title: "Support ticket" };

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/support/${id}`);

  const ticket = await prisma.supportTicket.findFirst({
    where: { id, userId: user.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { include: { profile: true } } },
      },
    },
  });

  if (!ticket) notFound();

  return (
    <DashboardPage>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Support", href: "/dashboard/support" },
          { label: ticket.reference },
        ]}
      />

      <PageTitle
        title={ticket.subject}
        description={`Opened ${formatBusinessDateTime(ticket.createdAt)}`}
        actions={
          <StatusPill tone={TICKET_STATUS_TONE[ticket.status]}>
            {TICKET_STATUS_LABEL[ticket.status]}
          </StatusPill>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-5">
          <ol className="space-y-4">
            {ticket.messages.map((message) => (
              <li
                key={message.id}
                className={cn(
                  "rounded-xl border p-4",
                  message.isStaff
                    ? "border-accent-800/50 bg-accent-900/15"
                    : "border-ink-700 bg-ink-880/50",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12.5px] font-semibold text-fg">
                    {message.isStaff
                      ? "Monoceros support"
                      : (message.author?.profile?.firstName ?? "You")}
                  </p>
                  <p className="text-[11.5px] text-fg-subtle">
                    {formatBusinessDateTime(message.createdAt)}
                  </p>
                </div>
                <p className="mt-2.5 whitespace-pre-wrap text-[13px] leading-relaxed text-fg-muted">
                  {message.body}
                </p>
              </li>
            ))}
          </ol>

          <Card className="p-5">
            <TicketReplyForm ticketId={ticket.id} disabled={ticket.status === "CLOSED"} />
          </Card>
        </div>

        <Card className="p-5 lg:sticky lg:top-6">
          <h2 className="text-[14px] font-semibold text-fg">Ticket details</h2>
          <dl className="mt-3 border-t border-ink-700/60 pt-2">
            <DetailRow label="Reference" mono>
              {ticket.reference}
            </DetailRow>
            <DetailRow label="Category">{TICKET_CATEGORY_LABEL[ticket.category]}</DetailRow>
            <DetailRow label="Priority">{TICKET_PRIORITY_LABEL[ticket.priority]}</DetailRow>
            <DetailRow label="Status">{TICKET_STATUS_LABEL[ticket.status]}</DetailRow>
            <DetailRow label="Last activity">
              {formatBusinessDateTime(ticket.lastReplyAt)}
            </DetailRow>
          </dl>
        </Card>
      </div>
    </DashboardPage>
  );
}
