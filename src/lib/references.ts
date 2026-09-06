import { prisma } from "@/lib/prisma";
import type { Tx } from "@/lib/prisma";

/**
 * Human-readable, non-enumerable-by-database-id references.
 *   MON-INV-2026-000024
 *
 * Sequence allocation is atomic: the upsert increments a per-prefix, per-year
 * counter row inside whatever transaction it is handed.
 */

export const REFERENCE_PREFIX = {
  user: "USR",
  investment: "INV",
  payment: "PAY",
  withdrawal: "WDR",
  kyc: "KYC",
  transaction: "TXN",
  ticket: "TKT",
  cycle: "CYC",
  rollover: "RLV",
} as const;

export type ReferenceKind = keyof typeof REFERENCE_PREFIX;

export async function nextReference(
  kind: ReferenceKind,
  client: Tx = prisma,
  when: Date = new Date(),
): Promise<string> {
  const prefix = REFERENCE_PREFIX[kind];
  const year = when.getUTCFullYear();

  const counter = await client.referenceCounter.upsert({
    where: { prefix_year: { prefix, year } },
    create: { prefix, year, current: 1 },
    update: { current: { increment: 1 } },
  });

  return `MON-${prefix}-${year}-${String(counter.current).padStart(6, "0")}`;
}

/** Cycle references are derived from the cycle date, not a counter. */
export function cycleReference(cycleStartDateKey: string): string {
  return `MON-CYC-${cycleStartDateKey.replace(/-/g, "")}`;
}
