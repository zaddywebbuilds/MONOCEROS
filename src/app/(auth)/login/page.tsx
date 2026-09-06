import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/forms";
import { getSession } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/rbac";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Monoceros investor dashboard.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const [params, session] = await Promise.all([searchParams, getSession().catch(() => null)]);

  if (session) redirect(isStaff(session.user.role) ? "/admin" : "/dashboard");

  const next =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : undefined;

  return (
    <AuthCard
      title="Sign in"
      description="Access your investments, payments and account settings."
    >
      <LoginForm
        next={next}
        notice={
          params.reset
            ? "Your password has been updated. Sign in with your new password."
            : undefined
        }
      />
    </AuthCard>
  );
}
