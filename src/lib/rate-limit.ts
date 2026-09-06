import "server-only";
import { RateLimitError } from "@/lib/errors";

/**
 * In-process fixed-window rate limiter.
 *
 * Deliberately dependency-free so the platform runs on a single node without
 * extra infrastructure. For a multi-instance deployment, swap the `store`
 * implementation for Redis/Upstash — the call sites do not change.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimitOptions {
  /** Requests permitted per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export const RATE_LIMITS = {
  login: { limit: 8, windowSeconds: 300 },
  register: { limit: 5, windowSeconds: 900 },
  passwordReset: { limit: 4, windowSeconds: 900 },
  paymentSubmission: { limit: 10, windowSeconds: 600 },
  withdrawalRequest: { limit: 6, windowSeconds: 600 },
  supportMessage: { limit: 20, windowSeconds: 600 },
  contactForm: { limit: 5, windowSeconds: 900 },
  documentView: { limit: 60, windowSeconds: 300 },
} as const satisfies Record<string, RateLimitOptions>;

export type RateLimitName = keyof typeof RATE_LIMITS;

export function rateLimit(
  name: RateLimitName,
  identifier: string,
  options?: RateLimitOptions,
): RateLimitResult {
  const config = options ?? RATE_LIMITS[name];
  const now = Date.now();
  sweep(now);

  const key = `${name}:${identifier}`;
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 });
    return { allowed: true, remaining: config.limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > config.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: config.limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/** Clears a bucket after a successful, legitimate action (e.g. a valid login). */
export function resetRateLimit(name: RateLimitName, identifier: string): void {
  store.delete(`${name}:${identifier}`);
}

export function enforceRateLimit(name: RateLimitName, identifier: string): void {
  const result = rateLimit(name, identifier);
  if (!result.allowed) throw new RateLimitError(result.retryAfterSeconds);
}

export { RateLimitError };
