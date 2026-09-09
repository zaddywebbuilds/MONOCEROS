import { ImageResponse } from "next/og";

import { siteName } from "@/lib/env";

/**
 * The card every page shows when its link is shared.
 *
 * Nothing on the site had an og:image, so links posted to WhatsApp, Telegram,
 * X or LinkedIn rendered as bare text — which for a financial platform reads as
 * less trustworthy than it is. This is generated at build time from the brand
 * palette rather than shipped as a binary, so it stays in step with the site and
 * costs nothing to keep.
 *
 * Deliberately plain: a name, a description of what the platform does, and no
 * figures. A share card is the one place a number would travel with no context
 * and no disclaimer attached to it.
 */

export const alt = `${siteName} — structured investment management`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(140deg, #0d1524 0%, #05080f 60%, #04060c 100%)",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Warm light, matching the panels through the site. */}
        <div
          style={{
            position: "absolute",
            top: -180,
            left: -120,
            width: 620,
            height: 620,
            borderRadius: 999,
            background: "radial-gradient(circle, rgba(217,174,92,0.20) 0%, rgba(217,174,92,0) 70%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              border: "2px solid #c9963f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#e6c987",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            M
          </div>
          <div
            style={{
              color: "#e9eef6",
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: -0.4,
            }}
          >
            {siteName}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: "#e9eef6",
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: -2,
              maxWidth: 900,
            }}
          >
            Structured investment management
          </div>
          <div
            style={{
              marginTop: 26,
              color: "#94a4bd",
              fontSize: 28,
              lineHeight: 1.4,
              maxWidth: 860,
            }}
          >
            Verified accounts, weekly investment cycles and clear fixed terms.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 120, height: 3, background: "linear-gradient(90deg,#c9963f,#12c99b)" }} />
          <div style={{ color: "#64748b", fontSize: 22 }}>Capital is at risk</div>
        </div>
      </div>
    ),
    size,
  );
}
