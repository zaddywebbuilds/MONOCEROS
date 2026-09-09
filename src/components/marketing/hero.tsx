import * as React from "react";
import { ArrowRight, ShieldCheck, Clock3, FileText } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { HeroVideo } from "@/components/visuals/hero-video";
import { GlowOrbs, GridBackdrop, Particles } from "@/components/visuals/decor";
import type { SettingsMap } from "@/lib/settings";

const ASSURANCES = [
  { icon: ShieldCheck, label: "Identity-verified accounts" },
  { icon: Clock3, label: "Weekly investment cycles" },
  { icon: FileText, label: "Full digital records" },
];

export function Hero({ settings }: { settings: SettingsMap }) {
  return (
    <section className="relative overflow-hidden pb-10 pt-10 sm:pb-12 sm:pt-12 lg:pb-16 lg:pt-14">
      <GridBackdrop />
      <GlowOrbs />
      <Particles className="opacity-70" />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-8">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-600 bg-ink-880/70 px-3.5 py-1.5 text-[11.5px] font-medium tracking-wide text-fg-muted">
            <span aria-hidden className="size-1.5 rounded-full bg-accent-400 animate-shimmer" />
            Investment subscription management
          </span>

          <h1 className="mt-6 text-[2.1rem] font-semibold leading-[1.08] tracking-tight text-fg sm:text-5xl lg:text-[3.4rem]">
            {settings["content.heroHeadline"]}
            <span className="mt-1.5 block text-gradient">
              {settings["content.heroHeadlineAccent"]}
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-fg-muted sm:text-base">
            {settings["content.heroSubheadline"]}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/packages" size="lg" className="group">
              View Investment Packages
              <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </ButtonLink>
            <ButtonLink href="/register" variant="secondary" size="lg">
              Create Account
            </ButtonLink>
          </div>

          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-3">
            {ASSURANCES.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-[13px] text-fg-muted">
                <item.icon className="size-4 text-accent-400" aria-hidden />
                {item.label}
              </li>
            ))}
          </ul>

          <p className="mt-8 max-w-lg rounded-xl border border-ink-700/70 bg-ink-880/40 px-4 py-3 text-[12.5px] leading-relaxed text-fg-subtle">
            Trading is carried out by an externally operated automated system. This platform manages
            your subscription, payment, investment cycle and maturity records. Capital is at risk.
          </p>
        </div>

        <div className="relative animate-rise" style={{ animationDelay: "120ms" }}>
          <div
            aria-hidden
            className="absolute -inset-6 rounded-[2rem] bg-accent-500/[0.05] blur-3xl"
          />
          {/* The footage is portrait, so it is cropped to a panel rather than
              stretched — short on phones, taller alongside the copy on desktop. */}
          <div className="surface relative aspect-[16/10] overflow-hidden lg:aspect-[4/5]">
            <HeroVideo />
            {/* Sinks the bottom edge into the page instead of ending on a line. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/10 to-transparent"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-ink-600/50"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
