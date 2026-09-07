import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health check for the hosting platform's monitor.
 *
 * Returns 200 only when the application can actually reach its database, so a
 * deploy that starts but cannot serve real traffic is reported as unhealthy
 * rather than being rolled out. Deliberately reveals nothing about the failure
 * — the detail goes to the server log, not to an anonymous caller.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      { status: "ok", database: "reachable" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[health] database unreachable:", error);

    return NextResponse.json(
      { status: "degraded", database: "unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
