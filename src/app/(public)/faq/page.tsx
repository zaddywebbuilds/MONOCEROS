import type { Metadata } from "next";
import { jsonLdHtml } from "@/lib/json-ld";

import { PageHeader } from "@/components/marketing/prose";
import { FaqSection, SupportSection } from "@/components/marketing/sections";
import { getPublicFaqs } from "@/server/queries/public";
import { getPublicSettings } from "@/lib/settings";
import { appUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers about Monoceros investment packages, weekly cycles, USDT payments, identity verification, withdrawals and rollovers.",
  alternates: { canonical: `${appUrl}/faq` },
};

export default async function FaqPage() {
  const [faqs, settings] = await Promise.all([getPublicFaqs(), getPublicSettings()]);

  // Structured data so the answers can surface in search results.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <>
      {faqs.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
        />
      ) : null}

      <PageHeader
        eyebrow="Help"
        title="Frequently asked questions"
        description="If your question is not answered here, open a support ticket from your dashboard or contact the team directly."
      />

      <FaqSection faqs={faqs} />
      <SupportSection settings={settings} />
    </>
  );
}
