"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/packages", label: "Packages" },
  { href: "/markets", label: "Markets" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/support", label: "Support" },
];

export function SiteHeader({
  isAuthenticated,
  announcement,
}: {
  isAuthenticated: boolean;
  announcement?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {announcement ? (
        <div className="relative z-50 border-b border-accent-800/40 bg-accent-900/30 px-4 py-2 text-center text-[12.5px] text-accent-200">
          {announcement}
        </div>
      ) : null}

      <header
        className={cn(
          "sticky top-0 z-50 border-b transition-all duration-300",
          scrolled
            ? "glass border-ink-700/80 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.9)]"
            : "border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[72px] lg:px-8">
          <Link href="/" aria-label="Monoceros home" className="shrink-0">
            <Logo size="sm" />
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const active =
                  link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
                        active ? "text-fg" : "text-fg-muted hover:text-fg",
                      )}
                    >
                      {link.label}
                      {active ? (
                        <span
                          aria-hidden
                          className="absolute inset-x-3 -bottom-0.5 h-px bg-accent-400"
                        />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {isAuthenticated ? (
              <ButtonLink href="/dashboard" size="sm">
                Go to dashboard
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/login" variant="ghost" size="sm">
                  Login
                </ButtonLink>
                <ButtonLink href="/register" size="sm">
                  Create Account
                </ButtonLink>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-10 place-items-center rounded-lg border border-ink-600 text-fg-muted transition-colors hover:text-fg lg:hidden"
          >
            {open ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        id="mobile-nav"
        hidden={!open}
        className="fixed inset-0 z-40 lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
        />
        <nav
          aria-label="Mobile"
          className="absolute inset-x-0 top-16 mx-3 animate-rise rounded-2xl border border-ink-600 bg-ink-880/95 p-4 shadow-2xl backdrop-blur"
        >
          <ul className="space-y-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-lg px-3 py-3 text-[15px] font-medium text-fg-muted transition-colors hover:bg-ink-800 hover:text-fg"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-2 border-t border-ink-700 pt-4">
            {isAuthenticated ? (
              <ButtonLink href="/dashboard" block>
                Go to dashboard
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/register" block>
                  Create Account
                </ButtonLink>
                <ButtonLink href="/login" variant="secondary" block>
                  Login
                </ButtonLink>
              </>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}
