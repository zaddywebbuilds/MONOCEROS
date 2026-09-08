import "server-only";

import { createHash, randomBytes } from "node:crypto";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

const ISSUER = "Monoceros";
const DIGITS = 6;
const PERIOD = 30;
const ALGORITHM = "SHA1";
// Allow 1 step back/forward (30 s clock drift tolerance)
const WINDOW = 1;

export function generateTotpSecret(): string {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

export function getTotpUri(accountEmail: string, secret: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: accountEmail,
    secret: OTPAuth.Secret.fromBase32(secret),
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
  });
  return totp.toString();
}

export async function getTotpQrDataUri(accountEmail: string, secret: string): Promise<string> {
  const uri = getTotpUri(accountEmail, secret);
  return QRCode.toDataURL(uri, { width: 200, margin: 2, color: { dark: "#000000", light: "#ffffff" } });
}

export function verifyTotpCode(secret: string, code: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      secret: OTPAuth.Secret.fromBase32(secret),
      algorithm: ALGORITHM,
      digits: DIGITS,
      period: PERIOD,
    });
    return totp.validate({ token: code.replace(/\s/g, ""), window: WINDOW }) !== null;
  } catch {
    return false;
  }
}

// 8 recovery codes in the format XXXXX-XXXXX (10 hex chars, uppercase)
export function generateRecoveryCodes(): string[] {
  return Array.from({ length: 8 }, () => {
    const hex = randomBytes(5).toString("hex").toUpperCase();
    return `${hex.slice(0, 5)}-${hex.slice(5)}`;
  });
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256")
    .update(code.toUpperCase().replace(/-/g, ""))
    .digest("hex");
}
