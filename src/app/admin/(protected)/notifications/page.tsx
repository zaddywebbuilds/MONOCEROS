import type { Metadata } from "next";

import { DashboardPage, PageTitle, Section } from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/feedback";
import { BroadcastForm } from "@/components/admin/review-forms";
import { prisma } from "@/lib/prisma";
import { formatBusinessDateTime } from "@/lib/time";
import { auditActionLabel } from "@/lib/audit";

export const metadata: Metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
  const [recent, broadcasts, counts] = await Promise.all([
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { user: { select: { email: true } } },
    }),
    prisma.auditLog.findMany({
      where: { action: "notification.broadcast" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.notification.aggregate({ _count: { _all: true } }),
  ]);

  const unread = await prisma.notification.count({ where: { isRead: false } });

  return (
    <DashboardPage className="max-w-6xl">
      <PageTitle
        title="Notifications"
        description={`${counts._count._all} notifications delivered, ${unread} still unread.`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:items-start">
        <div className="space-y-6">
          <Section title="Send a notification" className="mt-0">
            <Card className="p-5 sm:p-6">
              <BroadcastForm />
            </Card>
          </Section>

          <InfoNote tone="warning">
            Broadcasts go to every account in the selected audience. Keep them factual — no
            performance claims, no urgency pressure, no promises about returns beyond the terms
            each investor already holds.
          </InfoNote>

          {broadcasts.length > 0 ? (
            <Section title="Recent broadcasts" className="mt-0">
              <Card className="p-5">
                <ul className="space-y-3">
                  {broadcasts.map((record) => {
                    const value = record.newValue as {
                      title?: string;
                      recipients?: number;
                      audience?: string;
                    } | null;
                    return (
                      <li key={record.id} className="border-l border-ink-700 pl-3.5">
                        <p className="text-[12.5px] font-medium text-fg">
                          {value?.title ?? auditActionLabel(record.action)}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-fg-subtle">
                          {value?.recipients ?? 0} recipients · {value?.audience ?? "—"} ·{" "}
                          {formatBusinessDateTime(record.createdAt)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </Section>
          ) : null}
        </div>

        <Section title="Recently delivered" className="mt-0">
          <Card className="p-5">
            <ul className="space-y-3">
              {recent.map((notification) => (
                <li
                  key={notification.id}
                  className="border-b border-ink-700/50 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-[12.5px] font-medium text-fg">{notification.title}</p>
                    <span className="text-[11px] text-fg-subtle">
                      {formatBusinessDateTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">
                    {notification.message}
                  </p>
                  <p className="mt-1 break-all text-[11px] text-fg-subtle">
                    {notification.user.email}
                    {notification.isRead ? " · read" : " · unread"}
                  </p>
                </li>
              ))}
              {recent.length === 0 ? (
                <li className="text-[12.5px] text-fg-muted">Nothing delivered yet.</li>
              ) : null}
            </ul>
          </Card>
        </Section>
      </div>
    </DashboardPage>
  );
}
