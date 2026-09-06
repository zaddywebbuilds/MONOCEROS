import * as React from "react";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { getPublicSettings } from "@/lib/settings";
import { getSession } from "@/lib/auth/session";
import { MaintenanceNotice } from "@/components/site/maintenance";
import { isStaff } from "@/lib/auth/rbac";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, session] = await Promise.all([
    getPublicSettings(),
    getSession().catch(() => null),
  ]);

  // Maintenance mode closes the public site to everyone except staff, who need
  // to be able to check their work while it is on.
  if (settings["maintenance.enabled"] && !(session && isStaff(session.user.role))) {
    return <MaintenanceNotice message={settings["maintenance.message"]} />;
  }

  if (!settings) notFound();

  return (
    <div className="relative flex min-h-dvh flex-col">
      <SiteHeader
        isAuthenticated={Boolean(session)}
        announcement={settings["content.announcement"] || undefined}
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter settings={settings} />
    </div>
  );
}
