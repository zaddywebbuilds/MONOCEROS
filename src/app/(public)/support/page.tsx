import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, LifeBuoy, MessageSquare, ShieldAlert } from "lucide-react";

import { PageHeader } from "@/components/marketing/prose";
import { SupportSection, FaqSection } from "@/components/marketing/sections";
import { Card } from "@/components/ui/card";
import { getPublicSettings } from "@/lib/settings";
import { getPublicFaqs } from "@/server/queries/public";
import { appUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Get help with your Monoceros account: support tickets, WhatsApp, email, and answers to common questions.",
  alternates: { canonical: `${appUrl}/support` },
};

const CHANNELS = [
  {
    icon: MessageSquare,
    title: "Support tickets",
    body: "Sign in and open a ticket for anything about your account, a payment, or a withdrawal. Every reply is recorded against the ticket.",
    href: "/dashboard/support/new",
    cta: "Open a ticket",
  },
  {
    icon: BookOpen,
    title: "Answers to common questions",
    body: "Packages, weekly cycles, payment verification, maturity, withdrawals and rollovers are all covered in the FAQ.",
    href: "/faq",
    cta: "Read the FAQ",
  },
  {
    icon: LifeBuoy,
    title: "General enquiries",
    body: "Not an account holder yet, or asking something general? Use the contact form and we will reply by email.",
    href: "/contact",
    cta: "Contact us",
  },
];

export default async function SupportPage() {
  const [settings, faqs] = await Promise.all([getPublicSettings(), getPublicFaqs()]);

  return (
    <>
      <PageHeader
        eyebrow="Help"
        title="Support"
        description="Choose the channel that fits. For anything involving money or your identity, use a support ticket so there is a written record."
      />

      <section className="py-12 sm:py-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {CHANNELS.map((channel) => (
              <Card key={channel.title} interactive className="flex flex-col p-6">
                <span className="grid size-10 place-items-center rounded-lg border border-ink-600 bg-ink-850 text-accent-300">
                  <channel.icon className="size-4.5" aria-hidden />
                </span>
                <h2 className="mt-4 text-[15px] font-semibold text-fg">{channel.title}</h2>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-fg-muted">
                  {channel.body}
                </p>
                <Link
                  href={channel.href}
                  className="mt-4 text-[13px] font-medium text-accent-300 hover:underline"
                >
                  {channel.cta} →
                </Link>
              </Card>
            ))}
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-xl border border-status-pending/25 bg-status-pending/[0.06] p-4">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-status-pending" aria-hidden />
            <p className="text-[13px] leading-relaxed text-status-pending">
              <strong className="font-semibold">Security notice.</strong> We will never ask for your
              password, a verification code, or a wallet recovery phrase — not by email, not on
              WhatsApp, not on a call. Payment details are shown only inside your signed-in
              dashboard.
            </p>
          </div>
        </div>
      </section>

      <SupportSection settings={settings} />
      <FaqSection faqs={faqs} limit={8} showAllLink />
    </>
  );
}
