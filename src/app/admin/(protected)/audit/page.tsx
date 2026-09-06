import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { DashboardPage, PageTitle } from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { EmptyState, InfoNote } from "@/components/ui/feedback";
import { FilterSelect, Pagination, SearchInput } from "@/components/ui/interactive";
import { prisma } from "@/lib/prisma";
import { auditActionLabel, AUDIT_ACTION } from "@/lib/audit";
import { formatBusinessDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Audit log" };

const PER_PAGE = 30;

function JsonBlock({ label, value }: { label: string; value: Prisma.JsonValue | null }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">{label}</p>
      <pre className="mt-1 overflow-x-auto rounded-lg border border-ink-700 bg-ink-900/70 p-2.5 font-mono text-[11px] leading-relaxed text-fg-muted">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.AuditLogWhereInput = {
    ...(params.action ? { action: params.action } : {}),
    ...(params.q
      ? {
          OR: [
            { actorEmail: { contains: params.q, mode: "insensitive" } },
            { entityId: { contains: params.q, mode: "insensitive" } },
            { entityType: { contains: params.q, mode: "insensitive" } },
            { reason: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [records, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <DashboardPage className="max-w-5xl">
      <PageTitle
        title="Audit log"
        description={`${total} recorded actions. This log is append-only — there is no delete or edit path in the interface.`}
      />

      <InfoNote className="mb-5">
        Every sensitive action is here: administrator sign-ins, KYC decisions, payment approvals and
        rejections, investment activations, withdrawal settlements, package edits, wallet address
        changes, account suspensions and settings changes.
      </InfoNote>

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput placeholder="Search actor, entity or reason" className="w-full sm:w-96" />
        <FilterSelect
          paramName="action"
          label="Action"
          options={Object.values(AUDIT_ACTION).map((value) => ({
            value,
            label: auditActionLabel(value),
          }))}
        />
      </div>

      {records.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="size-5" />}
          title="No audit records found"
          description="Records are written automatically as administrative actions occur."
        />
      ) : (
        <>
          <ul className="space-y-3">
            {records.map((record) => (
              <li key={record.id}>
                <Card className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-fg">
                        {auditActionLabel(record.action)}
                      </p>
                      <p className="mt-1 text-[12px] text-fg-muted">
                        {record.entityType}
                        {record.entityId ? (
                          <span className="font-mono text-[11px]"> · {record.entityId}</span>
                        ) : null}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] text-fg">{record.actorEmail ?? "system"}</p>
                      <p className="mt-0.5 text-[11px] text-fg-subtle">
                        {formatBusinessDateTime(record.createdAt)}
                      </p>
                    </div>
                  </div>

                  {record.reason ? (
                    <p className="mt-3 rounded-lg border border-ink-700 bg-ink-880/50 px-3 py-2 text-[12px] leading-relaxed text-fg-muted">
                      {record.reason}
                    </p>
                  ) : null}

                  {record.oldValue || record.newValue ? (
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                      <JsonBlock label="Before" value={record.oldValue} />
                      <JsonBlock label="After" value={record.newValue} />
                    </div>
                  ) : null}

                  {record.ipAddress || record.userAgent ? (
                    <p className="mt-3 truncate text-[11px] text-fg-subtle">
                      {record.ipAddress ?? "no IP"} · {record.userAgent ?? "no user agent"}
                    </p>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>

          <Pagination page={page} totalPages={totalPages} />
        </>
      )}
    </DashboardPage>
  );
}
