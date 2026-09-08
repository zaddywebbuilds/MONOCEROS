import type { Metadata } from "next";
import { Quote } from "lucide-react";

import { DashboardPage, PageTitle } from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { AddTestimonialPanel, TestimonialForm } from "@/components/admin/testimonial-forms";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Testimonials" };

export default async function AdminTestimonialsPage() {
  const testimonials = await prisma.testimonial.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <DashboardPage className="max-w-4xl">
      <PageTitle
        title="Investor testimonials"
        description="Published testimonials appear on the homepage and the /testimonials page. Attach a receipt image URL to show proof of payment or withdrawal."
        actions={<AddTestimonialPanel />}
      />

      {testimonials.length === 0 ? (
        <EmptyState
          icon={<Quote className="size-5" />}
          title="No testimonials yet"
          description="Add your first investor testimonial to build trust on the public site."
        />
      ) : (
        <ul className="space-y-4">
          {testimonials.map((t) => (
            <li key={t.id}>
              <Card className="p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <StatusPill tone={t.published ? "active" : "neutral"}>
                      {t.published ? "Published" : "Hidden"}
                    </StatusPill>
                    {t.featured ? (
                      <StatusPill tone="matured">Featured</StatusPill>
                    ) : null}
                    <span className="text-[12px] font-semibold text-fg">{t.name}</span>
                    {t.location ? (
                      <span className="text-[11.5px] text-fg-subtle">· {t.location}</span>
                    ) : null}
                  </div>
                </div>
                <p className="mb-4 text-[13px] leading-relaxed text-fg-muted line-clamp-3">
                  {t.content}
                </p>
                {t.receiptImageUrl ? (
                  <a
                    href={t.receiptImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-4 block text-[12px] text-accent-400 hover:underline"
                  >
                    Receipt image attached →
                  </a>
                ) : null}
                <TestimonialForm testimonial={t} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </DashboardPage>
  );
}
