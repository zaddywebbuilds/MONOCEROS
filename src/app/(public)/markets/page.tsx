import type { Metadata } from "next";

import { PageHeader } from "@/components/marketing/prose";
import { PositionsFootage } from "@/components/visuals/footage";
import { MarketLine, SectionEyebrow } from "@/components/visuals/decor";
import { ErrorState, InfoNote } from "@/components/ui/feedback";
import { MarketLive } from "@/components/marketing/market-live";
import { getMarketSnapshot } from "@/lib/market";
import { appUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Live Markets",
  description:
    "Public market data for the digital assets Monoceros references, for information only. It does not represent the performance of any subscription.",
  alternates: { canonical: `${appUrl}/markets` },
};

export const revalidate = 60;

const DISCLAIMER =
  "Market data is provided for informational purposes and does not represent the performance of Monoceros investment subscriptions.";

export default async function MarketsPage() {
  const snapshot = await getMarketSnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Markets"
        title="Live market data"
        description="Reference prices for the digital assets most relevant to subscriptions on this platform. Display only — nothing here feeds any investment calculation."
      >
        <div className="mt-7 max-w-2xl">
          <InfoNote>{DISCLAIMER}</InfoNote>
        </div>
      </PageHeader>

      <section className="py-8 sm:py-10">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {!snapshot.available ? (
            <ErrorState
              title="Market data is unavailable"
              description="We could not reach the market data provider. Prices are informational only, so this does not affect any investment, cycle or maturity date."
            />
          ) : (
            <>
              <MarketLive initial={snapshot} />
              <p className="mt-3 text-[12px] text-fg-subtle">{DISCLAIMER}</p>
            </>
          )}
        </div>
      </section>

      <section className="pb-12">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-14">
            <div>
              <SectionEyebrow>Coverage</SectionEyebrow>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
                Markets referenced by the external system
              </h2>
              <p className="mt-4 text-[14.5px] leading-relaxed text-fg-muted">
                The external automated operation covers cryptocurrency, foreign exchange, equities
                and other supported markets. We publish live prices only for assets where a proper
                market-data source is configured — so you will see digital assets here, and not
                invented quotes for instruments we cannot source.
              </p>
              <MarketLine className="mt-8 h-24 opacity-80" />
            </div>
            <PositionsFootage />
          </div>
        </div>
      </section>
    </>
  );
}
