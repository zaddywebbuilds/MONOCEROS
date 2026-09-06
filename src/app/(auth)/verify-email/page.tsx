import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MailWarning } from "lucide-react";

import { AuthCard } from "@/components/auth/auth-card";
import { ButtonLink } from "@/components/ui/button";
import { ResendVerificationButton } from "@/components/auth/resend-verification";
import { verifyEmailToken } from "@/server/services/accounts";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Confirm your email address",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ token }, session] = await Promise.all([searchParams, getSession().catch(() => null)]);

  if (token) {
    let error: string | null = null;
    try {
      await verifyEmailToken(token);
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "That link is not valid.";
    }

    if (!error) {
      return (
        <AuthCard
          title="Email confirmed"
          description="Your email address is confirmed. The next step is identity verification."
        >
          <div className="flex flex-col items-center gap-5 text-center">
            <span className="grid size-14 place-items-center rounded-2xl border border-accent-700/50 bg-accent-900/30 text-accent-300">
              <CheckCircle2 className="size-6" aria-hidden />
            </span>
            <ButtonLink href={session ? "/dashboard/verification" : "/login"} block>
              {session ? "Complete identity verification" : "Sign in to continue"}
            </ButtonLink>
          </div>
        </AuthCard>
      );
    }

    return (
      <AuthCard title="This link is no longer valid" description={error}>
        <div className="flex flex-col items-center gap-5 text-center">
          <span className="grid size-14 place-items-center rounded-2xl border border-status-pending/40 bg-status-pending/10 text-status-pending">
            <MailWarning className="size-6" aria-hidden />
          </span>
          {session ? (
            <ResendVerificationButton />
          ) : (
            <ButtonLink href="/login" block>
              Sign in to request a new link
            </ButtonLink>
          )}
        </div>
      </AuthCard>
    );
  }

  if (session?.user.emailVerified) {
    return (
      <AuthCard
        title="Already confirmed"
        description="This email address has already been confirmed."
      >
        <ButtonLink href="/dashboard" block>
          Go to dashboard
        </ButtonLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Confirm your email address"
      description={
        session
          ? `We sent a confirmation link to ${session.user.email}. Open it to activate your account.`
          : "Open the confirmation link we emailed you. If it has expired, sign in and request a new one."
      }
    >
      <div className="space-y-4">
        {session ? (
          <ResendVerificationButton />
        ) : (
          <ButtonLink href="/login" block>
            Sign in
          </ButtonLink>
        )}
        <p className="text-center text-[12px] leading-relaxed text-fg-subtle">
          Wrong address?{" "}
          <Link href="/support" className="text-accent-300 underline underline-offset-2">
            Contact support
          </Link>{" "}
          and we will correct it.
        </p>
      </div>
    </AuthCard>
  );
}
