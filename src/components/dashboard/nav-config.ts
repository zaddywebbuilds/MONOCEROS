import {
  ArrowDownToLine,
  BadgeCheck,
  Bell,
  CircleUser,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  Receipt,
  Repeat,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Shown in the mobile bottom bar. */
  primary?: boolean;
  /** Key used to attach a live badge count. */
  badge?: "notifications" | "kyc";
}

export const DASHBOARD_NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Investing",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard, primary: true },
      { href: "/dashboard/investments", label: "Investments", icon: TrendingUp, primary: true },
      { href: "/dashboard/packages", label: "Packages", icon: LayoutGrid, primary: true },
    ],
  },
  {
    section: "Money",
    items: [
      { href: "/dashboard/payments", label: "Payments", icon: Wallet, primary: true },
      { href: "/dashboard/withdrawals", label: "Withdrawals", icon: ArrowDownToLine },
      { href: "/dashboard/rollovers", label: "Rollovers", icon: Repeat },
      { href: "/dashboard/transactions", label: "Transactions", icon: Receipt },
    ],
  },
  {
    section: "Account",
    items: [
      { href: "/dashboard/verification", label: "Verification", icon: BadgeCheck, badge: "kyc" },
      {
        href: "/dashboard/notifications",
        label: "Notifications",
        icon: Bell,
        badge: "notifications",
      },
      { href: "/dashboard/support", label: "Support", icon: LifeBuoy },
      { href: "/dashboard/profile", label: "Profile", icon: CircleUser },
      { href: "/dashboard/security", label: "Security", icon: ShieldCheck },
    ],
  },
];

export const DASHBOARD_NAV_FLAT = DASHBOARD_NAV.flatMap((group) => group.items);
