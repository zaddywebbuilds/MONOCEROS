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

const DEFAULT_ABOUT = `## What Monoceros is

Monoceros is an investment subscription management platform. It gives investors one place to open a verified account, choose an investment package, submit and track a payment, follow a fixed investment term, and request a withdrawal or a rollover at maturity.

## What Monoceros is not

Monoceros is not a broker and not a trading terminal. The automated trading operation runs outside this website. This platform does not connect to it, place orders, or report trade activity, and it does not display trade histories or live profit figures, because it does not have them.

## How we talk about performance

We publish the terms of each investment package and nothing more. You will not find win rates, investor counters, testimonials or "recent withdrawal" popups on this site. Any performance claim would need evidence behind it, and where we do not have that evidence we say nothing rather than something impressive.

## How your money and data are handled

- Payments go to a single company wallet on a network published on the payment page, and every payment is verified by a person.
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
