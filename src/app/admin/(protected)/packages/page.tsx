import type { Metadata } from "next";
import Link from "next/link";
import { LayoutGrid, Plus } from "lucide-react";

import { DashboardPage, PageTitle } from "@/components/dashboard/page-parts";
import { StatusPill } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
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
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import { togglePackageAction } from "@/server/actions/admin";

export const metadata: Metadata = { title: "Packages" };

export default async function AdminPackagesPage() {
  const packages = await prisma.package.findMany({
    orderBy: [{ displayOrder: "asc" }, { minimumCapital: "asc" }],
    include: { _count: { select: { investments: true } } },
  });

  return (
    <DashboardPage className="max-w-6xl">
      <PageTitle
        title="Investment packages"
        description="Create and edit the packages investors can subscribe to."
        actions={
          <ButtonLink href="/admin/packages/new" size="sm">
            <Plus />
            New package
          </ButtonLink>
        }
      />

      <InfoNote className="mb-5">
        Existing investments are never affected by an edit here. Each investment stores its own
        capital, return percentage, maturity amount and term from the moment of subscription.
      </InfoNote>

      {packages.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid className="size-5" />}
          title="No packages yet"
          description="Create your first package so investors have something to subscribe to."
          actionLabel="Create a package"
          actionHref="/admin/packages/new"
        />
      ) : (
        <TableScroll>
          <Table className="min-w-[900px]">
            <THead>
              <tr>
                <TH>Order</TH>
                <TH>Name</TH>
                <TH>Slug</TH>
                <TH className="text-right">Capital</TH>
                <TH className="text-right">Return</TH>
                <TH className="text-right">Maturity</TH>
                <TH className="text-right">Term</TH>
                <TH className="text-right">Investments</TH>
                <TH>Status</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {packages.map((pkg) => (
                <TR key={pkg.id}>
                  <TD className="tabular-nums">{pkg.displayOrder}</TD>
                  <TD className="text-fg">
                    {pkg.name}
                    {pkg.badge ? (
                      <span className="ml-2 rounded-full bg-gold-600/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-300">
                        {pkg.badge}
                      </span>
                    ) : null}
                  </TD>
                  <TD className="font-mono text-[11.5px]">{pkg.slug}</TD>
                  <TD className="text-right tabular-nums text-fg">
                    {formatUSD(pkg.minimumCapital)}
                  </TD>
                  <TD className="text-right tabular-nums">
                    {pkg.returnPercentage.toDecimalPlaces(2).toString()}%
                  </TD>
                  <TD className="text-right tabular-nums text-accent-300">
                    {formatUSD(pkg.maturityAmount)}
                  </TD>
                  <TD className="text-right tabular-nums">{pkg.durationDays}d</TD>
                  <TD className="text-right tabular-nums">{pkg._count.investments}</TD>
                  <TD>
                    <StatusPill tone={pkg.isActive ? "active" : "neutral"}>
                      {pkg.isActive ? "Active" : "Disabled"}
                    </StatusPill>
                  </TD>
                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/packages/${pkg.id}`}
                        className="text-[12.5px] font-medium text-accent-300 hover:underline"
                      >
                        Edit
                      </Link>
                      <form action={togglePackageAction}>
                        <input type="hidden" name="packageId" value={pkg.id} />
                        <button
                          type="submit"
                          className="text-[12.5px] text-fg-subtle transition-colors hover:text-fg"
                        >
                          {pkg.isActive ? "Disable" : "Enable"}
                        </button>
                      </form>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableScroll>
      )}
    </DashboardPage>
  );
}
