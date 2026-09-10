import * as React from "react";

import { appUrl } from "@/lib/env";
import { jsonLdHtml } from "@/lib/json-ld";
import type { SettingsMap } from "@/lib/settings";

/**
 * Structured data for search engines.
 *
 * Only fields the site can actually stand behind: the name, the URL, what the
 * platform does, and whatever contact details an administrator has genuinely
 * published. Anything left blank in settings is omitted rather than guessed at.
 *
 * Deliberately absent: any review, rating or aggregateRating markup. Those are
 * the schema types that earn rich snippets, which is exactly why inventing them
 * is both a manual-action risk with Google and a straightforward lie about a
 * financial product. If real, verifiable reviews ever exist, they can be added
 * from that data — not before.
 */
export function StructuredData({ settings }: { settings: SettingsMap }) {
  const name = settings["company.name"];
  const legalName = settings["company.legalName"];
  const email = settings["support.email"];
  const phone = settings["support.phone"];
  const address = settings["company.address"];

  const organisation: Record<string, unknown> = {
    "@type": "Organization",
    "@id": `${appUrl}/#organization`,
    name,
    url: appUrl,
    description: settings["company.description"],
    logo: `${appUrl}/icon.svg`,
  };

  if (legalName) organisation.legalName = legalName;
  if (address) organisation.address = address;

  if (email || phone) {
    organisation.contactPoint = {
      "@type": "ContactPoint",
      contactType: "customer support",
      ...(email ? { email } : {}),
      ...(phone ? { telephone: phone } : {}),
      ...(settings["support.hours"] ? { hoursAvailable: settings["support.hours"] } : {}),
    };
  }

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      organisation,
      {
        "@type": "WebSite",
        "@id": `${appUrl}/#website`,
        url: appUrl,
        name,
        publisher: { "@id": `${appUrl}/#organization` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdHtml(graph) }}
    />
  );
}
