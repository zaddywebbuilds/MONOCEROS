import { serverEnv } from "@/lib/env";

/**
 * Public market data.
 *
 * DISPLAY ONLY. Nothing in this file feeds any investment calculation — a
 * maturity amount comes from the subscribed package and nowhere else. If the
 * upstream provider is unavailable the UI shows an explicit unavailable state
 * rather than stale or invented numbers.
 */

export interface MarketAsset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number | null;
  marketCap: number | null;
  volume24h: number | null;
  sparkline: number[];
}

export const TRACKED_ASSETS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "tether", symbol: "USDT", name: "Tether" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "solana", symbol: "SOL", name: "Solana" },
] as const;

interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  market_cap: number | null;
  total_volume: number | null;
  sparkline_in_7d?: { price: number[] };
}

export interface MarketSnapshot {
  assets: MarketAsset[];
  fetchedAt: string;
  available: boolean;
}

/** Down-samples a 7-day price series to a small, chart-friendly array. */
function condense(series: number[], points = 40): number[] {
  if (series.length <= points) return series;
  const step = series.length / points;
  const out: number[] = [];
  for (let i = 0; i < points; i += 1) {
    const value = series[Math.floor(i * step)];
    if (typeof value === "number") out.push(value);
  }
  return out;
}

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const env = serverEnv();

  const params = new URLSearchParams({
    vs_currency: "usd",
    ids: TRACKED_ASSETS.map((a) => a.id).join(","),
    order: "market_cap_desc",
    sparkline: "true",
    price_change_percentage: "24h",
    precision: "full",
  });

  const headers: Record<string, string> = { accept: "application/json" };
  if (env.COINGECKO_API_KEY) {
    headers["x-cg-demo-api-key"] = env.COINGECKO_API_KEY;
  }

  try {
    const response = await fetch(`${env.MARKET_API_BASE_URL}/coins/markets?${params}`, {
      headers,
      next: { revalidate: env.MARKET_CACHE_SECONDS },
    });

    if (!response.ok) {
      return { assets: [], fetchedAt: new Date().toISOString(), available: false };
    }

    const data = (await response.json()) as CoinGeckoMarket[];

    // Preserve the configured display order rather than the API's order.
    const byId = new Map(data.map((row) => [row.id, row]));
    const assets: MarketAsset[] = [];

    for (const tracked of TRACKED_ASSETS) {
      const row = byId.get(tracked.id);
      if (!row) continue;
      assets.push({
        id: tracked.id,
        symbol: tracked.symbol,
        name: tracked.name,
        price: row.current_price,
        change24h: row.price_change_percentage_24h,
        marketCap: row.market_cap,
        volume24h: row.total_volume,
        sparkline: condense(row.sparkline_in_7d?.price ?? []),
      });
    }

    return {
      assets,
      fetchedAt: new Date().toISOString(),
      available: assets.length > 0,
    };
  } catch {
    return { assets: [], fetchedAt: new Date().toISOString(), available: false };
  }
}

const priceFormatter = (value: number) =>
  value >= 1000
    ? value.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : value >= 1
      ? value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : value.toLocaleString("en-US", { maximumFractionDigits: 6 });

export function formatMarketPrice(value: number): string {
  return `$${priceFormatter(value)}`;
}

export function formatLargeNumber(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatChange(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/** Builds an SVG path string for a sparkline from a price series. */
export function sparklinePath(series: number[], width = 100, height = 28): string {
  if (series.length < 2) return "";
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;

  return series
    .map((value, index) => {
      const x = (index / (series.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}
