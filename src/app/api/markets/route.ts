import { NextResponse } from "next/server";

import { getMarketSnapshot } from "@/lib/market";

/**
 * The market snapshot, for the page to poll after first load.
 *
 * This adds no load on the upstream provider. `getMarketSnapshot` fetches with
 * `next: { revalidate: MARKET_CACHE_SECONDS }`, so every caller — this route and
 * the server-rendered page alike — shares one cached upstream response. Polling
 * here costs a cache read, not a CoinGecko call.
 *
 * Public reference data only: no account, session or personal information passes
 * through this route, so it is safe to serve from the shared cache.
 */
export async function GET() {
  const snapshot = await getMarketSnapshot();

  return NextResponse.json(snapshot, {
    headers: {
      "cache-control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
