import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/rbac";
import { storage } from "@/lib/storage";
import { verifyDocumentSignature } from "@/lib/storage/signed-url";
import { rateLimit } from "@/lib/rate-limit";
import { writeAudit, AUDIT_ACTION } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Private document delivery.
 *
 * Three independent checks must all pass:
 *   1. The caller holds a staff session (role checked server-side).
 *   2. The URL carries a valid HMAC signature bound to that caller and not expired.
 *   3. The object key actually belongs to a KYC submission or payment proof.
 *
 * Every successful read is written to the audit log.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session || !isStaff(session.user.role)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const limit = rateLimit("documentView", session.user.id);
  if (!limit.allowed) {
    return new NextResponse("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  const params = request.nextUrl.searchParams;
  const key = params.get("key");

  const signatureValid = verifyDocumentSignature({
    key,
    exp: params.get("exp"),
    sig: params.get("sig"),
    viewerId: session.user.id,
  });

  if (!key || !signatureValid) {
    return new NextResponse("Not found", { status: 404 });
  }

  // The key must correspond to a record we actually issued.
  const [submission, payment] = await Promise.all([
    prisma.kycSubmission.findFirst({ where: { documentKey: key }, select: { id: true } }),
    prisma.payment.findFirst({ where: { proofKey: key }, select: { id: true } }),
  ]);

  if (!submission && !payment) {
    return new NextResponse("Not found", { status: 404 });
  }

  const object = await storage().get(key);
  if (!object) {
    return new NextResponse("Not found", { status: 404 });
  }

  await writeAudit({
    actor: session.user,
    action: submission ? AUDIT_ACTION.KYC_DOCUMENT_VIEWED : "payment.proof_viewed",
    entityType: submission ? "KycSubmission" : "Payment",
    entityId: submission?.id ?? payment?.id ?? null,
    newValue: { key },
  });

  const body = new Uint8Array(object.body);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": object.contentType,
      "Content-Length": String(body.byteLength),
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
      // Documents are rendered on their own origin only.
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; object-src 'self'",
    },
  });
}
