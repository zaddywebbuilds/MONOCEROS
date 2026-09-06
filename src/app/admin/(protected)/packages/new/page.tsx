import type { Metadata } from "next";

import { Breadcrumbs, DashboardPage, PageTitle } from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { PackageForm } from "@/components/admin/package-form";

export const metadata: Metadata = { title: "New package" };

export default function NewPackagePage() {
  return (
    <DashboardPage className="max-w-3xl">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Packages", href: "/admin/packages" },
          { label: "New" },
        ]}
      />

      <PageTitle
        title="Create a package"
        description="The maturity amount is calculated from the capital and return percentage, so the two can never disagree."
      />

      <Card className="p-5 sm:p-6">
        <PackageForm />
      </Card>
    </DashboardPage>
  );
}
