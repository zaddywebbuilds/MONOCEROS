/**
 * Market types and presentation helpers.
 *
 * Split out of `market.ts` deliberately. That module imports `serverEnv`, so a
 * client component importing a formatter from it dragged the whole server
 * environment schema — every secret's name and default — into the browser
 * bundle. No values could leak, since `process.env` is empty client-side for
 * anything without a NEXT_PUBLIC_ prefix, but the schema had no business being
 * shipped and it advertised the infrastructure.
 *
 * Nothing in here may import server-only modules.
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

export interface MarketSnapshot {
  assets: MarketAsset[];
  fetchedAt: string;
  available: boolean;
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
