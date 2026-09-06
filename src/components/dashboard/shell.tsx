"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, MoreHorizontal, X } from "lucide-react";

import { cn, initialsOf } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { StatusPill } from "@/components/ui/badge";
import { KYC_STATUS_LABEL, KYC_STATUS_TONE } from "@/lib/domain/investment-status";
import { DASHBOARD_NAV, DASHBOARD_NAV_FLAT, type NavItem } from "@/components/dashboard/nav-config";
import { logoutAction } from "@/server/actions/auth";
import type { SessionUser } from "@/lib/auth/session";

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function badgeCount(
  item: NavItem,
  counts: { notifications: number; kyc: number },
): number | undefined {
  if (!item.badge) return undefined;
  const value = counts[item.badge];
  return value > 0 ? value : undefined;
}

function NavLink({
  item,
  active,
  count,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  count?: number;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-all",
        active
          ? "bg-accent-900/40 text-accent-200 shadow-[inset_2px_0_0_0_var(--color-accent-500)]"
          : "text-fg-muted hover:bg-ink-800/60 hover:text-fg",
      )}
    >
      <item.icon
        className={cn("size-4 shrink-0", active ? "text-accent-400" : "text-fg-subtle")}
        aria-hidden
      />
      <span className="flex-1 truncate">{item.label}</span>
      {count ? (
        <span className="grid min-w-5 place-items-center rounded-full bg-accent-500 px-1.5 text-[10.5px] font-semibold text-ink-950">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

export function DashboardShell({
  user,
  counts,
  children,
}: {
  user: SessionUser;
  counts: { notifications: number; kyc: number };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => setMobileOpen(false), [pathname]);

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <Link href="/" aria-label="Monoceros home">
          <Logo size="sm" />
        </Link>
      </div>

      <nav aria-label="Dashboard" className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {DASHBOARD_NAV.map((group) => (
          <div key={group.section}>
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
              {group.section}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    active={isActive(pathname, item.href)}
                    count={badgeCount(item, counts)}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-ink-700/70 p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full border border-ink-600 bg-ink-800 text-[12px] font-semibold text-accent-300">
            {initialsOf(user.firstName, user.surname)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-fg">
              {user.fullName || user.email}
            </p>
            <p className="truncate text-[11px] text-fg-subtle">{user.reference}</p>
          </div>
        </div>
        <div className="px-3 pb-2">
          <StatusPill tone={KYC_STATUS_TONE[user.kycStatus]}>
            {KYC_STATUS_LABEL[user.kycStatus]}
          </StatusPill>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-fg-muted transition-colors hover:bg-ink-800/60 hover:text-status-rejected"
          >
            <LogOut className="size-4 shrink-0 text-fg-subtle" aria-hidden />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  const primaryItems = DASHBOARD_NAV_FLAT.filter((item) => item.primary).slice(0, 4);

  return (
    <div className="flex min-h-dvh bg-ink-950">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-ink-700/70 bg-ink-900/50 lg:block">
        {sidebar()}
      </aside>

      {/* Mobile drawer */}
      <div
        hidden={!mobileOpen}
        className="fixed inset-0 z-50 lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Dashboard menu"
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
        />
        <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-rise border-r border-ink-700 bg-ink-900">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="absolute right-3 top-5 rounded-lg p-1.5 text-fg-subtle hover:text-fg"
          >
            <X className="size-4" />
          </button>
          {sidebar(() => setMobileOpen(false))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-ink-700/70 bg-ink-900/80 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="grid size-9 place-items-center rounded-lg border border-ink-600 text-fg-muted"
          >
            <Menu className="size-4" />
          </button>
          <Link href="/dashboard" aria-label="Dashboard">
            <Logo size="sm" showWordmark={false} />
          </Link>
          <Link
            href="/dashboard/notifications"
            aria-label={`Notifications${counts.notifications ? `, ${counts.notifications} unread` : ""}`}
            className="relative grid size-9 place-items-center rounded-lg border border-ink-600 text-fg-muted"
          >
            <Bell />
            {counts.notifications > 0 ? (
              <span className="absolute -right-1 -top-1 grid min-w-4.5 place-items-center rounded-full bg-accent-500 px-1 text-[10px] font-semibold text-ink-950">
                {counts.notifications > 9 ? "9+" : counts.notifications}
              </span>
            ) : null}
          </Link>
        </header>

        <main id="main" className="min-w-0 flex-1 pb-20 lg:pb-0">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-ink-700/70 bg-ink-900/95 backdrop-blur lg:hidden"
        >
          {primaryItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition-colors",
                  active ? "text-accent-300" : "text-fg-subtle",
                )}
              >
                <item.icon className="size-4.5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium text-fg-subtle"
          >
            <MoreHorizontal className="size-4.5" aria-hidden />
            More
          </button>
        </nav>
      </div>
    </div>
  );
}

function Bell({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("size-4", className)}
    >
      <path d="M10.268 21a2 2 0 0 0 3.464 0" />
      <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
    </svg>
  );
}
