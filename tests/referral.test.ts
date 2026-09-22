import { describe, expect, it } from "vitest";

import { usernameSchema } from "../src/lib/validation/common";
import { referralLink } from "../src/lib/referral";

/**
 * A username is not cosmetic here: it becomes the public half of a referral
 * link on the company's own domain. "admin-7F3K9Q" sent in a WhatsApp message
 * is a credible phishing link, so the reserved list is a security control
 * rather than a nicety, and it is tested as one.
 */
describe("usernameSchema", () => {
  it("accepts ordinary handles and lowercases them", () => {
    expect(usernameSchema.parse("Stanley_O")).toBe("stanley_o");
    expect(usernameSchema.parse("  chike22  ")).toBe("chike22");
  });

  it.each([
    "admin",
    "Support",
    "MONOCEROS",
    "security",
    "verification",
    "withdrawal",
    "billing",
    "official",
  ])("refuses the reserved name %s in any case", (name) => {
    expect(usernameSchema.safeParse(name).success).toBe(false);
  });

  it("refuses names that could be mistaken for a path or an email", () => {
    for (const bad of ["ab", "a".repeat(21), "1stanley", "_stanley", "stan ley", "stan.ley", "stan-ley", "stan/ley", "stan@ley", ""]) {
      expect(usernameSchema.safeParse(bad).success, `accepted ${JSON.stringify(bad)}`).toBe(false);
    }
  });
});

describe("referralLink", () => {
  it("builds a link that survives a trailing slash on the app URL", () => {
    expect(referralLink("https://www.monocerosai.live", "stanley-7F3K9Q")).toBe(
      "https://www.monocerosai.live/r/stanley-7F3K9Q",
    );
    expect(referralLink("https://www.monocerosai.live/", "stanley-7F3K9Q")).toBe(
      "https://www.monocerosai.live/r/stanley-7F3K9Q",
    );
  });
});

/**
 * Commission is 10% of PROFIT, not of capital. Getting this wrong by using the
 * maturity amount would pay $140 on a $1,000 Diamond instead of $40, and on
 * Tanzanite it would be $8,500 instead of $3,500.
 */
describe("commission arithmetic", () => {
  const commission = (principal: number, maturity: number, percentage: number) => {
    const profit = maturity - principal;
    return Math.round(profit * percentage) / 100;
  };

  it("pays on the profit for each live package", () => {
    expect(commission(1000, 1400, 10)).toBe(40); // Diamond
    expect(commission(3000, 4500, 10)).toBe(150); // Sapphire
    expect(commission(500, 650, 10)).toBe(15); // Gold
    expect(commission(10000, 17000, 10)).toBe(700); // Alexandrite
    expect(commission(50000, 85000, 10)).toBe(3500); // Tanzanite
  });

  it("pays nothing when there is no profit", () => {
    expect(commission(1000, 1000, 10)).toBe(0);
  });
});
