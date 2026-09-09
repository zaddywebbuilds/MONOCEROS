import type { Metadata } from "next";

import { PageHeader } from "@/components/marketing/prose";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";
import { EmptyState } from "@/components/ui/feedback";
import { getPublicTestimonials } from "@/server/queries/public";
import { appUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Investor Testimonials",
  description:
    "Testimonials published by Monoceros from verified investors, alongside the records that accompany them.",
  alternates: { canonical: `${appUrl}/testimonials` },
};

export const revalidate = 60;

export default async function TestimonialsPage() {
  const testimonials = await getPublicTestimonials();

  return (
    <>
      {/* This page was the only one without a PageHeader, which left it with no
          <h1> at all and out of step with the rest of the site. */}
      <PageHeader
        eyebrow="Testimonials"
        title="What our investors say"
        description="Published accounts from verified Monoceros investors."
      />

      {/* The section renders nothing when empty, which left this page as a
          header above blank space. Say so instead. */}
      {testimonials.length === 0 ? (
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <EmptyState
            title="No testimonials published yet"
            description="When investors share their experience and agree to it being published, it will appear here."
          />
        </div>
      ) : (
        <TestimonialsSection testimonials={testimonials} />
      )}
    </>
  );
}
