import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  Breadcrumbs,
  DashboardPage,
  DetailRow,
  PageTitle,
} from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { PackageForm } from "@/components/admin/package-form";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import { formatBusinessDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Edit package" };

export default async function EditPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const pkg = await prisma.package.findUnique({
    where: { id },
    include: { _count: { select: { investments: true } } },
  });

  if (!pkg) notFound();

  const openInvestments = await prisma.investment.count({
    where: {
      packageId: pkg.id,
      status: { in: ["PAYMENT_PENDING", "PAYMENT_SUBMITTED", "PAYMENT_UNDER_REVIEW", "QUEUED", "ACTIVE", "MATURED"] },
    },
  });

  return (
    <DashboardPage className="max-w-5xl">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Packages", href: "/admin/packages" },
          { label: pkg.name },
        ]}
      />

      <PageTitle
        title={`Edit ${pkg.name}`}
        description="Changes apply to new subscriptions only."
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <Card className="p-5 sm:p-6">
          <PackageForm
            values={{
              id: pkg.id,
              name: pkg.name,
              slug: pkg.slug,
              minimumCapital: pkg.minimumCapital.toFixed(2),
              returnPercentage: pkg.returnPercentage.toDecimalPlaces(2).toString(),
              durationDays: pkg.durationDays,
              description: pkg.description,
              badge: pkg.badge ?? "",
              displayOrder: pkg.displayOrder,
              isActive: pkg.isActive,
            }}
          />
        </Card>

        <Card className="p-5 lg:sticky lg:top-6">
          <h2 className="text-[14px] font-semibold text-fg">Current record</h2>
          <dl className="mt-3 border-t border-ink-700/60 pt-2">
            <DetailRow label="Capital">{formatUSD(pkg.minimumCapital)}</DetailRow>
            <DetailRow label="Return">
              {pkg.returnPercentage.toDecimalPlaces(2).toString()}%
            </DetailRow>
            <DetailRow label="Maturity amount">{formatUSD(pkg.maturityAmount)}</DetailRow>
            <DetailRow label="Term">{pkg.durationDays} days</DetailRow>
            <DetailRow label="Total investments">{pkg._count.investments}</DetailRow>
            <DetailRow label="Open investments">{openInvestments}</DetailRow>
            <DetailRow label="Last updated">{formatBusinessDateTime(pkg.updatedAt)}</DetailRow>
          </dl>

          {openInvestments > 0 ? (
            <p className="mt-4 rounded-lg border border-gold-600/30 bg-gold-600/[0.07] px-3.5 py-3 text-[12px] leading-relaxed text-gold-200">
              {openInvestments} open investment{openInvestments === 1 ? "" : "s"} reference this
              package. They keep the terms recorded when each investor subscribed — editing here
              will not change what they are owed.
            </p>
          ) : null}
        </Card>
      </div>
    </DashboardPage>
  );
}
