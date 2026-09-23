import { createHash } from "node:crypto";

/**
 * Base58check, as used by Tron addresses.
 *
 * Lives here rather than in the wallet-verification script because deposit
 * checking needs the same decoding: a Tron address on screen is base58, but a
 * transaction on chain names it in hex, and the two have to be compared before
 * anybody's payment is approved.
 */

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function base58Decode(input: string): Buffer | null {
  let n = 0n;
  for (const ch of input) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) return null;
    n = n * 58n + BigInt(i);
  }

  const bytes: number[] = [];
  while (n > 0n) {
    bytes.unshift(Number(n & 0xffn));
    n >>= 8n;
  }
  for (const ch of input) {
    if (ch !== "1") break;
    bytes.unshift(0);
  }
  return Buffer.from(bytes);
}

const sha256 = (b: Buffer) => createHash("sha256").update(b).digest();

/** True when the 4-byte double-SHA256 checksum matches the payload. */
export function base58CheckValid(input: string): boolean {
  const raw = base58Decode(input);
  if (!raw || raw.length < 5) return false;

  const payload = raw.subarray(0, raw.length - 4);
  const checksum = raw.subarray(raw.length - 4);
  return checksum.equals(sha256(sha256(payload)).subarray(0, 4));
}

/**
 * Tron base58 address to its on-chain hex form, lowercase and without the
 * leading "41" network byte, so it can be compared against the 20-byte address
 * embedded in a TRC-20 transfer.
 */
export function tronAddressToHex(address: string): string | null {
  if (!base58CheckValid(address)) return null;

  const raw = base58Decode(address);
  if (!raw || raw.length !== 25) return null;
  if (raw[0] !== 0x41) return null;

  return raw.subarray(1, 21).toString("hex").toLowerCase();
}
