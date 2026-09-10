import { serverEnv } from "@/lib/env";
import type { MarketAsset, MarketSnapshot } from "@/lib/market-format";

export type { MarketAsset, MarketSnapshot } from "@/lib/market-format";
export {
  formatChange,
  formatLargeNumber,
  formatMarketPrice,
  sparklinePath,
} from "@/lib/market-format";

/**
 * Public market data.
 *
 * DISPLAY ONLY. Nothing in this file feeds any investment calculation — a
 * maturity amount comes from the subscribed package and nowhere else. If the
 * upstream provider is unavailable the UI shows an explicit unavailable state
 * rather than stale or invented numbers.
 */



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

