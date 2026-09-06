import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";

import { applyReturn, addMoney, formatUSD, formatPercent, money, subMoney } from "@/lib/money";
import { SEED_PACKAGES } from "../prisma/seed-data";

/**
 * Money handling and package arithmetic.
 *
 * Monetary values must never touch a JavaScript float, and the maturity amount
 * of every seeded package must be exactly reproducible from its capital and
 * return percentage.
 */

describe("decimal arithmetic", () => {
  it("does not lose precision the way floating point does", () => {
    // 0.1 + 0.2 !== 0.3 in binary floating point.
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(addMoney("0.1", "0.2").equals(new Prisma.Decimal("0.3"))).toBe(true);
  });

  it("subtracts exactly", () => {
    expect(subMoney("650.00", "500.00").toFixed(2)).toBe("150.00");
  });

  it("rounds a maturity amount to two decimal places, half up", () => {
    // 333.335 at 0% stays put; at a rate producing a half, it rounds up.
    expect(applyReturn("100.00", "12.345").toFixed(2)).toBe("112.35");
  });

  it("formats amounts for display without altering the stored value", () => {
    const value = money("1400.5");
    expect(formatUSD(value)).toBe("$1,400.50");
    expect(value.toFixed(2)).toBe("1400.50");
  });

  it("trims trailing zeros from a percentage", () => {
    expect(formatPercent("30.0000")).toBe("30%");
    expect(formatPercent("30.5000")).toBe("30.5%");
  });
});

describe("seeded package terms", () => {
  it("matches the commercial terms the business published", () => {
    const expected = [
      { name: "Gold", capital: "500.00", rate: "30", maturity: "650.00" },
      { name: "Diamond", capital: "1000.00", rate: "40", maturity: "1400.00" },
      { name: "Sapphire", capital: "3000.00", rate: "50", maturity: "4500.00" },
      { name: "Emerald", capital: "5000.00", rate: "60", maturity: "8000.00" },
      { name: "Alexandrite", capital: "10000.00", rate: "70", maturity: "17000.00" },
    ];

    expect(SEED_PACKAGES).toHaveLength(expected.length);

    for (const row of expected) {
      const pkg = SEED_PACKAGES.find((candidate) => candidate.name === row.name);
      expect(pkg, `package ${row.name} is missing`).toBeDefined();
      expect(pkg!.minimumCapital).toBe(row.capital);
      expect(pkg!.returnPercentage).toBe(row.rate);
      expect(pkg!.maturityAmount).toBe(row.maturity);
      expect(pkg!.durationDays).toBe(30);
    }
  });

  it("derives every published maturity amount from capital and return", () => {
    for (const pkg of SEED_PACKAGES) {
      const derived = applyReturn(pkg.minimumCapital, pkg.returnPercentage);
      expect(
        derived.toFixed(2),
        `${pkg.name}: ${pkg.minimumCapital} at ${pkg.returnPercentage}%`,
      ).toBe(pkg.maturityAmount);
    }
  });

  it("uses unique slugs and a stable display order", () => {
    const slugs = SEED_PACKAGES.map((pkg) => pkg.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    const orders = SEED_PACKAGES.map((pkg) => pkg.displayOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});

describe("rollover arithmetic", () => {
  it("compounds the FULL matured amount, not the original capital", () => {
    // Gold: 500 -> 650. Rolling over uses 650 as the new principal.
    const maturedAmount = applyReturn("500.00", "30");
    expect(maturedAmount.toFixed(2)).toBe("650.00");

    const rolled = applyReturn(maturedAmount, "30");
    expect(rolled.toFixed(2)).toBe("845.00");
  });

  it("keeps compounding correctly over several rollovers", () => {
    let amount = money("500.00");
    const sequence: string[] = [];

    for (let cycle = 0; cycle < 3; cycle += 1) {
      amount = applyReturn(amount, "30");
      sequence.push(amount.toFixed(2));
    }

    expect(sequence).toEqual(["650.00", "845.00", "1098.50"]);
  });

  it("applies a different package percentage when that mode is configured", () => {
    // A Gold investment matures at 650; rolled into Diamond's 40%.
    expect(applyReturn("650.00", "40").toFixed(2)).toBe("910.00");
  });

  it("never produces a maturity amount below the principal for a positive rate", () => {
    for (const pkg of SEED_PACKAGES) {
      const maturity = applyReturn(pkg.minimumCapital, pkg.returnPercentage);
      expect(maturity.greaterThan(new Prisma.Decimal(pkg.minimumCapital))).toBe(true);
    }
  });
});
