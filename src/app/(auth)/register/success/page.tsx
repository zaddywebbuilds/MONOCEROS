import type { Metadata } from "next";
import { MailCheck } from "lucide-react";

import { AuthCard } from "@/components/auth/auth-card";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Check your email",
  robots: { index: false, follow: false },
};

export default function RegisterSuccessPage() {
  return (
    <AuthCard
      title="Check your email"
      description="We have sent a confirmation link to the address you registered with. The link expires in 24 hours."
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <span className="grid size-14 place-items-center rounded-2xl border border-accent-700/50 bg-accent-900/30 text-accent-300">
          <MailCheck className="size-6" aria-hidden />
        </span>

        <ol className="w-full space-y-3 text-left">
          {[
            "Confirm your email address using the link we sent.",
            "Complete identity verification with your NIN and an identity document.",
            "Choose a package and submit your payment.",
          ].map((step, index) => (
            <li
              key={step}
              className="flex items-start gap-3 rounded-lg border border-ink-700 bg-ink-880/50 px-3.5 py-3"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full border border-ink-600 text-[11px] font-semibold text-fg-muted">
                {index + 1}
              </span>
              <span className="text-[13px] leading-relaxed text-fg-muted">{step}</span>
            </li>
          ))}
        </ol>

        <ButtonLink href="/login" block>
          Continue to sign in
        </ButtonLink>

        <p className="text-[12px] leading-relaxed text-fg-subtle">
          No email after a few minutes? Check your spam folder, then sign in and request a new
          confirmation link.
        </p>
      </div>
    </AuthCard>
  );
}
