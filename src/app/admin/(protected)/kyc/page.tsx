import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { KycStatus, Prisma } from "@prisma/client";

import { DashboardPage, PageTitle } from "@/components/dashboard/page-parts";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { FilterSelect, Pagination, SearchInput } from "@/components/ui/interactive";
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
import { prisma } from "@/lib/prisma";
import { formatBusinessDateTime, formatShortDate } from "@/lib/time";
import { KYC_STATUS_LABEL, KYC_STATUS_TONE } from "@/lib/domain/investment-status";
import { ID_DOCUMENT_LABELS } from "@/lib/validation/platform";

export const metadata: Metadata = { title: "KYC" };

const PER_PAGE = 20;

const STATUS_OPTIONS = (Object.keys(KYC_STATUS_LABEL) as KycStatus[]).map((value) => ({
  value,
  label: KYC_STATUS_LABEL[value],
}));

export default async function AdminKycPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.KycSubmissionWhereInput = {
    ...(params.status && params.status in KYC_STATUS_LABEL
      ? { status: params.status as KycStatus }
      : {}),
    ...(params.q
      ? {
          OR: [
            { reference: { contains: params.q, mode: "insensitive" } },
            { user: { email: { contains: params.q, mode: "insensitive" } } },
            {
              user: {
                profile: {
                  OR: [
                    { firstName: { contains: params.q, mode: "insensitive" } },
                    { surname: { contains: params.q, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  const [submissions, total, pending] = await Promise.all([
    prisma.kycSubmission.findMany({
      where,
      include: { user: { include: { profile: true } } },
      orderBy: [{ status: "asc" }, { submittedAt: "asc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.kycSubmission.count({ where }),
    prisma.kycSubmission.count({ where: { status: "PENDING" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <DashboardPage className="max-w-7xl">
      <PageTitle
        title="Identity verification"
        description={
          pending > 0
            ? `${pending} submission${pending === 1 ? "" : "s"} awaiting a compliance decision.`
            : "No submissions are waiting for review."
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput placeholder="Search reference, name or email" className="w-full sm:w-80" />
        <FilterSelect paramName="status" label="Status" options={STATUS_OPTIONS} />
      </div>

      {submissions.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="size-5" />}
          title="No submissions found"
          description={
            total === 0
              ? "Verification requests appear here as investors submit them."
              : "No submissions match the current filters."
          }
        />
      ) : (
        <>
          <TableScroll className="hidden lg:block">
            <Table className="min-w-[900px]">
              <THead>
                <tr>
                  <TH>Reference</TH>
                  <TH>Investor</TH>
                  <TH>Email</TH>
                  <TH>Document</TH>
                  <TH>Submitted</TH>
                  <TH>Status</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {submissions.map((submission) => (
                  <TR key={submission.id}>
                    <TD className="font-mono text-[11.5px] text-fg">{submission.reference}</TD>
                    <TD className="text-fg">
                      {submission.user.profile
                        ? `${submission.user.profile.firstName} ${submission.user.profile.surname}`
                        : "—"}
                    </TD>
                    <TD className="break-all">{submission.user.email}</TD>
                    <TD>{ID_DOCUMENT_LABELS[submission.idType] ?? submission.idType}</TD>
                    <TD title={formatBusinessDateTime(submission.submittedAt)}>
                      {formatShortDate(submission.submittedAt)}
                    </TD>
                    <TD>
                      <StatusPill tone={KYC_STATUS_TONE[submission.status]}>
                        {KYC_STATUS_LABEL[submission.status]}
                      </StatusPill>
                    </TD>
                    <TD className="text-right">
                      <Link
                        href={`/admin/kyc/${submission.id}`}
                        className="text-[12.5px] font-medium text-accent-300 hover:underline"
                      >
                        Review
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableScroll>

          <MobileCardList className="lg:hidden">
            {submissions.map((submission) => (
              <MobileCard
                key={submission.id}
                title={
                  submission.user.profile
                    ? `${submission.user.profile.firstName} ${submission.user.profile.surname}`
                    : submission.user.email
                }
                subtitle={submission.reference}
                right={
                  <StatusPill tone={KYC_STATUS_TONE[submission.status]}>
                    {KYC_STATUS_LABEL[submission.status]}
                  </StatusPill>
                }
                rows={[
                  {
                    label: "Document",
                    value: ID_DOCUMENT_LABELS[submission.idType] ?? submission.idType,
                  },
                  { label: "Submitted", value: formatShortDate(submission.submittedAt) },
                ]}
                footer={
                  <Link
                    href={`/admin/kyc/${submission.id}`}
                    className="text-[13px] font-medium text-accent-300"
                  >
                    Review submission →
                  </Link>
                }
              />
            ))}
          </MobileCardList>

          <Pagination page={page} totalPages={totalPages} />
        </>
      )}
    </DashboardPage>
  );
}
