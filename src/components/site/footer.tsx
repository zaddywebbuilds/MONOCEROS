import * as React from "react";
import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import type { SettingsMap } from "@/lib/settings";

const NAVIGATION = [
  { href: "/", label: "Home" },
  { href: "/packages", label: "Packages" },
  { href: "/markets", label: "Markets" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/about", label: "About" },
];

const SUPPORT = [
  { href: "/faq", label: "FAQ" },
  { href: "/support", label: "Support" },
  { href: "/contact", label: "Contact" },
  { href: "/login", label: "Login" },
  { href: "/register", label: "Create Account" },
];

const LEGAL = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/risk-disclosure", label: "Risk Disclosure" },
  { href: "/aml-kyc", label: "AML/KYC Policy" },
];

function whatsappHref(number: string) {
  return `https://wa.me/${number.replace(/[^\d]/g, "")}`;
}

export function SiteFooter({ settings }: { settings: SettingsMap }) {
  const year = new Date().getFullYear();
  const socials = [
    { href: settings["social.x"], label: "X" },
    { href: settings["social.facebook"], label: "Facebook" },
    { href: settings["social.instagram"], label: "Instagram" },
    { href: settings["social.linkedin"], label: "LinkedIn" },
    { href: settings["social.telegram"], label: "Telegram" },
  ].filter((social) => Boolean(social.href));

  return (
    <footer className="relative mt-24 border-t border-ink-700/70 bg-ink-900/60">
      <div aria-hidden className="hairline absolute inset-x-0 top-0" />

      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-fg-muted">
              {settings["company.description"]}
            </p>
            {socials.length > 0 ? (
              <ul className="mt-5 flex flex-wrap gap-2">
                {socials.map((social) => (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-lg border border-ink-600 px-3 py-1.5 text-xs text-fg-muted transition-colors hover:border-accent-700 hover:text-accent-300"
                    >
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <nav aria-label="Footer navigation">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
              Navigate
            </h2>
            <ul className="mt-4 space-y-2.5">
              {NAVIGATION.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[13.5px] text-fg-muted transition-colors hover:text-fg"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Support links">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
              Support
            </h2>
            <ul className="mt-4 space-y-2.5">
              {SUPPORT.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[13.5px] text-fg-muted transition-colors hover:text-fg"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
              Contact
            </h2>
            <ul className="mt-4 space-y-3 text-[13.5px] text-fg-muted">
              {settings["support.email"] ? (
                <li className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
                  <a
                    href={`mailto:${settings["support.email"]}`}
                    className="break-all transition-colors hover:text-fg"
                  >
                    {settings["support.email"]}
                  </a>
                </li>
              ) : null}
              {settings["support.whatsapp"] ? (
                <li className="flex items-start gap-2.5">
                  <MessageCircle className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
                  <a
                    href={whatsappHref(settings["support.whatsapp"])}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-fg"
                  >
                    WhatsApp support
                  </a>
                </li>
              ) : null}
              {settings["support.phone"] ? (
                <li className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
                  <span>{settings["support.phone"]}</span>
                </li>
              ) : null}
              {settings["company.address"] ? (
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
                  <span>{settings["company.address"]}</span>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="mt-12 rounded-xl border border-ink-700/70 bg-ink-880/50 p-4">
          <p className="text-[12px] leading-relaxed text-fg-subtle">
            <strong className="font-semibold text-fg-muted">Risk notice.</strong> Investing carries
            risk, including the risk of losing capital. Maturity values shown on this platform are
            determined by the subscribed package and are not a forecast of external market
            performance. Nothing on this website is investment advice. Read the{" "}
            <Link href="/risk-disclosure" className="text-accent-300 underline underline-offset-2">
              Risk Disclosure
            </Link>{" "}
            before subscribing.
          </p>
          {settings["company.regulatoryNotice"] ? (
            <p className="mt-2 text-[12px] leading-relaxed text-fg-subtle">
              {settings["company.regulatoryNotice"]}
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-ink-700/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-fg-subtle">
            © {year} {settings["company.legalName"] || settings["company.name"]}
            {settings["company.registrationNumber"]
              ? ` · RC ${settings["company.registrationNumber"]}`
              : ""}
            . All rights reserved.
          </p>
          <nav aria-label="Legal">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {LEGAL.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-xs text-fg-subtle transition-colors hover:text-fg-muted"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
