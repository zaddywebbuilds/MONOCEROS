import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { GlowOrbs, GridBackdrop, Particles } from "@/components/visuals/decor";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <GridBackdrop />
      <GlowOrbs variant="section" />
      <Particles className="opacity-50" />

      <header className="relative z-10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Link href="/" aria-label="Monoceros home">
            <Logo size="sm" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted transition-colors hover:text-fg"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to site
          </Link>
        </div>
      </header>

      <main id="main" className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-lg">{children}</div>
      </main>

      <footer className="relative z-10 px-4 pb-8 pt-4">
        <p className="mx-auto max-w-lg text-center text-[11.5px] leading-relaxed text-fg-subtle">
          Investing carries risk, including loss of capital. Maturity values are determined by the
          subscribed package and are not a forecast of market performance.{" "}
          <Link href="/risk-disclosure" className="underline underline-offset-2 hover:text-fg-muted">
            Risk disclosure
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}
