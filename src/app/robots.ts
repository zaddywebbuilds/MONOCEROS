import type { MetadataRoute } from "next";

import { appUrl } from "@/lib/env";

/**
 * Only the public marketing pages are indexable. Everything behind
 * authentication — dashboards, admin, auth flows and document delivery — is
 * excluded here and additionally sends X-Robots-Tag headers (next.config.ts).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/dashboard/",
          "/admin",
          "/admin/",
          "/api/",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
        ],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
