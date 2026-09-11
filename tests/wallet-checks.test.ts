import { describe, expect, it } from "vitest";

import { checkEvm, checkTron } from "../scripts/wallet-checks";

/**
 * These guard the one mistake in the platform that cannot be undone.
 *
 * A deposit sent to a wrong address is gone, and nothing in the payment screen
 * looks any different when the address is wrong. So the checker has two ways to
 * cause harm, and both are tested: saying "valid" about a corrupted address,
 * and saying "invalid" about a correct one — the latter being the more
 * dangerous of the two, because it invites someone to edit an address that was
 * already right.
 *
 * The Tron addresses below are well-known public mainnet addresses (the
 * USDT-TRC20 contract and a Binance hot wallet), used purely as known-good
 * fixtures.
 */

const KNOWN_GOOD_TRON = [
  "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  "TMuA6YqfCeX8EhbfYEg5y7S4DqzSJireY9",
];

describe("checkTron", () => {
  it.each(KNOWN_GOOD_TRON)("accepts the known-good address %s", (address) => {
    expect(checkTron(address)).toEqual({ ok: true, detail: "checksum valid" });
  });

  it("rejects every single-character substitution of a valid address", () => {
    const base = KNOWN_GOOD_TRON[0];
    const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

    let tested = 0;
    for (let i = 1; i < base.length; i++) {
      for (const ch of alphabet) {
        if (base[i] === ch) continue;
        const mutated = base.slice(0, i) + ch + base.slice(i + 1);
        tested++;
        expect(checkTron(mutated).ok, `accepted a corrupted address: ${mutated}`).toBe(false);
      }
    }

    // Guard against the loop silently doing nothing.
    expect(tested).toBeGreaterThan(1_800);
  });

  it("rejects a transposition of two adjacent characters", () => {
    const base = KNOWN_GOOD_TRON[0];
    let transposed = 0;
    for (let i = 1; i < base.length - 1; i++) {
      if (base[i] === base[i + 1]) continue;
      const mutated = base.slice(0, i) + base[i + 1] + base[i] + base.slice(i + 2);
      transposed++;
      expect(checkTron(mutated).ok, `accepted a transposition: ${mutated}`).toBe(false);
    }
    expect(transposed).toBeGreaterThan(20);
  });

  it("rejects a truncated or padded address", () => {
    const base = KNOWN_GOOD_TRON[0];
    expect(checkTron(base.slice(0, -1)).ok).toBe(false);
    expect(checkTron(`${base}x`).ok).toBe(false);
  });

  it("rejects an empty string and an address for another chain", () => {
    expect(checkTron("").ok).toBe(false);
    expect(checkTron("0xC0ffee254729296a45a3885639AC7E10F9d54979").ok).toBe(false);
  });

  it("rejects characters that are not in the base58 alphabet", () => {
    // 0, O, I and l are excluded from base58 precisely because they are
    // confusable — exactly the substitution a human transcribing by eye makes.
    const base = KNOWN_GOOD_TRON[0];
    for (const ch of ["0", "O", "I", "l"]) {
      expect(checkTron(base.slice(0, 5) + ch + base.slice(6)).ok).toBe(false);
    }
  });
});

describe("checkEvm", () => {
  it("accepts a well-formed address", () => {
    expect(checkEvm("0xC0ffee254729296a45a3885639AC7E10F9d54979").ok).toBe(true);
  });

  it("does not claim more than format", () => {
    expect(checkEvm("0xC0ffee254729296a45a3885639AC7E10F9d54979").detail).toMatch(/by eye/);
  });

  it("rejects wrong length, missing prefix and non-hex characters", () => {
    expect(checkEvm("0xC0ffee254729296a45a3885639AC7E10F9d549").ok).toBe(false);
    expect(checkEvm("C0ffee254729296a45a3885639AC7E10F9d54979").ok).toBe(false);
    expect(checkEvm("0xZZffee254729296a45a3885639AC7E10F9d54979").ok).toBe(false);
    expect(checkEvm("").ok).toBe(false);
  });
});
