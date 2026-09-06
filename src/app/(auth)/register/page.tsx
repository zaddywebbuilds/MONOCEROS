import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { getSession } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/rbac";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Open a Monoceros investor account.",
  robots: { index: false, follow: false },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ package?: string }>;
}) {
  const [params, session] = await Promise.all([searchParams, getSession().catch(() => null)]);

  if (session) redirect(isStaff(session.user.role) ? "/admin" : "/dashboard");

  return (
    <AuthCard
      title="Create your account"
      description={
        <>
          Accounts are for residents of Nigeria. After registering you will confirm your email
          address, then complete identity verification before subscribing to a package.
        </>
      }
    >
      <RegisterForm packageSlug={params.package} />
    </AuthCard>
  );
}
