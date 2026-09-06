import "server-only";

import QRCode from "qrcode";

/**
 * Renders a wallet address as a QR data URL on the server.
 *
 * Generated at request time from the admin-configured address so the image can
 * never drift from the address shown in text beside it.
 */
export async function walletQrDataUrl(address: string): Promise<string | null> {
  if (!address) return null;

  try {
    return await QRCode.toDataURL(address, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
      color: {
        dark: "#e9eef6",
        light: "#0b111e",
      },
    });
  } catch {
    return null;
  }
}
