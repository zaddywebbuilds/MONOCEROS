import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Cpu,
  FileSpreadsheet,
  Headphones,
  Mail,
  MessageCircle,
  Repeat,
  ShieldCheck,
  Ticket,
} from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { Accordion } from "@/components/ui/interactive";
import { EmptyState } from "@/components/ui/feedback";
import { SectionEyebrow, Hairline, NetworkNodes } from "@/components/visuals/decor";
import { AiInfrastructureVisual, BrandVisual } from "@/components/visuals/illustrations";
import type { PublicFaq } from "@/server/queries/public";
import type { SettingsMap } from "@/lib/settings";

// ---------------------------------------------------------------------------
// Why Monoceros
// ---------------------------------------------------------------------------

const BENEFITS = [
  {
    icon: Cpu,
    title: "Automated Market Execution",
    body: "Trading is carried out by an externally operated automated system across supported markets. This platform records and administers your subscription.",
  },
  {
    icon: Repeat,
    title: "Structured Investment Cycles",
    body: "Every subscription joins a defined weekly cycle and runs for a fixed term, so you always know when your investment starts and ends.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Account Management",
    body: "Identity-verified accounts, hashed credentials, session controls and private document storage protect your account.",
  },
  {
    icon: FileSpreadsheet,
    title: "Transparent Subscription Tracking",
    body: "Payment status, investment status, start date, maturity date and remaining time are all visible from one dashboard.",
  },
  {
    icon: Ticket,
    title: "Digital Investment Records",
    body: "Every subscription, payment, withdrawal and rollover carries a unique reference and a full transaction history.",
  },
  {
    icon: Headphones,
    title: "Dedicated Support",
    body: "Raise a support ticket from your dashboard, or reach the team on WhatsApp and email during support hours.",
  },
];

