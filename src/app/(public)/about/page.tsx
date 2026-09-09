import type { Metadata } from "next";

import { PageHeader, DocumentBody } from "@/components/marketing/prose";
import { BrandVisual, AiInfrastructureVisual } from "@/components/visuals/illustrations";
import { SectionEyebrow } from "@/components/visuals/decor";
import { ButtonLink } from "@/components/ui/button";
import { getPublicSettings } from "@/lib/settings";
import { getContentBlock } from "@/server/queries/public";
import { appUrl } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  return {
    title: `About ${settings["company.name"]}`,
    description: settings["company.description"],
    alternates: { canonical: `${appUrl}/about` },
  };
}

const DEFAULT_ABOUT = `## What Monoceros does

Monoceros is an investment subscription management platform. It gives investors one place to open a verified account, choose an investment package, submit and track a payment, follow a fixed investment term, and request a withdrawal or a rollover at maturity.

## How Monoceros works with our trading infrastructure

Monoceros provides the investor-facing account and subscription experience, while automated market execution is handled through our separate trading infrastructure.

This separation is deliberate. Your package terms, payment record, start date and maturity date are set when you subscribe and stay fixed for the full term, so what you agreed to is never affected by day-to-day market movement.

## How we talk about returns

Each package states its capital, return percentage, term length and maturity value up front, and those are the figures your investment is held to. We publish the terms and the record of what has happened on your account — not projections, win rates or activity counters.

Investing carries risk, including the risk of losing capital. Please read the Risk Disclosure before subscribing.

## How your money and data are handled

- Payments go to a company wallet on the network you select, and every payment is verified by a person before your subscription is activated.
- Identity documents are held in private storage, reachable only through short-lived links, and every access is recorded.
- Every administrative decision — an approval, a rejection, a settings change — is written to an audit log that cannot be deleted from the admin interface.

## Support

If something is unclear, ask. Support tickets raised from your dashboard carry a written history, so nothing depends on remembering a phone call.`;

export default async function AboutPage() {
  const [settings, block] = await Promise.all([getPublicSettings(), getContentBlock("about")]);

  return (
    <>
      <PageHeader
        eyebrow="About"
        title={settings["company.name"]}
        description={settings["company.tagline"]}
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-16">
          <div className="min-w-0">
            <DocumentBody body={block?.body ?? DEFAULT_ABOUT} />

            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/packages">View packages</ButtonLink>
              <ButtonLink href="/how-it-works" variant="secondary">
                How it works
              </ButtonLink>
            </div>
          </div>

          <div className="space-y-6 lg:sticky lg:top-24">
            <BrandVisual />
            <div className="surface p-6">
              <SectionEyebrow>At a glance</SectionEyebrow>
              <dl className="mt-4 space-y-3">
                {[
                  { label: "Operating country", value: settings["general.country"] },
                  { label: "Business timezone", value: settings["general.timezone"] },
                  { label: "Display currency", value: settings["general.currency"] },
                  { label: "Payment asset", value: settings["payment.asset"] },
                  {
                    label: "Investment term",
                    value: `${settings["investment.durationDays"]} days`,
                  },
                  { label: "Payment verification", value: "Manual" },
                  { label: "Withdrawal processing", value: "Manual" },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 border-b border-ink-700/50 pb-2.5 last:border-0 last:pb-0"
                  >
                    <dt className="text-[12.5px] text-fg-muted">{row.label}</dt>
                    <dd className="text-[12.5px] font-medium text-fg">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <AiInfrastructureVisual />
          </div>
        </div>
      </div>
    </>
  );
}
