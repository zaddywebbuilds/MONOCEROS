import type { Metadata } from "next";
import { TrendingDown, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/marketing/prose";
import { MarketsVisual } from "@/components/visuals/illustrations";
import { MarketLine, SectionEyebrow } from "@/components/visuals/decor";
import { Card } from "@/components/ui/card";
import { ErrorState, InfoNote } from "@/components/ui/feedback";
import { TableScroll, Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  formatChange,
  formatLargeNumber,
  formatMarketPrice,
  getMarketSnapshot,
  sparklinePath,
} from "@/lib/market";
import { appUrl } from "@/lib/env";
import { formatBusinessDateTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "Live Markets",
  description:
    "Public market data for the digital assets Monoceros references, provided for information only. Market data does not represent the performance of Monoceros investment subscriptions.",
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

      <section className="py-12 sm:py-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {!snapshot.available ? (
            <ErrorState
              title="Market data is unavailable"
              description="We could not reach the market data provider. Prices are informational only, so this does not affect any investment, cycle or maturity date."
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {snapshot.assets.map((asset) => {
                  const positive = (asset.change24h ?? 0) >= 0;
                  const Icon = positive ? TrendingUp : TrendingDown;
                  const path = sparklinePath(asset.sparkline, 260, 60);

                  return (
                    <Card key={asset.id} interactive className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[15px] font-semibold text-fg">{asset.name}</p>
                          <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
                            {asset.symbol}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11.5px] font-medium tabular-nums",
                            positive
                              ? "border-accent-700/40 bg-accent-900/30 text-accent-300"
                              : "border-status-rejected/30 bg-status-rejected/10 text-status-rejected",
                          )}
                        >
                          <Icon className="size-3" aria-hidden />
                          {formatChange(asset.change24h)}
                        </span>
                      </div>

                      <p className="mt-4 text-2xl font-semibold tabular-nums tracking-tight text-fg">
                        {formatMarketPrice(asset.price)}
                      </p>

                      {path ? (
                        <svg
                          viewBox="0 0 260 60"
                          aria-hidden
                          className="mt-4 h-14 w-full"
                          preserveAspectRatio="none"
                        >
                          <path
                            d={path}
                            fill="none"
                            stroke={positive ? "#2fd4a7" : "#ef5b5b"}
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : null}

                      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-700/60 pt-4">
                        <div>
                          <dt className="text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">
                            Market cap
                          </dt>
                          <dd className="mt-1 text-[13px] tabular-nums text-fg">
                            {formatLargeNumber(asset.marketCap)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">
                            24h volume
                          </dt>
                          <dd className="mt-1 text-[13px] tabular-nums text-fg">
                            {formatLargeNumber(asset.volume24h)}
                          </dd>
                        </div>
                      </dl>
                    </Card>
                  );
                })}
              </div>

              <div className="mt-10">
                <h2 className="text-lg font-semibold tracking-tight text-fg">All tracked assets</h2>
                <TableScroll className="mt-4">
                  <Table>
                    <THead>
                      <tr>
                        <TH>Asset</TH>
                        <TH>Symbol</TH>
                        <TH className="text-right">Price</TH>
                        <TH className="text-right">24h change</TH>
                        <TH className="text-right">Market cap</TH>
                        <TH className="text-right">24h volume</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {snapshot.assets.map((asset) => {
                        const positive = (asset.change24h ?? 0) >= 0;
                        return (
                          <TR key={asset.id}>
                            <TD className="font-medium text-fg">{asset.name}</TD>
                            <TD>{asset.symbol}</TD>
                            <TD className="text-right tabular-nums text-fg">
                              {formatMarketPrice(asset.price)}
                            </TD>
                            <TD
                              className={cn(
                                "text-right tabular-nums",
                                positive ? "text-accent-400" : "text-status-rejected",
                              )}
                            >
                              {formatChange(asset.change24h)}
                            </TD>
                            <TD className="text-right tabular-nums">
                              {formatLargeNumber(asset.marketCap)}
                            </TD>
                            <TD className="text-right tabular-nums">
                              {formatLargeNumber(asset.volume24h)}
                            </TD>
                          </TR>
                        );
                      })}
                    </TBody>
                  </Table>
                </TableScroll>
                <p className="mt-3 text-[12px] text-fg-subtle">
                  Last updated {formatBusinessDateTime(snapshot.fetchedAt)}. {DISCLAIMER}
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="pb-20">
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
            <MarketsVisual />
          </div>
        </div>
      </section>
    </>
  );
}
