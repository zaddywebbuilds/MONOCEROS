"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarRange,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Menu,
  Receipt,
  Repeat,
  ScrollText,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { cn, initialsOf } from "@/lib/utils";
import { LogoMark } from "@/components/brand/logo";
import { logoutAction } from "@/server/actions/auth";
import type { SessionUser } from "@/lib/auth/session";

export interface AdminCounts {
  kyc: number;
  payments: number;
  withdrawals: number;
  tickets: number;
}

const NAV: { section: string; items: { href: string; label: string; icon: typeof Users; badge?: keyof AdminCounts }[] }[] =
  [
    {
      section: "Operations",
      items: [
        { href: "/admin", label: "Overview", icon: LayoutDashboard },
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/kyc", label: "KYC", icon: ShieldCheck, badge: "kyc" },
        { href: "/admin/payments", label: "Payments", icon: Wallet, badge: "payments" },
        { href: "/admin/investments", label: "Investments", icon: TrendingUp },
        { href: "/admin/cycles", label: "Investment cycles", icon: CalendarRange },
        {
          href: "/admin/withdrawals",
          label: "Withdrawals",
          icon: ClipboardList,
          badge: "withdrawals",
        },
        { href: "/admin/rollovers", label: "Rollovers", icon: Repeat },
        { href: "/admin/transactions", label: "Transactions", icon: Receipt },
      ],
    },
    {
      section: "Configuration",
      items: [
        { href: "/admin/packages", label: "Packages", icon: LayoutGrid },
        { href: "/admin/support", label: "Support", icon: LifeBuoy, badge: "tickets" },
        { href: "/admin/notifications", label: "Notifications", icon: Bell },
        { href: "/admin/faq", label: "FAQ", icon: FileText },
        { href: "/admin/content", label: "Website content", icon: FileText },
        { href: "/admin/settings", label: "Settings", icon: Settings },
        { href: "/admin/audit", label: "Audit log", icon: ScrollText },
      ],
    },
  ];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({
  user,
  counts,
  children,
}: {
  user: SessionUser;
  counts: AdminCounts;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => setOpen(false), [pathname]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 border-b border-ink-700/70 px-4 py-4">
        <LogoMark className="size-8" id="admin-logo" />
        <div className="leading-none">
          <p className="text-[14px] font-semibold tracking-tight text-fg">Monoceros</p>
          <p className="mt-1 text-[9.5px] uppercase tracking-[0.2em] text-gold-400">
            Administration
          </p>
        </div>
      </div>

      <nav aria-label="Admin" className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {NAV.map((group) => (
          <div key={group.section}>
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
              {group.section}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const count = item.badge ? counts[item.badge] : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all",
                        active
                          ? "bg-gold-600/15 text-gold-200 shadow-[inset_2px_0_0_0_var(--color-gold-400)]"
                          : "text-fg-muted hover:bg-ink-800/60 hover:text-fg",
                      )}
                    >
                      <item.icon
                        className={cn("size-4 shrink-0", active ? "text-gold-300" : "text-fg-subtle")}
                        aria-hidden
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {count > 0 ? (
                        <span className="grid min-w-5 place-items-center rounded-full bg-status-pending px-1.5 text-[10.5px] font-semibold text-ink-950">
                          {count > 99 ? "99+" : count}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-ink-700/70 p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full border border-gold-600/40 bg-gold-600/10 text-[12px] font-semibold text-gold-300">
            {initialsOf(user.firstName || user.email, user.surname)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium text-fg">
              {user.fullName || user.email}
            </p>
            <p className="truncate text-[10.5px] uppercase tracking-wider text-gold-400">
              {user.role.replace(/_/g, " ")}
            </p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-fg-muted transition-colors hover:bg-ink-800/60 hover:text-fg"
        >
          <LayoutDashboard className="size-4 shrink-0 text-fg-subtle" aria-hidden />
          Investor view
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-fg-muted transition-colors hover:bg-ink-800/60 hover:text-status-rejected"
          >
            <LogOut className="size-4 shrink-0 text-fg-subtle" aria-hidden />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-ink-950">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-ink-700/70 bg-ink-900/60 xl:block">
        {sidebar}
      </aside>

      <div
        hidden={!open}
        className="fixed inset-0 z-50 xl:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Admin menu"
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
        />
        <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-ink-700 bg-ink-900">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute right-3 top-4 rounded-lg p-1.5 text-fg-subtle hover:text-fg"
          >
            <X className="size-4" />
          </button>
          {sidebar}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ink-700/70 bg-ink-900/85 px-4 backdrop-blur xl:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="grid size-9 place-items-center rounded-lg border border-ink-600 text-fg-muted"
          >
            <Menu className="size-4" />
          </button>
          <p className="text-[13px] font-semibold text-fg">Monoceros Administration</p>
        </header>

        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
