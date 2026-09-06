import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Repeat } from "lucide-react";

import { DashboardPage, PageTitle } from "@/components/dashboard/page-parts";
import { EmptyState, InfoNote } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/interactive";
import {
  Table,
  TableScroll,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatUSD } from "@/lib/money";
import { formatShortDate } from "@/lib/time";

export const metadata: Metadata = { title: "Rollovers" };

const PER_PAGE = 20;

export default async function AdminRolloversPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [rollovers, total, settings] = await Promise.all([
    prisma.rollover.findMany({
      include: {
        user: { include: { profile: true } },
        sourceInvestment: { select: { id: true, reference: true, packageNameSnapshot: true } },
        newInvestment: {
          select: { id: true, reference: true, maturityAmount: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.rollover.count(),
    getSettings(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <DashboardPage className="max-w-7xl">
      <PageTitle
        title="Rollovers"
        description="Chains where a matured investment was carried forward into a new subscription."
      />

      <InfoNote className="mb-5">
        Current rule:{" "}
        <strong className="font-semibold">
          {settings["rollover.mode"] === "REQUIRE_PACKAGE_SELECTION"
            ? "the investor selects a package and its percentage is applied to the full matured amount"
            : "the matured investment's own percentage is applied to the full matured amount"}
        </strong>
        , and a rollover{" "}
        {settings["rollover.waitsForCycle"]
          ? "waits for the next investment cycle"
          : "activates immediately"}
        . Change this under Settings → Investments.
      </InfoNote>

      {rollovers.length === 0 ? (
        <EmptyState
          icon={<Repeat className="size-5" />}
          title="No rollovers yet"
          description="They appear here when investors roll a matured investment forward."
        />
      ) : (
        <>
          <TableScroll>
            <Table className="min-w-[940px]">
              <THead>
                <tr>
                  <TH>Reference</TH>
                  <TH>Investor</TH>
                  <TH>From</TH>
                  <TH className="text-right">Rolled amount</TH>
                  <TH className="text-right">Applied %</TH>
                  <TH>To</TH>
                  <TH className="text-right">New maturity</TH>
                  <TH>Created</TH>
                </tr>
              </THead>
              <TBody>
                {rollovers.map((rollover) => (
                  <TR key={rollover.id}>
                    <TD className="font-mono text-[11.5px] text-fg">{rollover.reference}</TD>
                    <TD className="text-fg">
                      <Link
                        href={`/admin/users/${rollover.userId}`}
                        className="hover:text-accent-300"
                      >
                        {rollover.user.profile
                          ? `${rollover.user.profile.firstName} ${rollover.user.profile.surname}`
                          : rollover.user.email}
                      </Link>
                    </TD>
                    <TD>
                      <Link
                        href={`/admin/investments/${rollover.sourceInvestmentId}`}
                        className="font-mono text-[11px] text-accent-300 hover:underline"
                      >
                        {rollover.sourceInvestment.reference}
                      </Link>
                    </TD>
                    <TD className="text-right tabular-nums text-fg">
                      {formatUSD(rollover.rolledAmount)}
                    </TD>
                    <TD className="text-right tabular-nums">
                      {rollover.appliedPercentage.toDecimalPlaces(2).toString()}%
                    </TD>
                    <TD>
                      <span className="inline-flex items-center gap-1.5">
                        <ArrowRight className="size-3 text-fg-subtle" aria-hidden />
                        <Link
                          href={`/admin/investments/${rollover.newInvestmentId}`}
                          className="font-mono text-[11px] text-accent-300 hover:underline"
                        >
                          {rollover.newInvestment.reference}
                        </Link>
                      </span>
                    </TD>
                    <TD className="text-right tabular-nums text-accent-300">
                      {formatUSD(rollover.newInvestment.maturityAmount)}
                    </TD>
                    <TD>{formatShortDate(rollover.createdAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableScroll>

          <Pagination page={page} totalPages={totalPages} />
        </>
      )}
    </DashboardPage>
  );
}
