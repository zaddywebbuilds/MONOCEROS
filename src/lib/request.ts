import { headers } from "next/headers";

export interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
}

/** Best-effort client fingerprint for audit and login logging. */
export async function requestContext(): Promise<RequestContext> {
  const h = await headers();

  const forwarded = h.get("x-forwarded-for");
  const ipAddress =
    forwarded?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    null;

  return {
    ipAddress,
    userAgent: h.get("user-agent"),
  };
}
