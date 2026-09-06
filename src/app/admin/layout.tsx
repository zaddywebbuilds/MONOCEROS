import * as React from "react";
import type { Metadata } from "next";

/**
 * Thin shell for everything under /admin.
 *
 * The authenticated chrome lives in the (protected) route group so that
 * /admin/login can render without a session.
 */
export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · Monoceros Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
