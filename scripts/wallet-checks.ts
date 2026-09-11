import { createHash } from "node:crypto";

/**
 * Address validation for the deposit wallets.
 *
 * Separate from verify-wallets.ts so it can be tested without opening a
 * database connection. A bug in here is worse than having no check at all: a
 * false "valid" gives misplaced confidence in a wrong address, and a false
 * "invalid" invites someone to "correct" an address that was already right.
 * Hence tests/wallet-checks.test.ts.
 */

export interface AddressCheck {
  ok: boolean;
  detail: string;
}

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function base58Decode(input: string): Buffer | null {
  let n = 0n;
  for (const ch of input) {
    const i = B58.indexOf(ch);
    if (i < 0) return null; // character outside the alphabet
    n = n * 58n + BigInt(i);
  }

  const bytes: number[] = [];
  while (n > 0n) {
    bytes.unshift(Number(n & 0xffn));
    n >>= 8n;
  }
  // Leading '1's in base58 encode leading zero bytes.
  for (const ch of input) {
    if (ch !== "1") break;
    bytes.unshift(0);
  }
  return Buffer.from(bytes);
}

const sha256 = (b: Buffer) => createHash("sha256").update(b).digest();

/**
 * Genuine cryptographic validation, not a format guess.
 *
 * A Tron address carries a 4-byte double-SHA256 checksum over its payload, so
 * a single altered character fails with probability about 1 - 2^-32. This is
 * the strongest check available without a network call.
 */
export function checkTron(address: string): AddressCheck {
  if (!address.startsWith("T")) return { ok: false, detail: "does not start with 'T'" };
  if (address.length !== 34) {
    return { ok: false, detail: `is ${address.length} characters, expected 34` };
  }

  const raw = base58Decode(address);
  if (!raw) return { ok: false, detail: "contains characters that are not valid base58" };
  if (raw.length !== 25) return { ok: false, detail: "decodes to the wrong length" };

  const payload = raw.subarray(0, 21);
  const checksum = raw.subarray(21);
  if (payload[0] !== 0x41) return { ok: false, detail: "is not a Tron mainnet address" };

  const expected = sha256(sha256(payload)).subarray(0, 4);
  if (!checksum.equals(expected)) {
    return { ok: false, detail: "FAILS ITS CHECKSUM — at least one character is wrong" };
  }
  return { ok: true, detail: "checksum valid" };
}

/**
 * Format only, and it says so.
 *
 * Validating an EVM address properly means checking its EIP-55 mixed-case
 * checksum, which needs keccak256. There is no keccak implementation in this
 * project and hand-rolling one is the wrong trade: a subtly incorrect version
 * would report a perfectly good address as broken and invite someone to edit
 * it. Better to claim only what can be shown and send the reader to their
 * wallet app for the rest.
 */
export function checkEvm(address: string): AddressCheck {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return { ok: false, detail: "is not 0x followed by 40 hexadecimal characters" };
  }
  return { ok: true, detail: "format valid — content must be confirmed by eye" };
}
