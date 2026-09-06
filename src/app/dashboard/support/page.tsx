import type { Metadata } from "next";
import Link from "next/link";
import { LifeBuoy, MessageCircle, Plus } from "lucide-react";

import { DashboardPage, PageTitle } from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatBusinessDateTime } from "@/lib/time";
import {
  TICKET_STATUS_LABEL,
  TICKET_STATUS_TONE,
} from "@/lib/domain/support-status";

export const metadata: Metadata = { title: "Support" };

export default async function SupportPage() {
  const user = await requireUser("/dashboard/support");

  const [tickets, settings] = await Promise.all([
    prisma.supportTicket.findMany({
      where: { userId: user.id },
      include: { _count: { select: { messages: true } } },
      orderBy: { lastReplyAt: "desc" },
    }),
    getSettings(),
  ]);

  const whatsapp = settings["support.whatsapp"];

  return (
    <DashboardPage>
      <PageTitle
        title="Support"
        description="Tickets keep a written record against your account. Use them for anything involving money or your identity."
        actions={
          <ButtonLink href="/dashboard/support/new" size="sm">
            <Plus />
            New ticket
          </ButtonLink>
        }
      />

      {whatsapp ? (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg border border-ink-600 bg-ink-850 text-accent-300">
              <MessageCircle className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-[13.5px] font-medium text-fg">WhatsApp support</p>
              <p className="mt-0.5 text-[12px] text-fg-subtle">{settings["support.hours"]}</p>
            </div>
          </div>
          <a
            href={`https://wa.me/${whatsapp.replace(/[^\d]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-medium text-accent-300 hover:underline"
          >
            Open WhatsApp →
          </a>
        </Card>
      ) : null}

      {tickets.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy className="size-5" />}
          title="No support tickets yet"
          description="Open a ticket and the support team will reply. Everything stays on the record."
          actionLabel="Open a ticket"
          actionHref="/dashboard/support/new"
        />
      ) : (
        <ul className="space-y-3">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/dashboard/support/${ticket.id}`}
                className="surface-muted flex items-start justify-between gap-4 p-4 transition-colors hover:border-accent-800"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-fg">{ticket.subject}</p>
                  <p className="mt-1 font-mono text-[11px] text-fg-subtle">{ticket.reference}</p>
                  <p className="mt-1.5 text-[12px] text-fg-muted">
                    {ticket._count.messages} message{ticket._count.messages === 1 ? "" : "s"} · last
                    activity {formatBusinessDateTime(ticket.lastReplyAt)}
                  </p>
                </div>
                <StatusPill tone={TICKET_STATUS_TONE[ticket.status]}>
                  {TICKET_STATUS_LABEL[ticket.status]}
                </StatusPill>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardPage>
  );
}
