import type { Metadata } from "next";
import Link from "next/link";
import { Share2 } from "lucide-react";

import { DashboardPage, PageTitle, Section } from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState, InfoNote } from "@/components/ui/feedback";
import {
  Table,
  TableScroll,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { ReferralPayoutDecisionForm } from "@/components/admin/referral-forms";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import { formatBusinessDateTime } from "@/lib/time";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Referrals" };

const OPEN_STATUSES = ["PENDING", "UNDER_REVIEW", "APPROVED", "PROCESSING"] as const;

export default async function AdminReferralsPage() {
  const [settings, openPayouts, settled, topReferrers, owed] = await Promise.all([
    getSettings(),
    prisma.referralPayout.findMany({
      where: { status: { in: [...OPEN_STATUSES] } },
      include: {
        referrer: {
          select: {
            id: true,
            email: true,
            reference: true,
            kycStatus: true,
            profile: { select: { firstName: true, surname: true } },
          },
        },
        _count: { select: { earnings: true } },
      },
      orderBy: { requestedAt: "asc" },
    }),
    prisma.referralPayout.findMany({
      where: { status: { in: ["PAID", "REJECTED", "CANCELLED"] } },
      include: { referrer: { select: { email: true } } },
      orderBy: { processedAt: "desc" },
      take: 10,
    }),
    prisma.referralEarning.groupBy({
      by: ["referrerId"],
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    }),
    prisma.referralEarning.aggregate({
      where: { status: { in: ["PAYABLE", "PENDING"] } },
      _sum: { amount: true },
    }),
  ]);

  const referrerIds = topReferrers.map((row) => row.referrerId);
  const referrers = await prisma.user.findMany({
    where: { id: { in: referrerIds } },
    select: {
      id: true,
      email: true,
      referralCode: true,
      profile: { select: { firstName: true, surname: true } },
      _count: { select: { referrals: true } },
    },
  });
  const byId = new Map(referrers.map((r) => [r.id, r]));

  return (
    <DashboardPage className="max-w-7xl">
      <PageTitle
        title="Referrals"
        description={`Commission is ${Number(settings["referral.percentage"])}% of each referred investor's profit, earned at maturity.`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">Owed but unpaid</p>
          <p className="mt-1.5 text-[18px] font-semibold text-fg">
            {formatUSD(owed._sum.amount ?? 0)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">Payouts waiting</p>
          <p className="mt-1.5 text-[18px] font-semibold text-fg">{openPayouts.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">Programme</p>
          <p className="mt-1.5 text-[18px] font-semibold text-fg">
            {settings["referral.enabled"]
              ? settings["referral.openToAll"]
                ? "Open to all"
                : "Invitation only"
              : "Paused"}
          </p>
        </Card>
      </div>

      <InfoNote className="mb-6">
        A referral link is issued from each investor&apos;s own page under Users. Commission already
        earned is never removed by withdrawing somebody&apos;s link.
      </InfoNote>

      <Section title="Payout requests" className="mt-0">
        {openPayouts.length === 0 ? (
          <EmptyState
            icon={<Share2 className="size-5" />}
            title="No payout requests"
            description="Requests appear here when an affiliate asks to be paid."
          />
        ) : (
          <div className="space-y-4">
            {openPayouts.map((payout) => {
              const name = payout.referrer.profile
                ? `${payout.referrer.profile.firstName} ${payout.referrer.profile.surname}`
                : payout.referrer.reference;

              return (
                <Card key={payout.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-fg">
                        {formatUSD(payout.amount)}{" "}
                        <span className="font-mono text-[12px] text-fg-subtle">
                          {payout.reference}
                        </span>
                      </p>
                      <p className="mt-1 text-[12.5px] text-fg-muted">
                        <Link
                          href={`/admin/users/${payout.referrer.id}`}
                          className="underline underline-offset-2"
                        >
                          {name}
                        </Link>{" "}
                        · {payout.referrer.email} · {payout._count.earnings} commission
                        {payout._count.earnings === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 text-[12px] text-fg-subtle">
                        Requested {formatBusinessDateTime(payout.requestedAt)}
                      </p>
                    </div>
                    <StatusPill
                      tone={payout.referrer.kycStatus === "APPROVED" ? "active" : "pending"}
                    >
                      {payout.referrer.kycStatus === "APPROVED"
                        ? "Identity verified"
                        : "Not verified"}
                    </StatusPill>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="surface-muted p-3.5">
                      <p className="text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">
                        Send to
                      </p>
                      <p className="mt-1 break-all font-mono text-[12.5px] text-fg">
                        {payout.walletAddress ?? "—"}
                      </p>
                      <p className="mt-1 text-[11.5px] text-fg-subtle">
                        Network: {payout.walletNetwork ?? "—"}
                      </p>
                    </div>
                    <div className="surface-muted p-3.5">
                      <p className="text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">
                        Status
                      </p>
                      <p className="mt-1 text-[13px] text-fg">{payout.status}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <ReferralPayoutDecisionForm payoutId={payout.id} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Top referrers">
        {topReferrers.length === 0 ? (
          <EmptyState
            title="No commission earned yet"
            description="Earnings appear once a referred investor reaches maturity."
          />
        ) : (
          <TableScroll>
            <Table className="min-w-[720px]">
              <THead>
                <tr>
                  <TH>Referrer</TH>
                  <TH>Link</TH>
                  <TH className="text-right">People invited</TH>
                  <TH className="text-right">Commissions</TH>
                  <TH className="text-right">Total earned</TH>
                </tr>
              </THead>
              <TBody>
                {topReferrers.map((row) => {
                  const person = byId.get(row.referrerId);
                  return (
                    <TR key={row.referrerId}>
                      <TD>
                        <Link
                          href={`/admin/users/${row.referrerId}`}
                          className="underline underline-offset-2"
                        >
                          {person?.profile
                            ? `${person.profile.firstName} ${person.profile.surname}`
                            : (person?.email ?? row.referrerId)}
                        </Link>
                      </TD>
                      <TD className="font-mono text-[12px]">{person?.referralCode ?? "—"}</TD>
                      <TD className="text-right">{person?._count.referrals ?? 0}</TD>
                      <TD className="text-right">{row._count._all}</TD>
                      <TD className="text-right">{formatUSD(row._sum.amount ?? 0)}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableScroll>
        )}
      </Section>

      {settled.length > 0 ? (
        <Section title="Recently settled">
          <TableScroll>
            <Table className="min-w-[640px]">
              <THead>
                <tr>
                  <TH>Reference</TH>
                  <TH>Referrer</TH>
                  <TH>Status</TH>
                  <TH>Processed</TH>
                  <TH className="text-right">Amount</TH>
                </tr>
              </THead>
              <TBody>
                {settled.map((payout) => (
                  <TR key={payout.id}>
                    <TD className="font-mono text-[12px]">{payout.reference}</TD>
                    <TD>{payout.referrer.email}</TD>
                    <TD>{payout.status}</TD>
                    <TD>
                      {payout.processedAt ? formatBusinessDateTime(payout.processedAt) : "—"}
                    </TD>
                    <TD className="text-right">{formatUSD(payout.amount)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableScroll>
        </Section>
      ) : null}
    </DashboardPage>
  );
}
