import * as React from "react";

import { cn } from "@/lib/utils";
import { GridBackdrop } from "@/components/visuals/decor";

/** Page header used by every secondary public page. */
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="relative overflow-hidden border-b border-ink-700/60 py-10 sm:py-12 lg:py-14">
      <GridBackdrop />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 size-[420px] -translate-x-1/2 rounded-full bg-accent-600/[0.07] blur-[110px]"
      />
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent-300">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-fg sm:text-4xl lg:text-[2.75rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-fg-muted">{description}</p>
        ) : null}
        {children}
      </div>
    </header>
  );
}

/**
 * Long-form document renderer.
 *
 * Content is stored as plain text with simple conventions (## heading, - list
 * item, blank line between paragraphs) so administrators can edit it safely
 * from the admin dashboard without any HTML being injected into the page.
 */
export function DocumentBody({ body, className }: { body: string; className?: string }) {
  const blocks = body.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return (
    <div className={cn("space-y-5", className)}>
      {blocks.map((block, index) => {
        if (block.startsWith("### ")) {
          return (
            <h3
              key={index}
              className="pt-3 text-[15px] font-semibold tracking-tight text-fg"
            >
              {block.slice(4)}
            </h3>
          );
        }

        if (block.startsWith("## ")) {
          return (
            <h2
              key={index}
              className="pt-5 text-xl font-semibold tracking-tight text-fg first:pt-0"
            >
              {block.slice(3)}
            </h2>
          );
        }

        if (block.split("\n").every((line) => line.trim().startsWith("- "))) {
          return (
            <ul key={index} className="space-y-2">
              {block.split("\n").map((line, lineIndex) => (
                <li
                  key={lineIndex}
                  className="flex items-start gap-2.5 text-[14px] leading-relaxed text-fg-muted"
                >
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-500" />
                  {line.trim().slice(2)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className="text-[14px] leading-relaxed text-fg-muted">
            {block}
          </p>
        );
      })}
    </div>
  );
}

export function DocumentLayout({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[1fr_18rem] lg:gap-14">
        <div className="min-w-0 max-w-3xl">{children}</div>
        {aside ? <aside className="lg:sticky lg:top-24 lg:self-start">{aside}</aside> : null}
      </div>
    </div>
  );
}
