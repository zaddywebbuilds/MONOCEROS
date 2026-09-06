import type { Metadata } from "next";

import { Breadcrumbs, DashboardPage, PageTitle } from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/feedback";
import { NewTicketForm } from "@/components/dashboard/support-forms";
import { requireUser } from "@/lib/auth/rbac";

export const metadata: Metadata = { title: "New support ticket" };

export default async function NewTicketPage() {
  await requireUser("/dashboard/support/new");

  return (
    <DashboardPage>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Support", href: "/dashboard/support" },
          { label: "New ticket" },
        ]}
      />

      <PageTitle
        title="Open a support ticket"
        description="Tell us what you need. Include reference numbers where you have them — it speeds everything up."
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <Card className="p-5 sm:p-6">
          <NewTicketForm />
        </Card>

        <div className="space-y-4">
          <InfoNote tone="warning">
            Never share your password, a one-time code, or a wallet recovery phrase — not with
            support, and not with anyone claiming to be support.
          </InfoNote>
          <InfoNote>
            For payment questions, include the payment reference (MON-PAY-…) and the transaction
            hash. For withdrawals, include the withdrawal reference (MON-WDR-…).
          </InfoNote>
        </div>
      </div>
    </DashboardPage>
  );
}
