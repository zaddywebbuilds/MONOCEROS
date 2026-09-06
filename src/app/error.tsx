"use client";

import * as React from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button, ButtonLink } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[boundary]", error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>

        <div className="surface mt-10 p-8">
          <span className="mx-auto grid size-12 place-items-center rounded-xl border border-status-rejected/30 bg-status-rejected/10 text-status-rejected">
            <TriangleAlert className="size-5" aria-hidden />
          </span>
          <h1 className="mt-5 text-lg font-semibold tracking-tight text-fg">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            We hit an unexpected error loading this page. Your account, investments and maturity
            dates are unaffected — nothing here changes stored records.
          </p>
          {error.digest ? (
            <p className="mt-4 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 font-mono text-[11px] text-fg-subtle">
              Reference: {error.digest}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={reset}>
              <RotateCcw />
              Try again
            </Button>
            <ButtonLink href="/" variant="secondary">
              Back to home
            </ButtonLink>
          </div>
        </div>

        <p className="mt-6 text-[12px] text-fg-subtle">
          If this keeps happening,{" "}
          <Link href="/support" className="text-accent-300 underline underline-offset-2">
            contact support
          </Link>{" "}
          and quote the reference above.
        </p>
      </div>
    </div>
  );
}
