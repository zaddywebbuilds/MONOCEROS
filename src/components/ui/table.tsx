import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Tables scroll horizontally inside their own container so the page body never
 * overflows. On small screens the dashboard uses `MobileCardList` instead.
 */
export function TableScroll({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-xl border border-ink-700/70 bg-ink-880/50",
        className,
      )}
      {...props}
    />
  );
}

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn("w-full min-w-[640px] border-collapse text-sm", className)} {...props} />
  );
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-ink-850/80", className)} {...props} />;
}

export function TH({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap border-b border-ink-700/70 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle",
        className,
      )}
      {...props}
    />
  );
}

export function TBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-ink-700/50", className)} {...props} />;
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition-colors hover:bg-ink-800/40", className)} {...props} />;
}

export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3.5 align-middle text-fg-muted", className)} {...props} />;
}

export function TableEmpty({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-fg-muted">
        {children}
      </td>
    </tr>
  );
}

/** Mobile-first alternative to a data table. */
export function MobileCardList({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("space-y-3", className)} {...props} />;
}

export function MobileCard({
  title,
  subtitle,
  right,
  rows,
  footer,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  rows: { label: string; value: React.ReactNode }[];
  footer?: React.ReactNode;
}) {
  return (
    <li className="surface-muted p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-fg">{title}</p>
          {subtitle ? <p className="mt-0.5 text-xs text-fg-subtle">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-[10px] uppercase tracking-[0.12em] text-fg-subtle">{row.label}</dt>
            <dd className="mt-0.5 truncate text-[13px] text-fg">{row.value}</dd>
          </div>
        ))}
      </dl>
      {footer ? <div className="mt-3 border-t border-ink-700/60 pt-3">{footer}</div> : null}
    </li>
  );
}
