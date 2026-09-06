import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarClock, Info } from "lucide-react";

import {
  Breadcrumbs,
  DashboardPage,
  DetailRow,
  PageTitle,
} from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoNote } from "@/components/ui/feedback";
import { SubscribeForm } from "@/components/dashboard/subscribe-form";
import { CycleVisual } from "@/components/visuals/illustrations";
import { requireApprovedKyc } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import { getSettings, paymentConfigured } from "@/lib/settings";
import { upcomingCycleStart } from "@/server/services/cycles";
import { formatCycleLabel } from "@/lib/time";

export const metadata: Metadata = { title: "Confirm subscription" };

export default async function PackageConfirmPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireApprovedKyc(`/dashboard/packages/${slug}`);

  const [pkg, settings, cycleStart] = await Promise.all([
    prisma.package.findUnique({ where: { slug } }),
    getSettings(),
    upcomingCycleStart(),
  ]);

  if (!pkg || !pkg.isActive) notFound();

  const paymentsReady = paymentConfigured(settings);
  const profit = pkg.maturityAmount.sub(pkg.minimumCapital);

  return (
    <DashboardPage>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Packages", href: "/dashboard/packages" },
          { label: pkg.name },
        ]}
      />

      <PageTitle
        title={`Confirm your ${pkg.name} subscription`}
        description="Check these terms carefully. They are recorded on your investment when you continue, and cannot change afterwards."
      />

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-start">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-fg">{pkg.name}</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{pkg.description}</p>
              </div>
              {pkg.badge ? <Badge variant="accent">{pkg.badge}</Badge> : null}
            </div>

            <dl className="mt-5 border-t border-ink-700/60 pt-2">
              <DetailRow label="Capital required">{formatUSD(pkg.minimumCapital)}</DetailRow>
              <DetailRow label="Return percentage">
                {pkg.returnPercentage.toDecimalPlaces(2).toString()}%
              </DetailRow>
              <DetailRow label="Maturity value">
                <span className="text-accent-300">{formatUSD(pkg.maturityAmount)}</span>
              </DetailRow>
              <DetailRow label="Above capital at maturity">{formatUSD(profit)}</DetailRow>
              <DetailRow label="Term length">{pkg.durationDays} calendar days</DetailRow>
              <DetailRow label="Payment asset">{settings["payment.asset"]}</DetailRow>
            </dl>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-ink-600 bg-ink-850 text-accent-300">
                <CalendarClock className="size-4" aria-hidden />
              </span>
              <div>
                <h2 className="text-[14.5px] font-semibold text-fg">When your term starts</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
                  Your subscription becomes active when an investment cycle opens — not when you
                  pay. If your payment is verified before{" "}
                  <strong className="font-semibold text-fg">{formatCycleLabel(cycleStart)}</strong>,
                  you join that cycle. If it is verified at or after that moment, you join the
                  following one.
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
                  Once active, your {pkg.durationDays}-day term runs from the cycle opening
                  timestamp, and maturity is calculated from that stored instant.
                </p>
              </div>
            </div>
          </Card>

          <InfoNote tone="gold">
            <span className="flex items-start gap-2">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                The maturity value above is defined by this package. It is not a projection of
                external trading performance and does not change with it. Investing carries risk,
                including loss of capital.
              </span>
            </span>
          </InfoNote>
        </div>

        <div className="space-y-5 lg:sticky lg:top-6">
          <Card className="p-5 sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.14em] text-fg-subtle">You will pay</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-fg">
              {formatUSD(pkg.minimumCapital)}
            </p>
            <p className="mt-1 text-[12.5px] text-fg-muted">
              in {settings["payment.asset"]}
              {settings["payment.network"] ? ` on ${settings["payment.network"]}` : ""}
            </p>

            <div className="mt-5 border-t border-ink-700/60 pt-4">
              <SubscribeForm
                packageSlug={pkg.slug}
                disabled={!paymentsReady}
                disabledReason="Subscriptions are temporarily closed because payment details have not been configured. Please contact support."
              />
            </div>
          </Card>

          <CycleVisual />
        </div>
      </div>
    </DashboardPage>
  );
}