export function WhyMonoceros() {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <SectionEyebrow>Why Monoceros</SectionEyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            Built for clarity
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-fg-muted">
            Every package states its capital, return and term up front, and your dashboard shows
            exactly where your subscription stands at any moment. No performance counters, no
            invented figures — just the terms you agreed to and the record of what has happened.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <article key={benefit.title} className="surface group p-6">
              <span className="grid size-10 place-items-center rounded-lg border border-ink-600 bg-ink-850 text-accent-300 transition-colors group-hover:border-accent-700">
                <benefit.icon className="size-4.5" aria-hidden />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-fg">{benefit.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">{benefit.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// AI infrastructure explainer
// ---------------------------------------------------------------------------

export function InfrastructureSection() {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-14">
          <div>
            <SectionEyebrow>Infrastructure</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
              How Monoceros works with our trading infrastructure
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-fg-muted">
              Monoceros provides the investor-facing account and subscription experience, while
              automated market execution is handled through our separate trading infrastructure.
              Keeping the two apart means your records, terms and settlement history stay intact
              and independently auditable.
            </p>

            <dl className="mt-7 grid gap-4 sm:grid-cols-2">
              <div className="surface-muted p-4">
                <dt className="text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
                  Trading infrastructure
                </dt>
                <dd className="mt-2 text-[13px] leading-relaxed text-fg-muted">
                  Market analysis and automated execution across supported markets.
                </dd>
              </div>
              <div className="surface-muted p-4">
                <dt className="text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
                  This platform
                </dt>
                <dd className="mt-2 text-[13px] leading-relaxed text-fg-muted">
                  Accounts, verification, subscriptions, payments, cycles, maturity, withdrawals
                  and rollovers.
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex items-center gap-4">
              <NetworkNodes className="h-20 w-28 shrink-0 opacity-80" />
              <p className="text-[12.5px] leading-relaxed text-fg-subtle">
                Your investment terms are set by the package you choose, so they stay fixed for the
                full term regardless of day-to-day market movement.
              </p>
            </div>
          </div>

          <AiInfrastructureVisual />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Support
// ---------------------------------------------------------------------------

function whatsappHref(number: string) {
  return `https://wa.me/${number.replace(/[^\d]/g, "")}`;
}

export function SupportSection({ settings }: { settings: SettingsMap }) {
  const whatsapp = settings["support.whatsapp"];
  const email = settings["support.email"];

  return (
    <section id="support" className="relative py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="surface relative overflow-hidden p-6 sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-accent-500/[0.08] blur-3xl"
          />
          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <SectionEyebrow>Support</SectionEyebrow>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
                Talk to a person when you need to
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-fg-muted">
                Raise a ticket from inside your dashboard for anything account-specific, or reach us
                directly. {settings["support.hours"]}
              </p>
            </div>

            <div className="grid gap-3">
              {whatsapp ? (
                <a
                  href={whatsappHref(whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-4 rounded-xl border border-ink-600 bg-ink-850/70 p-4 transition-colors hover:border-accent-700"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-lg border border-ink-600 bg-ink-800 text-accent-300">
                      <MessageCircle className="size-4" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-[13.5px] font-medium text-fg">
                        WhatsApp support
                      </span>
                      <span className="block text-[12px] text-fg-subtle">{whatsapp}</span>
                    </span>
                  </span>
                  <ArrowRight className="size-4 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
                </a>
              ) : null}

              {email ? (
                <a
                  href={`mailto:${email}`}
                  className="group flex items-center justify-between gap-4 rounded-xl border border-ink-600 bg-ink-850/70 p-4 transition-colors hover:border-accent-700"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-lg border border-ink-600 bg-ink-800 text-accent-300">
                      <Mail className="size-4" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-[13.5px] font-medium text-fg">Email support</span>
                      <span className="block break-all text-[12px] text-fg-subtle">{email}</span>
                    </span>
                  </span>
                  <ArrowRight className="size-4 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
                </a>
              ) : null}

              <Link
                href="/dashboard/support/new"
                className="group flex items-center justify-between gap-4 rounded-xl border border-ink-600 bg-ink-850/70 p-4 transition-colors hover:border-accent-700"
              >
                <span className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg border border-ink-600 bg-ink-800 text-accent-300">
                    <Ticket className="size-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-[13.5px] font-medium text-fg">
                      Open a support ticket
                    </span>
                    <span className="block text-[12px] text-fg-subtle">
                      Tracked, with a written history
                    </span>
                  </span>
                </span>
                <ArrowRight className="size-4 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export function FaqSection({
  faqs,
  limit,
  showAllLink,
}: {
  faqs: PublicFaq[];
  limit?: number;
  showAllLink?: boolean;
}) {
  const items = limit ? faqs.slice(0, limit) : faqs;

  return (
    <section id="faq" className="relative py-16 sm:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <SectionEyebrow>Questions</SectionEyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        {items.length === 0 ? (
          <EmptyState
            className="mt-10"
            title="No questions published yet"
            description="An administrator can publish FAQ entries from the admin dashboard."
          />
        ) : (
          <Accordion
            className="mt-10"
            items={items.map((faq) => ({
              id: faq.id,
              question: faq.question,
              answer: faq.answer,
            }))}
          />
        )}

        {showAllLink && faqs.length > (limit ?? 0) ? (
          <div className="mt-8 text-center">
            <ButtonLink href="/faq" variant="secondary" size="sm">
              See all questions
              <ArrowRight />
            </ButtonLink>
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// About preview
// ---------------------------------------------------------------------------

export function AboutPreview({ settings }: { settings: SettingsMap }) {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <Hairline className="mb-14" />
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-14">
          <BrandVisual />
          <div>
            <SectionEyebrow>About</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
              {settings["company.name"]}
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-fg-muted">
              {settings["company.description"]}
            </p>
            <p className="mt-4 text-[14px] leading-relaxed text-fg-muted">
              Monoceros is the constellation of the unicorn — faint, but mapped. That is the idea
              behind the name: bringing structure and record-keeping to something investors usually
              cannot see directly.
            </p>
            <ButtonLink href="/about" variant="secondary" className="mt-7">
              Learn More
              <ArrowRight />
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
