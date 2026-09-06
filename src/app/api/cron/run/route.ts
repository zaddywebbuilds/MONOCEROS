import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { serverEnv } from "@/lib/env";
import { runScheduledJobs } from "@/server/services/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled worker endpoint.
 *
 * Run this at least every 5 minutes (Vercel Cron, GitHub Actions, systemd
 * timer — anything that can make an authenticated request):
 *
 *   curl -X POST https://your-domain/api/cron/run \
 *        -H "Authorization: Bearer $CRON_SECRET"
 *
 * It activates queued investments whose cycle has opened, matures investments
 * whose term has ended, and prunes expired tokens and sessions. It is
 * idempotent, so running it more often than necessary is harmless.
 */

function authorised(request: NextRequest): boolean {
  const secret = serverEnv().CRON_SECRET;
  if (!secret) return false;

  const header =
    request.headers.get("authorization") ?? request.headers.get("x-cron-secret") ?? "";
  const provided = header.replace(/^Bearer\s+/i, "");

  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function handle(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const report = await runScheduledJobs();
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[cron] scheduled run failed:", error);
    return NextResponse.json(
      { ok: false, error: "The scheduled run failed. Check the server logs." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return handle(request);
}

/** GET is supported so platforms that only issue GET cron requests can be used. */
export async function GET(request: NextRequest) {
  return handle(request);
}
