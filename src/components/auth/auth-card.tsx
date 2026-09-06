import * as React from "react";

import { cn } from "@/lib/utils";

export function AuthCard({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface relative animate-rise overflow-hidden", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-500/60 to-transparent"
      />
      <div className="p-6 sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">{title}</h1>
        {description ? (
          <div className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">{description}</div>
        ) : null}
        <div className="mt-6">{children}</div>
      </div>
      {footer ? (
        <div className="border-t border-ink-700/70 bg-ink-900/40 px-6 py-4 sm:px-8">{footer}</div>
      ) : null}
    </div>
  );
}
