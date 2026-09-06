import { Prisma } from "@prisma/client";

/**
 * Money handling.
 *
 * Monetary values are stored as PostgreSQL DECIMAL(18,6) and handled in
 * application code as Prisma.Decimal — never as JavaScript floats.
 */

export type Money = Prisma.Decimal;

export const Decimal = Prisma.Decimal;

export function money(value: Prisma.Decimal.Value): Money {
  return new Prisma.Decimal(value);
}

export const ZERO: Money = money(0);

export function addMoney(...values: Prisma.Decimal.Value[]): Money {
  return values.reduce<Money>((acc, v) => acc.add(new Prisma.Decimal(v)), money(0));
}

export function subMoney(a: Prisma.Decimal.Value, b: Prisma.Decimal.Value): Money {
  return new Prisma.Decimal(a).sub(new Prisma.Decimal(b));
}

/**
 * Applies a percentage return to a principal.
 *   maturity = principal * (1 + percentage / 100)
 * Rounded to 2 decimal places (half-up), which is the presentation and
 * settlement precision for USD/USDT amounts on this platform.
 */
export function applyReturn(
  principal: Prisma.Decimal.Value,
  percentage: Prisma.Decimal.Value,
): Money {
  const p = new Prisma.Decimal(principal);
  const rate = new Prisma.Decimal(percentage).div(100);
  return p.add(p.mul(rate)).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/** Serialises a Decimal for transport to client components. */
export function toMoneyString(value: Prisma.Decimal.Value | null | undefined): string {
  if (value === null || value === undefined) return "0.00";
  return new Prisma.Decimal(value).toFixed(2);
}

export function toNumber(value: Prisma.Decimal.Value | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return new Prisma.Decimal(value).toNumber();
}

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** $1,400.00 — accepts Decimal, string or number. */
export function formatUSD(value: Prisma.Decimal.Value | null | undefined): string {
  return usdFormatter.format(toNumber(value));
}

/** $1.4K — for dense dashboard tiles. */
export function formatUSDCompact(value: Prisma.Decimal.Value | null | undefined): string {
  return usdCompact.format(toNumber(value));
}

/** 1,400.00 USDT */
export function formatAsset(
  value: Prisma.Decimal.Value | null | undefined,
  asset = "USDT",
): string {
  const n = toNumber(value);
  return `${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${asset}`;
}

/** 30% — trims trailing zeros from a stored Decimal(8,4). */
export function formatPercent(value: Prisma.Decimal.Value | null | undefined): string {
  if (value === null || value === undefined) return "0%";
  const d = new Prisma.Decimal(value);
  const s = d.toDecimalPlaces(2).toString();
  return `${s}%`;
}
