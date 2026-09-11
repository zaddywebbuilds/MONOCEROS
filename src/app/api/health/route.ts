import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { emailDeliveryStatus } from "@/lib/email/provider";
import { storageStatus } from "@/lib/storage";

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

    // Outbound mail can be broken while the database is perfectly healthy, and
    // that failure is otherwise invisible until a registrant complains. Names
    // the provider and whether it is configured — never a key.
    const email = emailDeliveryStatus();

    // Uploaded documents failing to persist is the same shape of problem: it
    // reports success at the time and is only discovered when an administrator
    // opens a KYC submission and the file is gone.
    const store = await storageStatus();

    return NextResponse.json(
      {
        status: "ok",
        database: "reachable",
        email: {
          provider: email.provider,
          configured: email.configured,
          ...(email.reason ? { reason: email.reason } : {}),
        },
        storage: {
          driver: store.driver,
          durable: store.durable,
          ...(store.reason ? { reason: store.reason } : {}),
        },
      },
      // The HTTP status stays tied to the database alone. Unconfigured mail or
      // non-durable storage are both worth reporting, but the deploy can still
      // serve traffic — failing the check here would tell the platform to
      // reject a perfectly good rollout, and the monitor that watches this URL
      // would page for a condition no redeploy can fix.
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
