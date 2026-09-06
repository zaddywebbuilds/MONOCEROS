import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, FileText } from "lucide-react";

import {
  Breadcrumbs,
  DashboardPage,
  DetailRow,
  PageTitle,
} from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { InfoNote } from "@/components/ui/feedback";
import { KycReviewForm } from "@/components/admin/review-forms";
import { requireAdminPage } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { signDocumentUrl } from "@/lib/storage/signed-url";
import { formatBusinessDate, formatBusinessDateTime } from "@/lib/time";
import { KYC_STATUS_LABEL, KYC_STATUS_TONE } from "@/lib/domain/investment-status";
import { ID_DOCUMENT_LABELS } from "@/lib/validation/platform";

export const metadata: Metadata = { title: "Review verification" };

export default async function AdminKycDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await requireAdminPage(`/admin/kyc/${id}`);

  const submission = await prisma.kycSubmission.findUnique({
    where: { id },
    include: {
      user: {
        include: {
          profile: true,
          _count: { select: { investments: true } },
        },
      },
    },
  });

  if (!submission) notFound();

  // Short-lived, signed, audience-bound link. The route re-checks the role too.
  const documentUrl = signDocumentUrl({ key: submission.documentKey, viewerId: admin.id });

  const profile = submission.user.profile;

  return (
    <DashboardPage className="max-w-6xl">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "KYC", href: "/admin/kyc" },
          { label: submission.reference },
        ]}
      />

      <PageTitle
        title={
          profile ? `${profile.firstName} ${profile.surname}` : submission.user.email
        }
        description={`Submitted ${formatBusinessDateTime(submission.submittedAt)}`}
        actions={
          <StatusPill tone={KYC_STATUS_TONE[submission.status]}>
            {KYC_STATUS_LABEL[submission.status]}
          </StatusPill>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-fg">Submission</h2>
            <dl className="mt-4 border-t border-ink-700/60 pt-2">
              <DetailRow label="Reference" mono>
                {submission.reference}
              </DetailRow>
              <DetailRow label="NIN" mono>
                {submission.nin ?? "—"}
              </DetailRow>
              <DetailRow label="Document type">
                {ID_DOCUMENT_LABELS[submission.idType] ?? submission.idType}
              </DetailRow>
              <DetailRow label="Document number" mono>
                {submission.idNumber || "—"}
              </DetailRow>
              <DetailRow label="File type">{submission.documentMime}</DetailRow>
              <DetailRow label="File size">
                {(submission.documentSize / 1024).toFixed(0)} KB
              </DetailRow>
              {submission.reviewedAt ? (
                <DetailRow label="Reviewed">
                  {formatBusinessDateTime(submission.reviewedAt)}
                </DetailRow>
              ) : null}
              {submission.rejectionReason ? (
                <DetailRow label="Recorded reason">{submission.rejectionReason}</DetailRow>
              ) : null}
            </dl>

            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-ink-600 bg-ink-850/70 p-4 transition-colors hover:border-accent-700"
            >
              <span className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg border border-ink-600 bg-ink-800 text-accent-300">
                  <FileText className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-[13.5px] font-medium text-fg">
                    Open identity document
                  </span>
                  <span className="block text-[11.5px] text-fg-subtle">
                    Link expires in 5 minutes · access is audited
                  </span>
                </span>
              </span>
              <ExternalLink className="size-4 text-fg-subtle" aria-hidden />
            </a>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-fg">Account</h2>
            <dl className="mt-4 border-t border-ink-700/60 pt-2">
              <DetailRow label="Account reference" mono>
                {submission.user.reference}
              </DetailRow>
              <DetailRow label="Email">{submission.user.email}</DetailRow>
              <DetailRow label="Email confirmed">
                {submission.user.emailVerifiedAt
                  ? formatBusinessDate(submission.user.emailVerifiedAt)
                  : "Not confirmed"}
              </DetailRow>
              <DetailRow label="Legal name">
                {profile ? `${profile.firstName} ${profile.otherName ?? ""} ${profile.surname}`.replace(/\s+/g, " ").trim() : "—"}
              </DetailRow>
              <DetailRow label="Date of birth">
                {profile ? formatBusinessDate(profile.dateOfBirth) : "—"}
              </DetailRow>
              <DetailRow label="Phone" mono>
                {profile?.phone ?? "—"}
              </DetailRow>
              <DetailRow label="Country">{profile?.country ?? "—"}</DetailRow>
              <DetailRow label="Investments">{submission.user._count.investments}</DetailRow>
            </dl>

            <Link
              href={`/admin/users/${submission.userId}`}
              className="mt-4 inline-block text-[13px] font-medium text-accent-300 hover:underline"
            >
              Open full account →
            </Link>
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-6">
          <Card className="p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-fg">Decision</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-muted">
              Check that the document is current, legible, unaltered, and that the name matches the
              account.
            </p>

            <div className="mt-5">
              {submission.status === "PENDING" ? (
                <KycReviewForm submissionId={submission.id} />
              ) : (
                <InfoNote>
                  This submission has already been decided ({KYC_STATUS_LABEL[submission.status]}).
                  If the investor needs to submit again, they can do so from their dashboard.
                </InfoNote>
              )}
            </div>
          </Card>

          <InfoNote tone="warning">
            Identity documents are personal data. Open them only to make a decision, never share
            them outside the compliance team, and never download them to a personal device.
          </InfoNote>
        </div>
      </div>
    </DashboardPage>
  );
}
