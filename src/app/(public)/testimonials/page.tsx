import type { Metadata } from "next";

import { TestimonialsSection } from "@/components/marketing/testimonials-section";
import { getPublicTestimonials } from "@/server/queries/public";

export const metadata: Metadata = {
  title: "Investor Testimonials",
  description: "Read real testimonials and withdrawal receipts from verified Monoceros investors.",
};

export const revalidate = 60;

export default async function TestimonialsPage() {
  const testimonials = await getPublicTestimonials();

  return (
    <main>
      <TestimonialsSection testimonials={testimonials} />
    </main>
  );
}
