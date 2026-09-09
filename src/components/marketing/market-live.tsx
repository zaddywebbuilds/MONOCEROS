"use client";

import * as React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { TableScroll, Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import {
  formatChange,
  formatLargeNumber,
  formatMarketPrice,
  sparklinePath,
  type MarketAsset,
  type MarketSnapshot,
} from "@/lib/market";

/**
 * The market page's live layer.
 *
 * Renders the snapshot the server already produced, then keeps it current by
 * polling `/api/markets`. That route shares the same cached upstream response as
 * the page, so polling costs nothing at the provider.
 *
 * The important rule: motion here never invents movement. Sparklines draw
 * themselves in and cards arrive in sequence — that is presentation, and it
 * happens once. A price only animates, and a row only flashes, when a poll came
 * back with a value that genuinely differs from the one on screen. There is no
 * synthetic tick between updates, because this is real market data and pretending
 * otherwise would make every real number on the page untrustworthy.
 */

const POLL_MS = 60_000;

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Eases a number towards its target so a changed price is legible as a change.
 * Jumps straight to the value for reduced motion, and for the first paint of a
 * price that has not moved.
 */
function useAnimatedNumber(value: number, animate: boolean) {
  const [shown, setShown] = React.useState(value);
  const fromRef = React.useRef(value);

  React.useEffect(() => {
    if (!animate || prefersReducedMotion()) {
      fromRef.current = value;
      setShown(value);
      return;
    }

    const from = fromRef.current;
    if (from === value) return;

    const start = performance.now();
    const duration = 650;
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(from + (value - from) * eased);
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, animate]);

  return shown;
}

/** "updated 34s ago", counted off the snapshot's own timestamp. */
function useFreshness(fetchedAt: string) {
  const [, force] = React.useReducer((n: number) => n + 1, 0);

  React.useEffect(() => {
    const id = window.setInterval(force, 1000);
    return () => clearInterval(id);
  }, []);

  const seconds = Math.max(0, Math.round((Date.now() - new Date(fetchedAt).getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

type Direction = "up" | "down" | null;

export function MarketLive({ initial }: { initial: MarketSnapshot }) {
  const [snapshot, setSnapshot] = React.useState(initial);
  // Which prices moved on the most recent poll, and which way.
  const [moved, setMoved] = React.useState<Record<string, Direction>>({});
  const [live, setLive] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    let timer = 0;

    const load = async () => {
      try {
        const response = await fetch("/api/markets", { cache: "no-store" });
        if (!response.ok) return;
        const next = (await response.json()) as MarketSnapshot;
        if (cancelled || !next.available) return;

        setSnapshot((current) => {
          const before = new Map(current.assets.map((a) => [a.id, a.price]));
          const changes: Record<string, Direction> = {};
          for (const asset of next.assets) {
            const was = before.get(asset.id);
            if (was !== undefined && was !== asset.price) {
              changes[asset.id] = asset.price > was ? "up" : "down";
            }
          }
          if (Object.keys(changes).length) {
            setMoved(changes);
            window.setTimeout(() => {
              if (!cancelled) setMoved({});
            }, 1500);
          }
          return next;
        });
        setLive(true);
      } catch {
        // A failed poll simply leaves the last good snapshot on screen.
      }
    };

    const schedule = () => {
      timer = window.setTimeout(async () => {
        if (document.visibilityState === "visible") await load();
        schedule();
      }, POLL_MS);
    };

    // Catch up immediately when the reader comes back to the tab.
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };

    schedule();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const freshness = useFreshness(snapshot.fetchedAt);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {snapshot.assets.map((asset, index) => (
          <AssetCard key={asset.id} asset={asset} index={index} moved={moved[asset.id] ?? null} />
        ))}
      </div>

      <div className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-fg">All tracked assets</h2>
          <span className="inline-flex items-center gap-2 text-[11.5px] text-fg-subtle">
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                live ? "market-ping bg-emerald-400" : "bg-ink-500",
              )}
            />
            Updated {freshness}
          </span>
        </div>

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
              {snapshot.assets.map((asset) => (
                <AssetRow key={asset.id} asset={asset} moved={moved[asset.id] ?? null} />
              ))}
            </TBody>
          </Table>
        </TableScroll>
      </div>
    </>
  );
}

function AssetCard({
  asset,
  index,
  moved,
}: {
  asset: MarketAsset;
  index: number;
  moved: Direction;
}) {
  const positive = (asset.change24h ?? 0) >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const path = sparklinePath(asset.sparkline, 260, 60);
  const price = useAnimatedNumber(asset.price, true);

  return (
    <Card
      interactive
      className={cn(
        "market-enter p-5",
        moved === "up" && "market-flash-up",
        moved === "down" && "market-flash-down",
      )}
      style={{ "--market-delay": `${index * 70}ms` } as React.CSSProperties}
    >
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
        {formatMarketPrice(price)}
      </p>

      {path ? (
        <svg
          viewBox="0 0 260 60"
          aria-hidden
          className="mt-4 h-14 w-full"
          preserveAspectRatio="none"
        >
          <path
            // Normalised length, so one CSS rule draws any of these paths.
            pathLength={1}
            className="market-spark"
            style={{ animationDelay: `${index * 70 + 120}ms` }}
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
          <dt className="text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">Market cap</dt>
          <dd className="mt-1 text-[13px] tabular-nums text-fg">
            {formatLargeNumber(asset.marketCap)}
          </dd>
        </div>
        <div>
          <dt className="text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">24h volume</dt>
          <dd className="mt-1 text-[13px] tabular-nums text-fg">
            {formatLargeNumber(asset.volume24h)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function AssetRow({ asset, moved }: { asset: MarketAsset; moved: Direction }) {
  const positive = (asset.change24h ?? 0) >= 0;
  const price = useAnimatedNumber(asset.price, true);

  return (
    <TR
      className={cn(moved === "up" && "market-flash-up", moved === "down" && "market-flash-down")}
    >
      <TD className="font-medium text-fg">{asset.name}</TD>
      <TD>{asset.symbol}</TD>
      <TD className="text-right tabular-nums text-fg">{formatMarketPrice(price)}</TD>
      <TD
        className={cn(
          "text-right tabular-nums",
          positive ? "text-emerald-400" : "text-status-rejected",
        )}
      >
        {formatChange(asset.change24h)}
      </TD>
      <TD className="text-right tabular-nums">{formatLargeNumber(asset.marketCap)}</TD>
      <TD className="text-right tabular-nums">{formatLargeNumber(asset.volume24h)}</TD>
    </TR>
  );
}
