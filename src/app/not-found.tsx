import Link from "next/link";
import type { Metadata } from "next";

import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { GlowOrbs, GridBackdrop } from "@/components/visuals/decor";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

const SUGGESTIONS = [
  { href: "/", label: "Home" },
  { href: "/packages", label: "Investment packages" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/support", label: "Support" },
];

export default function NotFound() {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4">
      <GridBackdrop />
      <GlowOrbs variant="section" />

      <div className="relative w-full max-w-md text-center">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>

        <p className="mt-10 text-[64px] font-semibold leading-none tracking-tight text-gradient">
          404
        </p>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-fg">Page not found</h1>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          The page you are looking for does not exist, or has moved.
        </p>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <ButtonLink href="/">Back to home</ButtonLink>
          <ButtonLink href="/support" variant="secondary">
            Contact support
          </ButtonLink>
        </div>

        <nav aria-label="Suggested pages" className="mt-10">
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {SUGGESTIONS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-[12.5px] text-fg-subtle transition-colors hover:text-accent-300"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
