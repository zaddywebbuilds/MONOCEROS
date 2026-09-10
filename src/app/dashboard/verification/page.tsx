import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Clock3, ShieldAlert } from "lucide-react";

import { DashboardPage, PageTitle, Section, DetailRow } from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { InfoNote } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { KycForm } from "@/components/dashboard/kyc-form";
import { SecurityPanel } from "@/components/visuals/security-panel";
import { requireVerifiedEmail } from "@/lib/auth/rbac";
import { getSettings } from "@/lib/settings";
import { getLatestKycSubmission } from "@/server/services/kyc";
import { KYC_STATUS_LABEL, KYC_STATUS_TONE } from "@/lib/domain/investment-status";
import { ID_DOCUMENT_LABELS } from "@/lib/validation/platform";
import { formatBusinessDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Identity verification" };

export default async function VerificationPage() {
  const user = await requireVerifiedEmail("/dashboard/verification");
  const [settings, submission] = await Promise.all([
    getSettings(),
    getLatestKycSubmission(user.id),
  ]);

  const canSubmit = ["NOT_SUBMITTED", "REJECTED", "RESUBMIT_REQUESTED"].includes(user.kycStatus);

  return (
    <DashboardPage>
      <PageTitle
        title="Identity verification"
        description="Verification is required before you can subscribe to an investment package."
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={
                    user.kycStatus === "APPROVED"
                      ? "grid size-10 place-items-center rounded-xl border border-accent-700/50 bg-accent-900/30 text-accent-300"
                      : user.kycStatus === "PENDING"
                        ? "grid size-10 place-items-center rounded-xl border border-status-pending/40 bg-status-pending/10 text-status-pending"
                        : "grid size-10 place-items-center rounded-xl border border-ink-600 bg-ink-850 text-fg-muted"
                  }
                >
                  {user.kycStatus === "APPROVED" ? (
                    <BadgeCheck className="size-5" aria-hidden />
                  ) : user.kycStatus === "PENDING" ? (
                    <Clock3 className="size-5" aria-hidden />
                  ) : (
                    <ShieldAlert className="size-5" aria-hidden />
                  )}
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-fg">Verification status</p>
                  <p className="mt-0.5 text-[12.5px] text-fg-muted">
                    {user.kycStatus === "APPROVED"
                      ? "You can subscribe to investment packages."
                      : user.kycStatus === "PENDING"
                        ? "Your submission is queued for manual review."
                        : "Submit your NIN and an identity document to continue."}
                  </p>
                </div>
              </div>
              <StatusPill tone={KYC_STATUS_TONE[user.kycStatus]}>
                {KYC_STATUS_LABEL[user.kycStatus]}
              </StatusPill>
            </div>

            {submission ? (
              <dl className="mt-5 border-t border-ink-700/60 pt-3">
                <DetailRow label="Reference">
                  <span className="font-mono text-[11.5px]">{submission.reference}</span>
                </DetailRow>
                <DetailRow label="Document type">
                  {ID_DOCUMENT_LABELS[submission.idType] ?? submission.idType}
                </DetailRow>
                <DetailRow label="Submitted">
                  {formatBusinessDateTime(submission.submittedAt)}
                </DetailRow>
                {submission.reviewedAt ? (
                  <DetailRow label="Reviewed">
                    {formatBusinessDateTime(submission.reviewedAt)}
                  </DetailRow>
                ) : null}
              </dl>
            ) : null}

            {submission?.rejectionReason && user.kycStatus !== "APPROVED" ? (
              <InfoNote tone="warning" className="mt-4">
                <strong className="font-semibold">Reviewer note.</strong>{" "}
                {submission.rejectionReason}
              </InfoNote>
            ) : null}

            {user.kycStatus === "APPROVED" ? (
              <ButtonLink href="/dashboard/packages" className="mt-5">
                View investment packages
              </ButtonLink>
            ) : null}
          </Card>

          {canSubmit ? (
            <Section title={submission ? "Submit again" : "Submit your documents"} className="mt-0">
              <Card className="p-5 sm:p-6">
                <KycForm
                  allowedIdTypes={settings["kyc.allowedIdTypes"]}
                  maxUploadMb={settings["kyc.maxUploadMb"]}
                  ninRequired={settings["kyc.ninRequired"]}
                />
              </Card>
            </Section>
          ) : user.kycStatus === "PENDING" ? (
            <InfoNote>
              Your documents are with the compliance team. You will receive an email and a dashboard
              notification as soon as a decision is made. There is nothing else to do right now.
            </InfoNote>
          ) : null}
        </div>

        <div className="space-y-5">
          <SecurityPanel />

          <Card className="p-5">
            <h2 className="text-[14px] font-semibold text-fg">Why we ask for this</h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-fg-muted">
              {settings["kyc.notice"]}
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="text-[14px] font-semibold text-fg">Accepted documents</h2>
            <ul className="mt-3 space-y-2">
              {settings["kyc.allowedIdTypes"].map((type) => (
                <li key={type} className="flex items-center gap-2 text-[12.5px] text-fg-muted">
                  <span aria-hidden className="size-1.5 rounded-full bg-accent-500" />
                  {ID_DOCUMENT_LABELS[type as keyof typeof ID_DOCUMENT_LABELS] ?? type}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[12px] leading-relaxed text-fg-subtle">
              Accounts are currently available to residents of {settings["kyc.country"]} aged{" "}
              {settings["kyc.minimumAge"]} and over. Questions?{" "}
              <Link href="/dashboard/support/new" className="text-accent-300 hover:underline">
                Open a support ticket
              </Link>
              .
            </p>
          </Card>
        </div>
      </div>
    </DashboardPage>
  );
}
