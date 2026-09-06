import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Repeat } from "lucide-react";

import { DashboardPage, PageTitle } from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { EmptyState, InfoNote } from "@/components/ui/feedback";
import { requireUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatUSD } from "@/lib/money";
import { formatBusinessDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Rollovers" };

export default async function RolloversPage() {
  const user = await requireUser("/dashboard/rollovers");

  const [rollovers, settings, maturedCount] = await Promise.all([
    prisma.rollover.findMany({
      where: { userId: user.id },
      include: {
        sourceInvestment: { select: { id: true, reference: true, packageNameSnapshot: true } },
        newInvestment: {
          select: { id: true, reference: true, maturityAmount: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    getSettings(),
    prisma.investment.count({ where: { userId: user.id, status: "MATURED" } }),
  ]);

  return (
    <DashboardPage>
      <PageTitle
        title="Rollovers"
        description="A rollover carries the full matured amount into a new subscription."
      />

      <InfoNote className="mb-6">
        {settings["rollover.mode"] === "REQUIRE_PACKAGE_SELECTION"
          ? "Rollovers currently require you to choose a package; its return percentage is applied to your full matured amount."
          : "Rollovers currently keep the return percentage from the matured investment and apply it to the full matured amount."}{" "}
        {settings["rollover.waitsForCycle"]
          ? "A rollover joins the next investment cycle rather than starting immediately."
          : "Rollovers start immediately."}
      </InfoNote>

      {maturedCount > 0 ? (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-[14px] font-medium text-fg">
              You have {maturedCount} matured investment{maturedCount === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-[12.5px] text-fg-muted">
              Open it to choose between withdrawing and rolling over.
            </p>
          </div>
          <Link
            href="/dashboard/investments"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-300 hover:underline"
          >
            View investments
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Card>
      ) : null}

      {rollovers.length === 0 ? (
        <EmptyState
          icon={<Repeat className="size-5" />}
          title="No rollovers yet"
          description="When you roll a matured investment forward, the chain appears here so you can trace it end to end."
        />
      ) : (
        <ul className="space-y-4">
          {rollovers.map((rollover) => (
            <li key={rollover.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-mono text-[11.5px] text-fg-subtle">{rollover.reference}</p>
                  <p className="text-[12px] text-fg-subtle">
                    {formatBusinessDateTime(rollover.createdAt)}
                  </p>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div className="surface-muted p-4">
                    <p className="text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">
                      Matured investment
                    </p>
                    <Link
                      href={`/dashboard/investments/${rollover.sourceInvestmentId}`}
                      className="mt-1.5 block font-mono text-[12px] text-accent-300 hover:underline"
                    >
                      {rollover.sourceInvestment.reference}
                    </Link>
                    <p className="mt-1 text-[13px] text-fg-muted">
                      {rollover.sourceInvestment.packageNameSnapshot}
                    </p>
                    <p className="mt-2 text-[15px] font-semibold text-fg">
                      {formatUSD(rollover.rolledAmount)}
                    </p>
                  </div>

                  <div className="flex items-center justify-center">
                    <span className="grid size-9 place-items-center rounded-full border border-ink-600 bg-ink-850 text-accent-300">
                      <ArrowRight className="size-4" aria-hidden />
                    </span>
                  </div>

                  <div className="surface-muted p-4">
                    <p className="text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">
                      New investment
                    </p>
                    <Link
                      href={`/dashboard/investments/${rollover.newInvestmentId}`}
                      className="mt-1.5 block font-mono text-[12px] text-accent-300 hover:underline"
                    >
                      {rollover.newInvestment.reference}
                    </Link>
                    <p className="mt-1 text-[13px] text-fg-muted">
                      {rollover.appliedPercentage.toDecimalPlaces(2).toString()}% applied
                    </p>
                    <p className="mt-2 text-[15px] font-semibold text-accent-300">
                      {formatUSD(rollover.newInvestment.maturityAmount)}
                    </p>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </DashboardPage>
  );
}
