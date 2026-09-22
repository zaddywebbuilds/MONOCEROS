import type { Metadata } from "next";

import { DashboardPage, PageTitle, Section } from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState, InfoNote } from "@/components/ui/feedback";
import {
  MobileCard,
  MobileCardList,
  Table,
  TableScroll,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { ReferralLinkCard, ReferralPayoutForm } from "@/components/dashboard/referral-forms";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/env";
import { referralLink } from "@/lib/referral";
import { formatUSD, toMoneyString } from "@/lib/money";
import { formatBusinessDate } from "@/lib/time";
import { getSettings } from "@/lib/settings";
import { referralSummary, referredInvestors } from "@/server/services/referrals";
import { INVESTMENT_STATUS_LABEL, INVESTMENT_STATUS_TONE } from "@/lib/domain/investment-status";

export const metadata: Metadata = { title: "Referrals" };

export default async function ReferralsPage() {
  const user = await requireUser("/dashboard/referrals");

  const [summary, invited, settings, payouts, profile] = await Promise.all([
    referralSummary(user.id),
    referredInvestors(user.id),
    getSettings(),
    prisma.referralPayout.findMany({
      where: { referrerId: user.id },
      orderBy: { requestedAt: "desc" },
      take: 10,
    }),
    prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: { withdrawalWalletAddress: true, withdrawalWalletNetwork: true },
    }),
  ]);

  const belowMinimum = Number(toMoneyString(summary.payable)) < summary.minimumPayout;

  if (!summary.enabled) {
    return (
      <DashboardPage>
        <PageTitle title="Referrals" description="Introduce investors and earn commission." />
        <EmptyState
          title="The referral programme is paused"
          description="It is not currently accepting new introductions. Please check back later."
        />
      </DashboardPage>
    );
  }

  // No code means this account has not been admitted to the programme. Say so
  // plainly rather than showing an empty dashboard that looks broken.
  if (!summary.code) {
    return (
      <DashboardPage>
        <PageTitle title="Referrals" description="Introduce investors and earn commission." />
        <EmptyState
          title="You do not have a referral link yet"
          description="Referral links are issued by the Monoceros team. Contact support if you would like to introduce investors."
        />
      </DashboardPage>
    );
  }

  return (
    <DashboardPage>
      <PageTitle
        title="Referrals"
        description={`Earn ${summary.percentage}% of the profit made by investors who join through your link.`}
      />

      <ReferralLinkCard link={referralLink(appUrl, summary.code)} code={summary.code} />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Available now", value: formatUSD(summary.payable) },
          { label: "Awaiting payout", value: formatUSD(summary.pendingPayout) },
          { label: "Paid to date", value: formatUSD(summary.paid) },
        ].map((item) => (
          <Card key={item.label} className="p-5">
            <p className="text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">{item.label}</p>
            <p className="mt-1.5 text-[18px] font-semibold text-fg">{item.value}</p>
          </Card>
        ))}
      </div>

      <InfoNote className="mt-6">{String(settings["referral.terms"])}</InfoNote>

      <Section title="People you introduced">
        {invited.length === 0 ? (
          <EmptyState
            title="Nobody has joined through your link yet"
            description="Share the link above. Anyone who registers through it is permanently linked to you."
          />
        ) : (
          <>
            <TableScroll className="hidden lg:block">
              <Table className="min-w-[820px]">
                <THead>
                  <tr>
                    <TH>Investor</TH>
                    <TH>Joined</TH>
                    <TH>Package</TH>
                    <TH>Status</TH>
                    <TH>Matures</TH>
                    <TH className="text-right">Your commission</TH>
                  </tr>
                </THead>
                <TBody>
                  {invited.map((person) => {
                    const name = person.profile
                      ? `${person.profile.firstName} ${person.profile.surname[0] ?? ""}.`
                      : person.reference;

                    if (person.investments.length === 0) {
                      return (
                        <TR key={person.id}>
                          <TD>{name}</TD>
                          <TD>{formatBusinessDate(person.createdAt)}</TD>
                          <TD colSpan={3} className="text-fg-subtle">
                            Has not invested yet
                          </TD>
                          <TD className="text-right text-fg-subtle">—</TD>
                        </TR>
                      );
                    }

                    return person.investments.map((investment, index) => (
                      <TR key={`${person.id}-${investment.reference}`}>
                        <TD>{index === 0 ? name : ""}</TD>
                        <TD>{index === 0 ? formatBusinessDate(person.createdAt) : ""}</TD>
                        <TD>{investment.packageNameSnapshot}</TD>
                        <TD>
                          <StatusPill tone={INVESTMENT_STATUS_TONE[investment.status]}>
                            {INVESTMENT_STATUS_LABEL[investment.status]}
                          </StatusPill>
                        </TD>
                        <TD>
                          {investment.maturesAt ? formatBusinessDate(investment.maturesAt) : "—"}
                        </TD>
                        <TD className="text-right">
                          {investment.referralEarning
                            ? formatUSD(investment.referralEarning.amount)
                            : "pending maturity"}
                        </TD>
                      </TR>
                    ));
                  })}
                </TBody>
              </Table>
            </TableScroll>

            <MobileCardList className="lg:hidden">
              {invited.map((person) => (
                <MobileCard
                  key={person.id}
                  title={
                    person.profile
                      ? `${person.profile.firstName} ${person.profile.surname[0] ?? ""}.`
                      : person.reference
                  }
                  subtitle={`Joined ${formatBusinessDate(person.createdAt)}`}
                  rows={
                    person.investments.length === 0
                      ? [{ label: "Status", value: "Has not invested yet" }]
                      : person.investments.flatMap((investment) => [
                          {
                            label: investment.packageNameSnapshot,
                            value: INVESTMENT_STATUS_LABEL[investment.status],
                          },
                          {
                            label: "Commission",
                            value: investment.referralEarning
                              ? formatUSD(investment.referralEarning.amount)
                              : "pending maturity",
                          },
                        ])
                  }
                />
              ))}
            </MobileCardList>
          </>
        )}
      </Section>

      <Section title="Get paid">
        <Card className="p-5 sm:p-6">
          <ReferralPayoutForm
            payable={toMoneyString(summary.payable)}
            minimum={summary.minimumPayout}
            belowMinimum={belowMinimum}
            savedAddress={profile?.withdrawalWalletAddress ?? ""}
            savedNetwork={profile?.withdrawalWalletNetwork ?? ""}
          />
        </Card>
      </Section>

      {payouts.length > 0 ? (
        <Section title="Payout history">
          <TableScroll>
            <Table className="min-w-[560px]">
              <THead>
                <tr>
                  <TH>Reference</TH>
                  <TH>Requested</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Amount</TH>
                </tr>
              </THead>
              <TBody>
                {payouts.map((payout) => (
                  <TR key={payout.id}>
                    <TD className="font-mono text-[12px]">{payout.reference}</TD>
                    <TD>{formatBusinessDate(payout.requestedAt)}</TD>
                    <TD>{payout.status}</TD>
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
