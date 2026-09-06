import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { TriangleAlert } from "lucide-react";

import {
  Breadcrumbs,
  DashboardPage,
  DetailRow,
  PageTitle,
} from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/interactive";
import { InfoNote } from "@/components/ui/feedback";
import { PaymentSubmissionForm } from "@/components/dashboard/payment-form";
import { InvestmentTimeline } from "@/components/dashboard/investment-timeline";
import { requireApprovedKyc } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { getSettings, paymentConfigured } from "@/lib/settings";
import { walletQrDataUrl } from "@/lib/qr";
import { formatAsset, formatUSD } from "@/lib/money";
import { formatBusinessDateTime } from "@/lib/time";
import {
  INVESTMENT_STATUS_LABEL,
  INVESTMENT_STATUS_TONE,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
} from "@/lib/domain/investment-status";

export const metadata: Metadata = { title: "Payment" };

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireApprovedKyc(`/dashboard/payments/${id}`);

  const investment = await prisma.investment.findFirst({
    where: { id, userId: user.id },
    include: { payments: { orderBy: { createdAt: "desc" } } },
  });

  if (!investment) notFound();

  const payment = investment.payments[0];
  if (!payment) notFound();

  const settings = await getSettings();
  const configured = paymentConfigured(settings);
  const walletAddress = settings["payment.walletAddress"];
  const network = settings["payment.network"];
  const asset = settings["payment.asset"];
  const qr = configured ? await walletQrDataUrl(walletAddress) : null;

  const canSubmit = ["PAYMENT_PENDING", "PAYMENT_REJECTED"].includes(investment.status);
  const expectedAmount = payment.expectedAmount.toFixed(2);

  return (
    <DashboardPage>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Payments", href: "/dashboard/payments" },
          { label: payment.reference },
        ]}
      />

      <PageTitle
        title="Payment details"
        description={`Send exactly ${formatAsset(payment.expectedAmount, asset)} to the company wallet, then submit your transaction hash.`}
        actions={
          <StatusPill tone={INVESTMENT_STATUS_TONE[investment.status]}>
            {INVESTMENT_STATUS_LABEL[investment.status]}
          </StatusPill>
        }
      />

      {payment.rejectionReason && investment.status === "PAYMENT_REJECTED" ? (
        <InfoNote tone="warning" className="mb-6">
          <strong className="font-semibold">Your previous submission was not verified.</strong>{" "}
          {payment.rejectionReason} Correct the details and submit again below.
        </InfoNote>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-start">
        <div className="space-y-5">
          {!configured ? (
            <Card className="p-5 sm:p-6">
              <InfoNote tone="warning">
                Payment details have not been configured yet, so we cannot show you a wallet
                address. Please contact support — do not send funds anywhere until an address is
                shown here.
              </InfoNote>
            </Card>
          ) : (
            <Card className="p-5 sm:p-6">
              <h2 className="text-[15px] font-semibold text-fg">Payment details</h2>

              <dl className="mt-4 border-t border-ink-700/60 pt-2">
                <DetailRow label="Asset">{asset}</DetailRow>
                <DetailRow label="Network">
                  <span className="text-accent-300">{network}</span>
                </DetailRow>
                <DetailRow label="Amount">
                  {formatAsset(payment.expectedAmount, asset)}
                </DetailRow>
                <DetailRow label="Reference">
                  <span className="font-mono text-[11.5px]">{payment.reference}</span>
                </DetailRow>
              </dl>

              <div className="mt-5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
                  Wallet address
                </p>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <code className="min-w-0 flex-1 break-all rounded-lg border border-ink-600 bg-ink-900/70 px-3.5 py-3 font-mono text-[12px] text-fg">
                    {walletAddress}
                  </code>
                  <CopyButton value={walletAddress} label="Copy address" />
                </div>
              </div>

              <div className="mt-5 flex flex-col items-center gap-4 rounded-xl border border-ink-700 bg-ink-880/40 p-5 sm:flex-row sm:items-start">
                {qr ? (
                  <Image
                    src={qr}
                    alt={`QR code for the ${asset} wallet address`}
                    width={160}
                    height={160}
                    unoptimized
                    className="rounded-lg border border-ink-700"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-fg">Scan to pay</p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-muted">
                    {settings["payment.instructions"]}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-xl border border-status-rejected/30 bg-status-rejected/[0.07] p-4">
                <TriangleAlert
                  className="mt-0.5 size-4 shrink-0 text-status-rejected"
                  aria-hidden
                />
                <p className="text-[12.5px] leading-relaxed text-status-rejected">
                  Send only <strong className="font-semibold">{asset}</strong> using the{" "}
                  <strong className="font-semibold">{network}</strong> network. Sending another
                  asset, or using another network, may result in permanent loss.
                </p>
              </div>
            </Card>
          )}

          <Card className="p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-fg">Confirm your transfer</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
              After sending, submit the transaction hash so the finance team can verify it.
            </p>

            <div className="mt-5">
              {canSubmit && configured ? (
                <PaymentSubmissionForm
                  investmentId={investment.id}
                  expectedAmount={expectedAmount}
                  asset={asset}
                  maxUploadMb={settings["kyc.maxUploadMb"]}
                />
              ) : (
                <div className="rounded-xl border border-ink-700 bg-ink-880/50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={PAYMENT_STATUS_TONE[payment.status]}>
                      {PAYMENT_STATUS_LABEL[payment.status]}
                    </StatusPill>
                    {payment.submittedAt ? (
                      <span className="text-[12px] text-fg-subtle">
                        Submitted {formatBusinessDateTime(payment.submittedAt)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-[13px] leading-relaxed text-fg-muted">
                    {payment.status === "APPROVED"
                      ? "Your payment has been verified. Your subscription is queued for the next investment cycle."
                      : "Your payment details are with the finance team. There is nothing else for you to do — we will notify you when a decision is made."}
                  </p>
                  {payment.transactionHash ? (
                    <dl className="mt-3 border-t border-ink-700/60 pt-2">
                      <DetailRow label="Transaction hash" mono>
                        {payment.transactionHash}
                      </DetailRow>
                      {payment.submittedAmount ? (
                        <DetailRow label="Amount submitted">
                          {formatAsset(payment.submittedAmount, asset)}
                        </DetailRow>
                      ) : null}
                    </dl>
                  ) : null}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-[14px] font-semibold text-fg">Your subscription</h2>
            <dl className="mt-3 border-t border-ink-700/60 pt-2">
              <DetailRow label="Package">{investment.packageNameSnapshot}</DetailRow>
              <DetailRow label="Reference" mono>
                {investment.reference}
              </DetailRow>
              <DetailRow label="Capital">{formatUSD(investment.principalAmount)}</DetailRow>
              <DetailRow label="Return">
                {investment.returnPercentageSnapshot.toDecimalPlaces(2).toString()}%
              </DetailRow>
              <DetailRow label="Maturity value">
                <span className="text-accent-300">{formatUSD(investment.maturityAmount)}</span>
              </DetailRow>
              <DetailRow label="Term">{investment.durationDays} days</DetailRow>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-[14px] font-semibold text-fg">Progress</h2>
            <div className="mt-4">
              <InvestmentTimeline status={investment.status} />
            </div>
          </Card>
        </div>
      </div>
    </DashboardPage>
  );
}
