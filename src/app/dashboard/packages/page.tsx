import type { Metadata } from "next";

import { DashboardPage, PageTitle } from "@/components/dashboard/page-parts";
import { PackageCard } from "@/components/marketing/packages-section";
import { EmptyState, InfoNote } from "@/components/ui/feedback";
import { Countdown } from "@/components/countdown";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/rbac";
import { getPublicPackages } from "@/server/queries/public";
import { upcomingCycleStart } from "@/server/services/cycles";
import { getSettings, paymentConfigured } from "@/lib/settings";
import { countdownTo, formatCycleLabel } from "@/lib/time";

export const metadata: Metadata = { title: "Packages" };

export default async function DashboardPackagesPage() {
  const user = await requireUser("/dashboard/packages");
  const [packages, settings, cycleStart] = await Promise.all([
    getPublicPackages(),
    getSettings(),
    upcomingCycleStart(),
  ]);

  const countdown = countdownTo(cycleStart);
  const kycApproved = user.kycStatus === "APPROVED";
  const paymentsReady = paymentConfigured(settings);

  return (
    <DashboardPage>
      <PageTitle
        title="Investment packages"
        description="Package terms are copied onto your investment when you subscribe, and never change afterwards."
      />

      {!kycApproved ? (
        <InfoNote tone="warning" className="mb-6">
          Complete your identity verification before subscribing. Package details are shown here so
          you can plan ahead.
        </InfoNote>
      ) : null}

      {kycApproved && !paymentsReady ? (
        <InfoNote tone="warning" className="mb-6">
          Subscriptions are temporarily closed: payment details have not been configured yet. Please
          check back shortly or contact support.
        </InfoNote>
      ) : null}

      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
              Next investment cycle
            </p>
            <p className="mt-1.5 text-[15px] font-semibold text-fg">
              {formatCycleLabel(cycleStart)}
            </p>
            <p className="mt-1 text-[12.5px] text-fg-muted">
              Subscriptions verified before this moment join this cycle. Later ones wait a week.
            </p>
          </div>
          <Countdown
            target={cycleStart.toISOString()}
            initial={{
              days: countdown.days,
              hours: countdown.hours,
              minutes: countdown.minutes,
              seconds: countdown.seconds,
            }}
            showSeconds={false}
          />
        </div>
      </Card>

      {packages.length === 0 ? (
        <EmptyState
          title="No packages are available"
          description="Investment packages could not be loaded. Please refresh, or contact support if this continues."
          actionLabel="Contact support"
          actionHref="/dashboard/support/new"
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {packages.map((pkg, index) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              href={kycApproved ? `/dashboard/packages/${pkg.slug}` : "/dashboard/verification"}
              featured={index === 2}
            />
          ))}
        </div>
      )}
    </DashboardPage>
  );
}
