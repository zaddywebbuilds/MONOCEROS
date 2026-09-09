import type { Metadata } from "next";

import { Hero } from "@/components/marketing/hero";
import { StructuredData } from "@/components/site/structured-data";
import { MarketTicker } from "@/components/marketing/market-ticker";
import { PackagesSection } from "@/components/marketing/packages-section";
import { ProcessStages } from "@/components/marketing/process-stages";
import { CycleSection } from "@/components/marketing/cycle-section";
import {
  FaqSection,
  InfrastructureSection,
  SupportSection,
  WhyMonoceros,
} from "@/components/marketing/sections";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";
import { getMarketSnapshot } from "@/lib/market";
import { getPublicSettings } from "@/lib/settings";
import { getSession } from "@/lib/auth/session";
import { getNextCycleStart, getPublicFaqs, getPublicPackages, getPublicTestimonials } from "@/server/queries/public";
import { appUrl } from "@/lib/env";
import type { Weekday } from "@/lib/time";

export const metadata: Metadata = {
  title: "Structured Investment Management",
  description:
    "Investment subscriptions with verified accounts, weekly cycles and clear 30-day terms. Trading is handled by an externally operated automated system.",
  alternates: { canonical: `${appUrl}/` },
};

export const revalidate = 60;

export default async function HomePage() {
  const [settings, session, packages, faqs, market, testimonials] = await Promise.all([
    getPublicSettings(),
    getSession().catch(() => null),
    getPublicPackages(),
    getPublicFaqs(),
    getMarketSnapshot(),
    getPublicTestimonials(),
  ]);

  const cycleStart = await getNextCycleStart();

  return (
    <>
      <StructuredData settings={settings} />
      <Hero settings={settings} />
      <MarketTicker snapshot={market} />
      <PackagesSection packages={packages} user={session?.user ?? null} />
      <ProcessStages
        videoUrl={settings["content.explainerVideoUrl"] || undefined}
        user={session?.user ?? null}
        weekday={settings["cycle.weekday"] as Weekday}
        time={settings["cycle.time"]}
        durationDays={settings["investment.durationDays"]}
        packages={packages}
        cycleStart={cycleStart}
      />
      <CycleSection
        cycleStart={cycleStart}
        weekday={settings["cycle.weekday"] as Weekday}
        time={settings["cycle.time"]}
        durationDays={settings["investment.durationDays"]}
      />
      <InfrastructureSection />
      <WhyMonoceros />
      <TestimonialsSection testimonials={testimonials} preview />
      <FaqSection faqs={faqs} limit={4} showAllLink />
      {/* Support closes the page as the call to action. The About preview it
          replaced only restated /about, which the footer already links to. */}
      <SupportSection settings={settings} />
    </>
  );
}
