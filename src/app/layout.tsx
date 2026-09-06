import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { appUrl, siteName } from "@/lib/env";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: `${siteName} — Automated Market Intelligence, Structured Investment Management`,
    template: `%s · ${siteName}`,
  },
  description:
    "Monoceros is an investment subscription management platform: choose a package, verify your identity, submit payment and track a structured 30-day investment term with clear records.",
  applicationName: siteName,
  keywords: [
    "investment management platform",
    "investment subscriptions",
    "structured investment cycles",
    "Nigeria investment platform",
  ],
  authors: [{ name: siteName }],
  openGraph: {
    type: "website",
    siteName,
    url: appUrl,
    title: `${siteName} — Structured Investment Management`,
    description:
      "A streamlined platform for managing investment subscriptions, weekly investment cycles and 30-day investment terms.",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} — Structured Investment Management`,
    description:
      "A streamlined platform for managing investment subscriptions, weekly investment cycles and 30-day investment terms.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#04060c",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-accent-500 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink-950"
        >
          Skip to main content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
