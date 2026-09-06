import type { Metadata } from "next";
import Link from "next/link";
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
import { TicketStatusForm } from "@/components/admin/ticket-status-form";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { formatBusinessDateTime } from "@/lib/time";
import {
  TICKET_CATEGORY_LABEL,
  TICKET_PRIORITY_LABEL,
  TICKET_STATUS_LABEL,
  TICKET_STATUS_TONE,
} from "@/lib/domain/support-status";
import { KYC_STATUS_LABEL } from "@/lib/domain/investment-status";

export const metadata: Metadata = { title: "Ticket" };

export default async function AdminTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { include: { profile: true, _count: { select: { investments: true } } } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { include: { profile: true } } },
      },
    },
  });

  if (!ticket) notFound();

  const profile = ticket.user.profile;

  return (
    <DashboardPage className="max-w-6xl">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Support", href: "/admin/support" },
          { label: ticket.reference },
        ]}
      />

      <PageTitle
        title={ticket.subject}
        description={`Opened ${formatBusinessDateTime(ticket.createdAt)} by ${ticket.user.email}`}
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
                    ? "border-gold-600/35 bg-gold-600/[0.06]"
                    : "border-ink-700 bg-ink-880/50",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12.5px] font-semibold text-fg">
                    {message.isStaff
                      ? `Support · ${message.author?.email ?? "staff"}`
                      : (profile ? `${profile.firstName} ${profile.surname}` : ticket.user.email)}
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
            <h2 className="text-[14px] font-semibold text-fg">Reply as support</h2>
            <p className="mt-1 text-[12px] text-fg-subtle">
              The investor is notified by email and in their dashboard.
            </p>
            <div className="mt-4">
              <TicketReplyForm ticketId={ticket.id} disabled={ticket.status === "CLOSED"} />
            </div>
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-6">
          <Card className="p-5">
            <h2 className="text-[14px] font-semibold text-fg">Ticket</h2>
            <dl className="mt-3 border-t border-ink-700/60 pt-2">
              <DetailRow label="Reference" mono>
                {ticket.reference}
              </DetailRow>
              <DetailRow label="Category">{TICKET_CATEGORY_LABEL[ticket.category]}</DetailRow>
              <DetailRow label="Priority">{TICKET_PRIORITY_LABEL[ticket.priority]}</DetailRow>
              <DetailRow label="Last activity">
                {formatBusinessDateTime(ticket.lastReplyAt)}
              </DetailRow>
            </dl>
            <div className="mt-4 border-t border-ink-700/60 pt-4">
              <TicketStatusForm ticketId={ticket.id} currentStatus={ticket.status} />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-[14px] font-semibold text-fg">Investor</h2>
            <dl className="mt-3 border-t border-ink-700/60 pt-2">
              <DetailRow label="Name">
                {profile ? `${profile.firstName} ${profile.surname}` : "—"}
              </DetailRow>
              <DetailRow label="Email">{ticket.user.email}</DetailRow>
              <DetailRow label="Phone" mono>
                {profile?.phone ?? "—"}
              </DetailRow>
              <DetailRow label="Verification">
                {KYC_STATUS_LABEL[ticket.user.kycStatus]}
              </DetailRow>
              <DetailRow label="Investments">{ticket.user._count.investments}</DetailRow>
            </dl>
            <Link
              href={`/admin/users/${ticket.userId}`}
              className="mt-4 inline-block text-[13px] font-medium text-accent-300 hover:underline"
            >
              Open full account →
            </Link>
          </Card>
        </div>
      </div>
    </DashboardPage>
  );
}
