import type { Metadata } from "next";
import Link from "next/link";

import { DashboardPage, DetailRow, PageTitle, Section } from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { InfoNote } from "@/components/ui/feedback";
import { ProfileForm } from "@/components/dashboard/account-forms";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { formatBusinessDate } from "@/lib/time";
import { KYC_STATUS_LABEL, KYC_STATUS_TONE } from "@/lib/domain/investment-status";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser("/dashboard/profile");
  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });

  return (
    <DashboardPage>
      <PageTitle
        title="Profile"
        description="Your account details. Name and date of birth are locked once verification has been submitted."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
        <Card className="p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold text-fg">Account details</h2>
          <dl className="mt-4 border-t border-ink-700/60 pt-2">
            <DetailRow label="Account reference" mono>
              {user.reference}
            </DetailRow>
            <DetailRow label="First name">{profile?.firstName ?? "—"}</DetailRow>
            <DetailRow label="Surname">{profile?.surname ?? "—"}</DetailRow>
            <DetailRow label="Other names">{profile?.otherName || "—"}</DetailRow>
            <DetailRow label="Date of birth">
              {profile?.dateOfBirth ? formatBusinessDate(profile.dateOfBirth) : "—"}
            </DetailRow>
            <DetailRow label="Email address">{user.email}</DetailRow>
            <DetailRow label="Country">{profile?.country ?? "Nigeria"}</DetailRow>
            <DetailRow label="Identity verification">
              <StatusPill tone={KYC_STATUS_TONE[user.kycStatus]}>
                {KYC_STATUS_LABEL[user.kycStatus]}
              </StatusPill>
            </DetailRow>
          </dl>

          <InfoNote className="mt-5">
            Your legal name, date of birth and email address are tied to identity verification. To
            change one,{" "}
            <Link href="/dashboard/support/new" className="text-accent-300 underline underline-offset-2">
              open a support ticket
            </Link>{" "}
            so the change can be verified.
          </InfoNote>
        </Card>

        <div className="space-y-6">
          <Section title="Editable details" className="mt-0">
            <Card className="p-5 sm:p-6">
              <ProfileForm phone={profile?.phone ?? ""} />
            </Card>
          </Section>

          <Section title="Security" className="mt-0">
            <Card className="p-5">
              <p className="text-[13px] leading-relaxed text-fg-muted">
                Password, withdrawal wallet and active sessions are managed on the security page.
              </p>
              <Link
                href="/dashboard/security"
                className="mt-3 inline-block text-[13px] font-medium text-accent-300 hover:underline"
              >
                Open security settings →
              </Link>
            </Card>
          </Section>
        </div>
      </div>
    </DashboardPage>
  );
}
