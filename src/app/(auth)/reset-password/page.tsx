import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/forms";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthCard
        title="This link is not valid"
        description="The reset link is missing its token. Reset links expire after 60 minutes and can be used once."
      >
        <ButtonLink href="/forgot-password" block>
          Request a new link
        </ButtonLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set a new password"
      description="Choose a password you have not used on this account before."
    >
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
