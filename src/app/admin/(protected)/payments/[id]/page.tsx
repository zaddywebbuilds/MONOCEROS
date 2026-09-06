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
import { CopyButton } from "@/components/ui/interactive";
import { PaymentReviewForm } from "@/components/admin/review-forms";
import { requireAdminPage } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { formatAsset, formatUSD } from "@/lib/money";
import { signDocumentUrl } from "@/lib/storage/signed-url";
import { formatBusinessDateTime, formatCycleLabel, nextCycleStart } from "@/lib/time";
import { cycleConfig } from "@/server/services/cycles";
import {
  INVESTMENT_STATUS_LABEL,
  INVESTMENT_STATUS_TONE,
  KYC_STATUS_LABEL,
  KYC_STATUS_TONE,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
} from "@/lib/domain/investment-status";

export const metadata: Metadata = { title: "Review payment" };

export default async function AdminPaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await requireAdminPage(`/admin/payments/${id}`);

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      user: { include: { profile: true } },
      investment: { include: { cycle: true } },
    },
  });

  if (!payment) notFound();

  const config = await cycleConfig();
  // Approving now would place the subscription in this cycle.
  const prospectiveCycle = formatCycleLabel(nextCycleStart(new Date(), config));

  const proofUrl = payment.proofKey
    ? signDocumentUrl({ key: payment.proofKey, viewerId: admin.id })
    : null;

  const decidable = ["SUBMITTED", "UNDER_REVIEW"].includes(payment.status);
  const profile = payment.user.profile;

  return (
    <DashboardPage className="max-w-6xl">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Payments", href: "/admin/payments" },
          { label: payment.reference },
        ]}
      />

      <PageTitle
        title={`Payment ${payment.reference}`}
        description={
          payment.submittedAt
            ? `Submitted ${formatBusinessDateTime(payment.submittedAt)}`
            : "Not yet submitted by the investor"
        }
        actions={
          <StatusPill tone={PAYMENT_STATUS_TONE[payment.status]}>
            {PAYMENT_STATUS_LABEL[payment.status]}
          </StatusPill>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-fg">Transfer</h2>
            <dl className="mt-4 border-t border-ink-700/60 pt-2">
              <DetailRow label="Asset">{payment.asset}</DetailRow>
              <DetailRow label="Network">{payment.network || "—"}</DetailRow>
              <DetailRow label="Company wallet" mono>
                {payment.walletAddress || "—"}
              </DetailRow>
              <DetailRow label="Expected amount">
                {formatAsset(payment.expectedAmount, payment.asset)}
              </DetailRow>
              <DetailRow label="Amount reported">
                {payment.submittedAmount
                  ? formatAsset(payment.submittedAmount, payment.asset)
                  : "—"}
              </DetailRow>
            </dl>

            {payment.transactionHash ? (
              <div className="mt-5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
                  Transaction hash
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="min-w-0 flex-1 break-all rounded-lg border border-ink-600 bg-ink-900/70 px-3 py-2.5 font-mono text-[11.5px] text-fg">
                    {payment.transactionHash}
                  </code>
                  <CopyButton value={payment.transactionHash} label="Copy" />
                </div>
                <p className="mt-2 text-[11.5px] text-fg-subtle">
                  Verify this hash on the block explorer for the {payment.network || "stated"}{" "}
                  network before approving. The platform does not read the blockchain.
                </p>
              </div>
            ) : null}

            {proofUrl ? (
              <a
                href={proofUrl}
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
                      Open proof of payment
                    </span>
                    <span className="block text-[11.5px] text-fg-subtle">
                      Link expires in 5 minutes · access is audited
                    </span>
                  </span>
                </span>
                <ExternalLink className="size-4 text-fg-subtle" aria-hidden />
              </a>
            ) : null}
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-fg">Subscription and investor</h2>
            <dl className="mt-4 border-t border-ink-700/60 pt-2">
              <DetailRow label="Investment" mono>
                <Link
                  href={`/admin/investments/${payment.investmentId}`}
                  className="text-accent-300 hover:underline"
                >
                  {payment.investment.reference}
                </Link>
              </DetailRow>
              <DetailRow label="Package">{payment.investment.packageNameSnapshot}</DetailRow>
              <DetailRow label="Capital">
                {formatUSD(payment.investment.principalAmount)}
              </DetailRow>
              <DetailRow label="Maturity value">
                {formatUSD(payment.investment.maturityAmount)}
              </DetailRow>
              <DetailRow label="Investment status">
                <StatusPill tone={INVESTMENT_STATUS_TONE[payment.investment.status]}>
                  {INVESTMENT_STATUS_LABEL[payment.investment.status]}
                </StatusPill>
              </DetailRow>
              <DetailRow label="Investor">
                <Link
                  href={`/admin/users/${payment.userId}`}
                  className="text-accent-300 hover:underline"
                >
                  {profile ? `${profile.firstName} ${profile.surname}` : payment.user.email}
                </Link>
              </DetailRow>
              <DetailRow label="Email">{payment.user.email}</DetailRow>
              <DetailRow label="Identity verification">
                <StatusPill tone={KYC_STATUS_TONE[payment.user.kycStatus]}>
                  {KYC_STATUS_LABEL[payment.user.kycStatus]}
                </StatusPill>
              </DetailRow>
            </dl>
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-6">
          <Card className="p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-fg">Decision</h2>

            {payment.user.kycStatus !== "APPROVED" ? (
              <InfoNote tone="warning" className="mt-4">
                This investor is not KYC-approved. Resolve verification before approving a payment.
              </InfoNote>
            ) : null}

            <div className="mt-5">
              {decidable ? (
                <PaymentReviewForm
                  paymentId={payment.id}
                  expectedAmount={formatAsset(payment.expectedAmount, payment.asset)}
                  submittedAmount={
                    payment.submittedAmount
                      ? formatAsset(payment.submittedAmount, payment.asset)
                      : formatAsset(payment.expectedAmount, payment.asset)
                  }
                  cycleLabel={prospectiveCycle}
                />
              ) : (
                <InfoNote>
                  This payment is {PAYMENT_STATUS_LABEL[payment.status].toLowerCase()} and cannot be
                  decided again.
                  {payment.approvedAt
                    ? ` Approved ${formatBusinessDateTime(payment.approvedAt)}.`
                    : ""}
                  {payment.rejectionReason ? ` Reason: ${payment.rejectionReason}` : ""}
                </InfoNote>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-[14px] font-semibold text-fg">Cycle placement</h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-fg-muted">
              The cycle is decided by the moment of approval, not the moment of submission.
              Approving now places this subscription in the cycle opening{" "}
              <strong className="font-semibold text-fg">{prospectiveCycle}</strong>.
            </p>
            {payment.investment.cycle ? (
              <p className="mt-3 text-[12.5px] text-fg-muted">
                Currently assigned to{" "}
                <strong className="font-semibold text-fg">
                  {formatCycleLabel(payment.investment.cycle.cycleStart)}
                </strong>
                .
              </p>
            ) : null}
          </Card>
        </div>
      </div>
    </DashboardPage>
  );
}
