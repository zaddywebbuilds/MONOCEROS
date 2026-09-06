"use client";

/**
 * Last-resort boundary. It replaces the root layout, so it must render its own
 * <html> and <body> and cannot rely on the app's CSS being applied.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#04060c",
          color: "#e9eef6",
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <p
            style={{
              fontSize: 13,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#12c99b",
              margin: 0,
            }}
          >
            Monoceros
          </p>
          <h1 style={{ fontSize: 22, margin: "16px 0 0", fontWeight: 600 }}>
            The application could not start
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#94a4bd", marginTop: 12 }}>
            A critical error stopped the page from rendering. Your account and investment records
            are unaffected.
          </p>
          {error.digest ? (
            <p style={{ fontSize: 11, color: "#64748b", marginTop: 16 }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "11px 22px",
              borderRadius: 10,
              border: "none",
              background: "#12c99b",
              color: "#04060c",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
