import * as React from "react";
import Link from "next/link";
import { Quote, ArrowRight } from "lucide-react";

import { SectionEyebrow, Hairline } from "@/components/visuals/decor";
import { ButtonLink } from "@/components/ui/button";
import type { PublicTestimonial } from "@/server/queries/public";

function TestimonialCard({ testimonial }: { testimonial: PublicTestimonial }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-ink-700/60 bg-ink-900/50 p-6 backdrop-blur-sm">
      <Quote className="size-5 shrink-0 text-accent-500/70" aria-hidden />
      <p className="flex-1 text-[13.5px] leading-relaxed text-fg-muted">{testimonial.content}</p>

      {testimonial.receiptImageUrl ? (
        <a
          href={testimonial.receiptImageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-lg border border-ink-600"
          aria-label="View receipt"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={testimonial.receiptImageUrl}
            alt="Withdrawal receipt"
            className="w-full object-cover transition-opacity hover:opacity-90"
            style={{ maxHeight: 200 }}
            loading="lazy"
          />
        </a>
      ) : null}

      <div className="mt-auto border-t border-ink-700/50 pt-4">
        <p className="text-[13px] font-semibold text-fg">{testimonial.name}</p>
        {testimonial.location ? (
          <p className="mt-0.5 text-[11.5px] text-fg-subtle">{testimonial.location}</p>
        ) : null}
        {testimonial.featured ? (
          <span className="mt-2 inline-block rounded-full border border-accent-700/60 bg-accent-900/40 px-2 py-0.5 text-[10px] uppercase tracking-widest text-accent-300">
            Featured
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function TestimonialsSection({
  testimonials,
  preview = false,
}: {
  testimonials: PublicTestimonial[];
  preview?: boolean;
}) {
  if (testimonials.length === 0) return null;

  const shown = preview ? testimonials.slice(0, 3) : testimonials;

  return (
    <section
      // On its own page the PageHeader above supplies the heading, so the
      // section labels itself instead of pointing at a heading it no longer draws.
      aria-labelledby={preview ? "testimonials-heading" : undefined}
      aria-label={preview ? undefined : "Investor testimonials"}
      className="relative overflow-hidden py-10 sm:py-14"
    >
      <Hairline />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {preview ? (
          <div className="mb-12 text-center">
            <SectionEyebrow>Investor testimonials</SectionEyebrow>
            <h2
              id="testimonials-heading"
              className="mt-3 text-3xl font-bold tracking-tight text-fg sm:text-4xl"
            >
              What our investors say
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[14px] leading-relaxed text-fg-muted">
              Published accounts from verified Monoceros investors.
            </p>
          </div>
        ) : null}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((t) => (
            <TestimonialCard key={t.id} testimonial={t} />
          ))}
        </div>

        {preview && testimonials.length > 3 ? (
          <div className="mt-10 text-center">
            <ButtonLink href="/testimonials" variant="outline">
              See all testimonials
              <ArrowRight className="ml-2 size-4" aria-hidden />
            </ButtonLink>
          </div>
        ) : null}
      </div>
    </section>
  );
}
