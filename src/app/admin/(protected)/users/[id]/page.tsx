import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Breadcrumbs,
  DashboardPage,
  DetailRow,
  PageTitle,
  Section,
} from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { UserStatusForm } from "@/components/admin/review-forms";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import { formatBusinessDate, formatBusinessDateTime, formatShortDate } from "@/lib/time";
import { truncateMiddle } from "@/lib/utils";
import {
  INVESTMENT_STATUS_LABEL,
  INVESTMENT_STATUS_TONE,
  KYC_STATUS_LABEL,
  KYC_STATUS_TONE,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
  WITHDRAWAL_STATUS_LABEL,
  WITHDRAWAL_STATUS_TONE,
} from "@/lib/domain/investment-status";
import { auditActionLabel } from "@/lib/audit";

export const metadata: Metadata = { title: "Account" };

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      investments: { orderBy: { createdAt: "desc" }, include: { cycle: true } },
      payments: { orderBy: { createdAt: "desc" }, take: 10 },
      withdrawals: { orderBy: { requestedAt: "desc" }, take: 10 },
      rollovers: { orderBy: { createdAt: "desc" }, take: 10 },
      kycSubmissions: { orderBy: { submittedAt: "desc" }, take: 5 },
      loginEvents: { orderBy: { createdAt: "desc" }, take: 10 },
      walletChanges: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!user) notFound();

  const auditRecords = await prisma.auditLog.findMany({
    where: { entityType: "User", entityId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const totals = await prisma.investment.aggregate({
    where: {
      userId: user.id,
      status: { in: ["QUEUED", "ACTIVE", "MATURED", "WITHDRAWAL_REQUESTED", "COMPLETED", "ROLLED_OVER"] },
    },
    _sum: { principalAmount: true },
  });

  const profile = user.profile;
  const suspended = user.status === "SUSPENDED";

  return (
    <DashboardPage className="max-w-7xl">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Users", href: "/admin/users" },
          { label: user.reference },
        ]}
      />

      <PageTitle
        title={profile ? `${profile.firstName} ${profile.surname}` : user.email}
        description={`Registered ${formatBusinessDate(user.createdAt)}`}
        actions={
          <>
            <StatusPill tone={KYC_STATUS_TONE[user.kycStatus]}>
              {KYC_STATUS_LABEL[user.kycStatus]}
            </StatusPill>
            <StatusPill tone={suspended ? "rejected" : "active"}>
              {suspended ? "Suspended" : "Active"}
            </StatusPill>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr] xl:items-start">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-fg">Account details</h2>
            <dl className="mt-4 border-t border-ink-700/60 pt-2">
              <DetailRow label="Account reference" mono>
                {user.reference}
              </DetailRow>
              <DetailRow label="Email">{user.email}</DetailRow>
              <DetailRow label="Email confirmed">
                {user.emailVerifiedAt ? formatBusinessDateTime(user.emailVerifiedAt) : "No"}
              </DetailRow>
              <DetailRow label="Legal name">
                {profile
                  ? `${profile.firstName} ${profile.otherName ?? ""} ${profile.surname}`
                      .replace(/\s+/g, " ")
                      .trim()
                  : "—"}
              </DetailRow>
              <DetailRow label="Date of birth">
                {profile ? formatBusinessDate(profile.dateOfBirth) : "—"}
              </DetailRow>
              <DetailRow label="Phone" mono>
                {profile?.phone ?? "—"}
              </DetailRow>
              <DetailRow label="Country">{profile?.country ?? "—"}</DetailRow>
              <DetailRow label="Total invested">
                {formatUSD(totals._sum.principalAmount ?? 0)}
              </DetailRow>
              <DetailRow label="Last sign-in">
                {user.lastLoginAt ? formatBusinessDateTime(user.lastLoginAt) : "Never"}
              </DetailRow>
              <DetailRow label="Saved withdrawal wallet" mono>
                {profile?.withdrawalWalletAddress
                  ? `${profile.withdrawalWalletNetwork} · ${truncateMiddle(profile.withdrawalWalletAddress, 10, 6)}`
                  : "None"}
              </DetailRow>
            </dl>
          </Card>

          <Section title="Investments" className="mt-0">
            {user.investments.length === 0 ? (
              <EmptyState title="No investments" />
            ) : (
              <ul className="space-y-2.5">
                {user.investments.map((investment) => (
                  <li key={investment.id}>
                    <Link
                      href={`/admin/investments/${investment.id}`}
                      className="surface-muted flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-accent-800"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-[11.5px] text-fg">{investment.reference}</p>
                        <p className="mt-1 text-[13px] text-fg-muted">
                          {investment.packageNameSnapshot} ·{" "}
                          {formatUSD(investment.principalAmount)} →{" "}
                          {formatUSD(investment.maturityAmount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-fg-subtle">
                          {formatShortDate(investment.startedAt ?? investment.createdAt)}
                        </span>
                        <StatusPill tone={INVESTMENT_STATUS_TONE[investment.status]}>
                          {INVESTMENT_STATUS_LABEL[investment.status]}
                        </StatusPill>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Recent payments" className="mt-0">
              {user.payments.length === 0 ? (
                <EmptyState title="No payments" />
              ) : (
                <ul className="space-y-2.5">
                  {user.payments.map((payment) => (
                    <li key={payment.id} className="surface-muted p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <Link
                          href={`/admin/payments/${payment.id}`}
                          className="font-mono text-[11.5px] text-accent-300 hover:underline"
                        >
                          {payment.reference}
                        </Link>
                        <StatusPill tone={PAYMENT_STATUS_TONE[payment.status]}>
                          {PAYMENT_STATUS_LABEL[payment.status]}
                        </StatusPill>
                      </div>
                      <p className="mt-1.5 text-[12.5px] text-fg-muted">
                        {formatUSD(payment.expectedAmount)} ·{" "}
                        {formatShortDate(payment.submittedAt ?? payment.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Recent withdrawals" className="mt-0">
              {user.withdrawals.length === 0 ? (
                <EmptyState title="No withdrawals" />
              ) : (
                <ul className="space-y-2.5">
                  {user.withdrawals.map((withdrawal) => (
                    <li key={withdrawal.id} className="surface-muted p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-[11.5px] text-fg">
                          {withdrawal.reference}
                        </span>
                        <StatusPill tone={WITHDRAWAL_STATUS_TONE[withdrawal.status]}>
                          {WITHDRAWAL_STATUS_LABEL[withdrawal.status]}
                        </StatusPill>
                      </div>
                      <p className="mt-1.5 text-[12.5px] text-fg-muted">
                        {formatUSD(withdrawal.amount)} ·{" "}
                        {formatShortDate(withdrawal.requestedAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </div>

        <div className="space-y-6">
          <Section title="Account status" className="mt-0">
            <Card className="p-5">
              <UserStatusForm userId={user.id} suspended={suspended} />
            </Card>
          </Section>

          <Section title="Verification history" className="mt-0">
            <Card className="p-5">
              {user.kycSubmissions.length === 0 ? (
                <p className="text-[12.5px] text-fg-muted">No submissions.</p>
              ) : (
                <ul className="space-y-3">
                  {user.kycSubmissions.map((submission) => (
                    <li key={submission.id} className="border-l border-ink-700 pl-3.5">
                      <Link
                        href={`/admin/kyc/${submission.id}`}
                        className="font-mono text-[11.5px] text-accent-300 hover:underline"
                      >
                        {submission.reference}
                      </Link>
                      <p className="mt-0.5 text-[11.5px] text-fg-subtle">
                        {KYC_STATUS_LABEL[submission.status]} ·{" "}
                        {formatShortDate(submission.submittedAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </Section>

          <Section title="Sign-in history" className="mt-0">
            <Card className="p-5">
              <ul className="space-y-2.5">
                {user.loginEvents.map((event) => (
                  <li key={event.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={
                          event.success
                            ? "text-[12.5px] text-fg"
                            : "text-[12.5px] text-status-rejected"
                        }
                      >
                        {event.success ? "Success" : `Failed${event.reason ? ` (${event.reason})` : ""}`}
                      </p>
                      <p className="mt-0.5 text-[11px] text-fg-subtle">
                        {event.ipAddress ?? "unknown IP"}
                      </p>
                    </div>
                    <p className="shrink-0 text-[11px] text-fg-subtle">
                      {formatShortDate(event.createdAt)}
                    </p>
                  </li>
                ))}
                {user.loginEvents.length === 0 ? (
                  <li className="text-[12.5px] text-fg-muted">No sign-in events.</li>
                ) : null}
              </ul>
            </Card>
          </Section>

          <Section title="Audit records" className="mt-0">
            <Card className="p-5">
              {auditRecords.length === 0 ? (
                <p className="text-[12.5px] text-fg-muted">No administrative actions recorded.</p>
              ) : (
                <ul className="space-y-3">
                  {auditRecords.map((record) => (
                    <li key={record.id} className="border-l border-ink-700 pl-3.5">
                      <p className="text-[12.5px] font-medium text-fg">
                        {auditActionLabel(record.action)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-fg-subtle">
                        {record.actorEmail ?? "system"} ·{" "}
                        {formatBusinessDateTime(record.createdAt)}
                      </p>
                      {record.reason ? (
                        <p className="mt-1 text-[11.5px] text-fg-muted">{record.reason}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </Section>
        </div>
      </div>
    </DashboardPage>
  );
}
