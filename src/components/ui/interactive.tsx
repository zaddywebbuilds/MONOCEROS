"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Check, ChevronLeft, ChevronRight, Copy, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Submit button wired to the enclosing form's pending state. */
export function SubmitButton({
  children,
  pendingLabel = "Working…",
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? (
        <>
          <span
            aria-hidden
            className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard API unavailable (insecure context) — fall back to selection.
      const area = document.createElement("textarea");
      area.value = value;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-ink-600 bg-ink-800 px-2.5 py-1.5 text-[12px] font-medium text-fg-muted transition-colors hover:border-accent-700 hover:text-accent-300",
        className,
      )}
    >
      {copied ? <Check className="size-3.5 text-accent-400" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}

/** URL-driven search box used across the admin tables. */
export function SearchInput({
  placeholder = "Search…",
  paramName = "q",
  className,
}: {
  placeholder?: string;
  paramName?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = React.useState(searchParams.get(paramName) ?? "");

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(paramName, value);
      else params.delete(paramName);
      params.delete("page");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-lg border border-ink-600 bg-ink-900/70 pl-9 pr-3 text-sm text-fg placeholder:text-fg-subtle focus:border-accent-600 focus:outline-none"
      />
    </div>
  );
}

/** URL-driven filter select. */
export function FilterSelect({
  paramName,
  options,
  label,
  className,
}: {
  paramName: string;
  options: { value: string; label: string }[];
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramName) ?? "";

  return (
    <select
      aria-label={label}
      value={current}
      onChange={(event) => {
        const params = new URLSearchParams(searchParams.toString());
        if (event.target.value) params.set(paramName, event.target.value);
        else params.delete(paramName);
        params.delete("page");
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      }}
      className={cn(
        "h-10 cursor-pointer rounded-lg border border-ink-600 bg-ink-900/70 px-3 pr-8 text-sm text-fg focus:border-accent-600 focus:outline-none",
        className,
      )}
    >
      <option value="">{label}: all</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function Pagination({
  page,
  totalPages,
  className,
}: {
  page: number;
  totalPages: number;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const hrefFor = (target: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(target));
    return `${pathname}?${params.toString()}`;
  };

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-between gap-3 pt-4", className)}
    >
      <p className="text-xs text-fg-subtle">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={hrefFor(page - 1)}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-ink-600 px-3 text-[13px] text-fg-muted transition-colors hover:border-accent-700 hover:text-fg"
          >
            <ChevronLeft className="size-3.5" />
            Previous
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link
            href={hrefFor(page + 1)}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-ink-600 px-3 text-[13px] text-fg-muted transition-colors hover:border-accent-700 hover:text-fg"
          >
            Next
            <ChevronRight className="size-3.5" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

/** Simple accessible disclosure used by the FAQ. */
export function Accordion({
  items,
  className,
}: {
  items: { id: string; question: string; answer: string }[];
  className?: string;
}) {
  const [openId, setOpenId] = React.useState<string | null>(items[0]?.id ?? null);

  return (
    <div className={cn("divide-y divide-ink-700/60 overflow-hidden rounded-xl border border-ink-700/70", className)}>
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id} className="bg-ink-880/40">
            <h3>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`faq-${item.id}`}
                onClick={() => setOpenId(open ? null : item.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-medium text-fg transition-colors hover:bg-ink-800/40"
              >
                {item.question}
                <span
                  aria-hidden
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full border border-ink-600 text-fg-muted transition-transform duration-300",
                    open && "rotate-45 border-accent-700 text-accent-300",
                  )}
                >
                  +
                </span>
              </button>
            </h3>
            <div
              id={`faq-${item.id}`}
              hidden={!open}
              className="px-5 pb-5 text-sm leading-relaxed text-fg-muted"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
