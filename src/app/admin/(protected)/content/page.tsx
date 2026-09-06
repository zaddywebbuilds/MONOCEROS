import type { Metadata } from "next";
import Link from "next/link";

import { DashboardPage, PageTitle } from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/feedback";
import { ContentForm } from "@/components/admin/faq-forms";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { legalDocuments, type LegalSlug } from "@/content/legal";
import { formatBusinessDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Website content" };

const ABOUT_DEFAULT = `## What Monoceros is

Monoceros is an investment subscription management platform.`;

const EDITABLE: { slug: LegalSlug | "about"; label: string; href: string }[] = [
  { slug: "about", label: "About page", href: "/about" },
  { slug: "terms", label: "Terms & Conditions", href: "/terms" },
  { slug: "privacy", label: "Privacy Policy", href: "/privacy" },
  { slug: "risk-disclosure", label: "Risk Disclosure", href: "/risk-disclosure" },
  { slug: "aml-kyc", label: "AML/KYC Policy", href: "/aml-kyc" },
];

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const selected = (params.page ?? "about") as LegalSlug | "about";
  const active = EDITABLE.find((item) => item.slug === selected) ?? EDITABLE[0]!;

  const [settings, block] = await Promise.all([
    getSettings(),
    prisma.contentBlock.findUnique({ where: { slug: active.slug } }),
  ]);

  const defaults = legalDocuments(settings);
  const fallback =
    active.slug === "about"
      ? { title: settings["company.name"], body: ABOUT_DEFAULT }
      : { title: defaults[active.slug].title, body: defaults[active.slug].body };

  return (
    <DashboardPage className="max-w-5xl">
      <PageTitle
        title="Website content"
        description="Edit the long-form pages published on the public site. Company details, support contacts and social links live under Settings."
      />

      <InfoNote tone="warning" className="mb-5">
        Do not publish regulatory licence numbers, registration numbers, audited figures or
        certifications unless the business actually holds them and you can evidence them. Where a
        value is unavailable, leave it out rather than filling it in.
      </InfoNote>

      <nav aria-label="Content pages" className="mb-5 flex flex-wrap gap-2">
        {EDITABLE.map((item) => (
          <Link
            key={item.slug}
            href={`/admin/content?page=${item.slug}`}
            aria-current={item.slug === active.slug ? "page" : undefined}
            className={
              item.slug === active.slug
                ? "rounded-lg border border-accent-600 bg-accent-900/30 px-3.5 py-2 text-[12.5px] font-medium text-accent-200"
                : "rounded-lg border border-ink-600 px-3.5 py-2 text-[12.5px] font-medium text-fg-muted transition-colors hover:text-fg"
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-ink-700/60 pb-4">
          <div>
            <h2 className="text-[15px] font-semibold text-fg">{active.label}</h2>
            <p className="mt-1 text-[12px] text-fg-subtle">
              {block
                ? `Custom version, last updated ${formatBusinessDateTime(block.updatedAt)}.`
                : "Currently showing the default document supplied with the platform."}
            </p>
          </div>
          <Link
            href={active.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12.5px] font-medium text-accent-300 hover:underline"
          >
            View live page →
          </Link>
        </div>

        <ContentForm
          slug={active.slug}
          title={block?.title ?? fallback.title}
          body={block?.body ?? fallback.body}
        />
      </Card>
    </DashboardPage>
  );
}
