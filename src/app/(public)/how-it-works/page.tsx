import type { Metadata } from "next";

import { PageHeader } from "@/components/marketing/prose";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { CycleSection } from "@/components/marketing/cycle-section";
import { InfrastructureSection } from "@/components/marketing/sections";
import { SecurityVisual } from "@/components/visuals/illustrations";
import { SectionEyebrow } from "@/components/visuals/decor";
import { ButtonLink } from "@/components/ui/button";
import { getPublicSettings } from "@/lib/settings";
import { getSession } from "@/lib/auth/session";
import { getNextCycleStart } from "@/server/queries/public";
import { appUrl } from "@/lib/env";
import type { Weekday } from "@/lib/time";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "From registration and identity verification through USDT payment, manual verification, the weekly investment cycle and the 30-day term, to withdrawal or rollover at maturity.",
  alternates: { canonical: `${appUrl}/how-it-works` },
};

export default async function HowItWorksPage() {
  const [settings, session] = await Promise.all([
    getPublicSettings(),
    getSession().catch(() => null),
  ]);
  const cycleStart = await getNextCycleStart();

  return (
    <>
      <PageHeader
        eyebrow="Process"
        title="How it works, end to end"
        description="Every stage of a Monoceros subscription, what happens at each one, and who does it."
      />

      <HowItWorks
        videoUrl={settings["content.explainerVideoUrl"] || undefined}
        user={session?.user ?? null}
        weekday={settings["cycle.weekday"] as Weekday}
        durationDays={settings["investment.durationDays"]}
        variant="detailed"
        cycleHref="#cycles"
      />

      <CycleSection
        cycleStart={cycleStart}
        weekday={settings["cycle.weekday"] as Weekday}
        time={settings["cycle.time"]}
        durationDays={settings["investment.durationDays"]}
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-14">
            <div>
              <SectionEyebrow>Verification</SectionEyebrow>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
                Why we verify your identity
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-fg-muted">
                {settings["kyc.notice"]}
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Your NIN and identity document are reviewed by a person, not an automated score.",
                  "Documents are written to private storage — never to a public folder, never to a CDN.",
                  "Compliance staff open documents through links that expire in minutes, and each access is logged.",
                  "If a submission is declined you are told why, and you can submit again.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-500"
                    />
                    <span className="text-[13.5px] leading-relaxed text-fg-muted">{item}</span>
                  </li>
                ))}
              </ul>
              <ButtonLink href="/register" className="mt-8">
                Create your account
              </ButtonLink>
            </div>
            <SecurityVisual />
          </div>
        </div>
      </section>

      <InfrastructureSection />
    </>
  );
}
