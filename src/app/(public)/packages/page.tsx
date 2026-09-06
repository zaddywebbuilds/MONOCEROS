import type { Metadata } from "next";

import { PageHeader } from "@/components/marketing/prose";
import { PackagesSection } from "@/components/marketing/packages-section";
import { CycleSection } from "@/components/marketing/cycle-section";
import { FaqSection } from "@/components/marketing/sections";
import { InfoNote } from "@/components/ui/feedback";
import { getPublicSettings } from "@/lib/settings";
import { getSession } from "@/lib/auth/session";
import { getNextCycleStart, getPublicFaqs, getPublicPackages } from "@/server/queries/public";
import { appUrl } from "@/lib/env";
import type { Weekday } from "@/lib/time";

export const metadata: Metadata = {
  title: "Investment Packages",
  description:
    "Compare Monoceros investment packages: capital, return percentage, maturity value and term length. Package terms are recorded on your investment when you subscribe.",
  alternates: { canonical: `${appUrl}/packages` },
};

export default async function PackagesPage() {
  const [settings, session, packages, faqs] = await Promise.all([
    getPublicSettings(),
    getSession().catch(() => null),
    getPublicPackages(),
    getPublicFaqs(),
  ]);

  const cycleStart = await getNextCycleStart();

  return (
    <>
      <PageHeader
        eyebrow="Subscriptions"
        title="Investment packages"
        description="Each package defines its capital, return percentage, maturity value and term. Those figures are copied onto your investment record at the moment you subscribe and never change afterwards."
      >
        <div className="mt-7 max-w-2xl">
          <InfoNote tone="gold">
            Maturity values are set by the package you choose. They are not derived from, and do not
            move with, the performance of the external automated trading system.
          </InfoNote>
        </div>
      </PageHeader>

      <PackagesSection packages={packages} user={session?.user ?? null} showHeading={false} />

      <CycleSection
        cycleStart={cycleStart}
        weekday={settings["cycle.weekday"] as Weekday}
        time={settings["cycle.time"]}
        durationDays={settings["investment.durationDays"]}
      />

      <FaqSection
        faqs={faqs.filter((faq) =>
          /package|invest|cycle|maturity|rollover|withdraw/i.test(faq.question),
        )}
        limit={6}
        showAllLink
      />
    </>
  );
}
