import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";

import { PageHeader, DocumentBody, DocumentLayout } from "@/components/marketing/prose";
import { getPublicSettings } from "@/lib/settings";
import { getContentBlock } from "@/server/queries/public";
import { legalDocuments, type LegalSlug } from "@/content/legal";
import { appUrl } from "@/lib/env";
import { formatShortDate } from "@/lib/time";

const RELATED: { slug: LegalSlug; label: string; href: string }[] = [
  { slug: "terms", label: "Terms & Conditions", href: "/terms" },
  { slug: "privacy", label: "Privacy Policy", href: "/privacy" },
  { slug: "risk-disclosure", label: "Risk Disclosure", href: "/risk-disclosure" },
  { slug: "aml-kyc", label: "AML/KYC Policy", href: "/aml-kyc" },
];

export async function legalMetadata(slug: LegalSlug, path: string): Promise<Metadata> {
  const settings = await getPublicSettings();
  const doc = legalDocuments(settings)[slug];
  return {
    title: doc.title,
    description: doc.summary,
    alternates: { canonical: `${appUrl}${path}` },
  };
}

export async function LegalPageView({ slug }: { slug: LegalSlug }) {
  const settings = await getPublicSettings();
  const fallback = legalDocuments(settings)[slug];
  const override = await getContentBlock(slug);

  const title = override?.title ?? fallback.title;
  const body = override?.body ?? fallback.body;
  const updatedAt = override?.updatedAt ?? null;

  return (
    <>
      <PageHeader eyebrow="Legal" title={title} description={fallback.summary} />
      <DocumentLayout
        aside={
          <div className="surface p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
              Related documents
            </p>
            <ul className="mt-4 space-y-2.5">
              {RELATED.filter((item) => item.slug !== slug).map((item) => (
                <li key={item.slug}>
                  <Link
                    href={item.href}
                    className="text-[13.5px] text-fg-muted transition-colors hover:text-accent-300"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-ink-700/60 pt-4">
              <p className="text-[12px] leading-relaxed text-fg-subtle">
                {updatedAt
                  ? `Last updated ${formatShortDate(updatedAt)}.`
                  : "This is the default document supplied with the platform. An administrator can replace it from Admin → Website Content."}
              </p>
            </div>
          </div>
        }
      >
        <DocumentBody body={body} />
      </DocumentLayout>
    </>
  );
}
