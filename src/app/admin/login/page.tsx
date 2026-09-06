import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { LoginForm } from "@/components/auth/forms";
import { LogoMark } from "@/components/brand/logo";
import { GlowOrbs, GridBackdrop } from "@/components/visuals/decor";
import { getSession } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/rbac";

export const metadata: Metadata = {
  title: "Administrator sign in",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [params, session] = await Promise.all([searchParams, getSession().catch(() => null)]);

  if (session && isStaff(session.user.role)) redirect("/admin");

  const next = params.next?.startsWith("/admin") ? params.next : undefined;

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <GridBackdrop />
      <GlowOrbs variant="section" />

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <LogoMark className="size-12" id="admin-login-logo" />
          <p className="mt-4 text-[10px] uppercase tracking-[0.24em] text-gold-400">
            Administration
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-fg">
            Monoceros back office
          </h1>
        </div>

        <div className="surface mt-8 p-6 sm:p-8">
          <LoginForm admin next={next} />
        </div>

        <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-gold-600/25 bg-gold-600/[0.06] p-4">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold-300" aria-hidden />
          <p className="text-[12px] leading-relaxed text-gold-200">
            Administrator sessions are shorter than investor sessions, every sign-in is written to
            the audit log, and repeated failures lock the account temporarily.
          </p>
        </div>

        <p className="mt-6 text-center text-[12.5px] text-fg-subtle">
          Investor?{" "}
          <Link href="/login" className="text-accent-300 hover:underline">
            Sign in here instead
          </Link>
        </p>
      </div>
    </div>
  );
}
