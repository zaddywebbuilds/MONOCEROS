import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CheckCircle2, Info, TriangleAlert, XCircle } from "lucide-react";
import type { NotificationType } from "@prisma/client";

import { DashboardPage, PageTitle } from "@/components/dashboard/page-parts";
import { EmptyState } from "@/components/ui/feedback";
import { MarkAllReadButton } from "@/components/dashboard/notification-actions";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { formatBusinessDateTime } from "@/lib/time";
import { markNotificationReadAction } from "@/server/actions/account";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

const ICONS: Record<NotificationType, typeof Info> = {
  INFO: Info,
  SUCCESS: CheckCircle2,
  WARNING: TriangleAlert,
  ERROR: XCircle,
};

const TONE: Record<NotificationType, string> = {
  INFO: "border-ink-600 bg-ink-850 text-fg-muted",
  SUCCESS: "border-accent-700/50 bg-accent-900/30 text-accent-300",
  WARNING: "border-status-pending/40 bg-status-pending/10 text-status-pending",
  ERROR: "border-status-rejected/40 bg-status-rejected/10 text-status-rejected",
};

export default async function NotificationsPage() {
  const user = await requireUser("/dashboard/notifications");

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <DashboardPage>
      <PageTitle
        title="Notifications"
        description={
          unread > 0
            ? `${unread} unread notification${unread === 1 ? "" : "s"}.`
            : "You are up to date."
        }
        actions={unread > 0 ? <MarkAllReadButton /> : undefined}
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="size-5" />}
          title="No notifications yet"
          description="Account activity — verification decisions, payment approvals, activations and maturities — appears here."
        />
      ) : (
        <ul className="space-y-3">
          {notifications.map((notification) => {
            const Icon = ICONS[notification.type];
            return (
              <li
                key={notification.id}
                className={cn(
                  "surface-muted flex items-start gap-3.5 p-4",
                  !notification.isRead && "border-accent-800/60",
                )}
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg border",
                    TONE[notification.type],
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13.5px] font-medium text-fg">{notification.title}</p>
                    {!notification.isRead ? (
                      <span className="rounded-full bg-accent-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-300">
                        New
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">
                    {notification.message}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="text-[11.5px] text-fg-subtle">
                      {formatBusinessDateTime(notification.createdAt)}
                    </span>
                    {notification.link ? (
                      <Link
                        href={notification.link}
                        className="text-[12px] font-medium text-accent-300 hover:underline"
                      >
                        Open
                      </Link>
                    ) : null}
                    {!notification.isRead ? (
                      <form action={markNotificationReadAction}>
                        <input type="hidden" name="notificationId" value={notification.id} />
                        <button
                          type="submit"
                          className="text-[12px] text-fg-subtle transition-colors hover:text-fg"
                        >
                          Mark as read
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardPage>
  );
}
