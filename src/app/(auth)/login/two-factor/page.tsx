import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { AuthCard } from "@/components/auth/auth-card";
import { TwoFactorChallengeForm } from "@/components/auth/two-factor-challenge-form";
import { TWO_FACTOR_COOKIE } from "@/server/services/accounts";

export const metadata: Metadata = {
  title: "Two-factor verification",
  robots: { index: false, follow: false },
};

export default async function TwoFactorChallengePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; type?: string }>;
}) {
  const cookieStore = await cookies();
  const hasChallengeToken = Boolean(cookieStore.get(TWO_FACTOR_COOKIE)?.value);

  // No valid challenge cookie → send back to login
  if (!hasChallengeToken) redirect("/login");

  const params = await searchParams;
  const next = params.next ?? "";

  return (
    <AuthCard
      title="Two-factor verification"
      description="Enter the 6-digit code from your authenticator app to continue."
    >
      <TwoFactorChallengeForm next={next} />
    </AuthCard>
  );
}
