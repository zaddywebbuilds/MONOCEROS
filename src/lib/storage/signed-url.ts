import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { serverEnv } from "@/lib/env";

/**
 * Short-lived signed URLs for private documents.
 *
 * Works identically for the local and S3 drivers because the signature is
 * verified by the application, not the storage backend. The route that
 * consumes it ALSO re-checks the caller's role — a valid signature alone is
 * never sufficient.
 */

const SIGNATURE_TTL_SECONDS = 300;

function sign(payload: string): string {
  return createHmac("sha256", serverEnv().AUTH_SECRET).update(payload).digest("hex");
}

export interface DocumentGrant {
  /** Storage object key. */
  key: string;
  /** Audience: who the link was minted for. */
  viewerId: string;
}

export function signDocumentUrl(grant: DocumentGrant, ttlSeconds = SIGNATURE_TTL_SECONDS): string {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${grant.key}|${grant.viewerId}|${expires}`;
  const signature = sign(payload);
  const params = new URLSearchParams({
    key: grant.key,
    exp: String(expires),
    sig: signature,
  });
  return `/api/documents?${params.toString()}`;
}

export function verifyDocumentSignature(params: {
  key: string | null;
  exp: string | null;
  sig: string | null;
  viewerId: string;
}): boolean {
  const { key, exp, sig, viewerId } = params;
  if (!key || !exp || !sig) return false;

  const expires = Number(exp);
  if (!Number.isFinite(expires)) return false;
  if (expires < Math.floor(Date.now() / 1000)) return false;

  const expected = sign(`${key}|${viewerId}|${expires}`);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
