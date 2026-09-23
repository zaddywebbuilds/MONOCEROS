import { describe, expect, it } from "vitest";

import { parseTransferInput, formatUnits, explorerUrl } from "../src/server/services/chain";
import { tronAddressToHex, base58CheckValid } from "../src/lib/base58";

/**
 * These decode who was actually paid. Every fake payment the platform has seen
 * would have been caught here, so the real transaction data from those two
 * incidents is used as fixtures.
 */

// The real BNB Chain transfer submitted as a $1,000 TRC-20 payment on
// 2026-09-17: 1,002.93 USDT, sent in March 2025, to a stranger's wallet.
const CHIKE_INPUT =
  "0xa9059cbb0000000000000000000000007975f104565c7bfffc9b5d3c6d7a143afc3666e00000000000000000000000000000000000000000000000365e68d3b6e8abc000";

describe("parseTransferInput", () => {
  it("reads the recipient and amount from a real transfer", () => {
    const parsed = parseTransferInput(CHIKE_INPUT);
    expect(parsed).not.toBeNull();
    expect(parsed!.to).toBe("7975f104565c7bfffc9b5d3c6d7a143afc3666e0");
    expect(formatUnits(parsed!.amount, 18)).toBe("1002.92");
  });

  it("shows the recipient is not the company wallet", () => {
    const company = "0xC99B839fB6f7d922728AeDDb17ED958Ea13898C8".replace(/^0x/, "").toLowerCase();
    expect(parseTransferInput(CHIKE_INPUT)!.to).not.toBe(company);
  });

  it("rejects anything that is not a transfer call", () => {
    expect(parseTransferInput("0x")).toBeNull();
    expect(parseTransferInput("0xdeadbeef")).toBeNull();
    // Right selector, truncated arguments.
    expect(parseTransferInput("0xa9059cbb0000")).toBeNull();
  });
});

describe("formatUnits", () => {
  it("handles both decimal scales without floating point", () => {
    expect(formatUnits(1_000_000_000n, 6)).toBe("1000.00");
    expect(formatUnits(10n ** 18n, 18)).toBe("1.00");
    expect(formatUnits(0n, 6)).toBe("0.00");
    // 3,000 USDT on Tron.
    expect(formatUnits(3_000_000_000n, 6)).toBe("3000.00");
  });

  it("does not round a shortfall up into looking paid", () => {
    expect(formatUnits(999_999_999n, 6)).toBe("999.99");
  });
});

describe("tronAddressToHex", () => {
  it("converts the company TRC-20 address", () => {
    // Checksum-valid company address, verified separately.
    expect(base58CheckValid("TBDNNRNN8mtqLpU5pXYN2ua6nmH8JZzJhq")).toBe(true);
    const hex = tronAddressToHex("TBDNNRNN8mtqLpU5pXYN2ua6nmH8JZzJhq");
    expect(hex).toMatch(/^[0-9a-f]{40}$/);
  });

  it("converts the USDT contract to the constant the verifier compares against", () => {
    expect(tronAddressToHex("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t")).toBe(
      "a614f803b6fd780986a42c78ec9c7f77e6ded13c",
    );
  });

  it("refuses a corrupted address rather than returning a wrong one", () => {
    expect(tronAddressToHex("TBDNNRNN8mtqLpU5pXYN2ua6nmH8JZzJhX")).toBeNull();
    expect(tronAddressToHex("0xC99B839fB6f7d922728AeDDb17ED958Ea13898C8")).toBeNull();
    expect(tronAddressToHex("")).toBeNull();
  });
});

describe("explorerUrl", () => {
  it("points at the right explorer per network", () => {
    expect(explorerUrl("BEP20", "0xabc")).toBe("https://bscscan.com/tx/0xabc");
    expect(explorerUrl("TRC20", "abc")).toBe("https://tronscan.org/#/transaction/abc");
    // Tron hashes carry no 0x prefix; a pasted one must not reach the URL.
    expect(explorerUrl("TRC20", "0xabc")).toBe("https://tronscan.org/#/transaction/abc");
    expect(explorerUrl("DOGE", "abc")).toBeNull();
  });
});
