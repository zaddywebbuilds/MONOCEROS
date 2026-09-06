import * as React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  formatChange,
  formatMarketPrice,
  sparklinePath,
  type MarketAsset,
  type MarketSnapshot,
} from "@/lib/market";

function Sparkline({ series, positive }: { series: number[]; positive: boolean }) {
  const path = sparklinePath(series, 96, 26);
  if (!path) return null;
  return (
    <svg viewBox="0 0 96 26" aria-hidden className="h-6 w-24 shrink-0">
      <path
        d={path}
        fill="none"
        stroke={positive ? "#2fd4a7" : "#ef5b5b"}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}

function TickerItem({ asset }: { asset: MarketAsset }) {
  const positive = (asset.change24h ?? 0) >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;

  return (
    <div className="flex shrink-0 items-center gap-3.5 border-r border-ink-700/60 px-5 py-3">
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg border border-ink-600 bg-ink-850 text-[10px] font-semibold text-fg-muted">
          {asset.symbol.slice(0, 3)}
        </span>
        <div className="leading-tight">
          <p className="text-[13px] font-medium text-fg">{asset.name}</p>
          <p className="text-[10.5px] uppercase tracking-wider text-fg-subtle">{asset.symbol}</p>
        </div>
      </div>

      <Sparkline series={asset.sparkline} positive={positive} />

      <div className="text-right leading-tight">
        <p className="text-[13px] font-semibold tabular-nums text-fg">
          {formatMarketPrice(asset.price)}
        </p>
        <p
          className={cn(
            "flex items-center justify-end gap-1 text-[11.5px] font-medium tabular-nums",
            positive ? "text-accent-400" : "text-status-rejected",
          )}
        >
          <Icon className="size-3" aria-hidden />
          {formatChange(asset.change24h)}
        </p>
      </div>
    </div>
  );
}

export function MarketTicker({ snapshot }: { snapshot: MarketSnapshot }) {
  if (!snapshot.available) {
    return (
      <section aria-label="Market prices" className="border-y border-ink-700/70 bg-ink-900/50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-center text-[12.5px] text-fg-subtle">
            Live market prices are temporarily unavailable. Investment terms are unaffected — they
            are determined by your subscribed package.
          </p>
        </div>
      </section>
    );
  }

  // Duplicated once so the marquee can loop seamlessly.
  const loop = [...snapshot.assets, ...snapshot.assets];

  return (
    <section
      aria-label="Live market prices"
      className="relative border-y border-ink-700/70 bg-ink-900/50"
    >
      <div className="mask-fade-x overflow-hidden">
        <div className="flex w-max animate-marquee motion-reduce:animate-none">
          {loop.map((asset, index) => (
            <TickerItem key={`${asset.id}-${index}`} asset={asset} />
          ))}
        </div>
      </div>
      <p className="border-t border-ink-700/50 px-4 py-2 text-center text-[11px] text-fg-subtle">
        Market prices are displayed for informational purposes and do not represent the performance
        of Monoceros investment subscriptions.
      </p>
    </section>
  );
}
