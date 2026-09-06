import * as React from "react";
import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/shell";
import { requireUser } from "@/lib/auth/rbac";
import { unreadNotificationCount } from "@/lib/notifications";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Monoceros Dashboard" },
  robots: { index: false, follow: false, nocache: true },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/dashboard");

  const notifications = await unreadNotificationCount(user.id).catch(() => 0);
  const kyc = user.kycStatus === "APPROVED" ? 0 : 1;

  return (
    <DashboardShell user={user} counts={{ notifications, kyc }}>
      {children}
    </DashboardShell>
  );
}
