import * as React from "react";

import { AdminShell } from "@/components/admin/shell";
import { requireAdminPage } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminPage("/admin");

  const [kyc, payments, withdrawals, tickets] = await Promise.all([
    prisma.kycSubmission.count({ where: { status: "PENDING" } }),
    prisma.payment.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.withdrawal.count({
      where: { status: { in: ["PENDING", "UNDER_REVIEW", "APPROVED", "PROCESSING"] } },
    }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
  ]);

  return (
    <AdminShell user={user} counts={{ kyc, payments, withdrawals, tickets }}>
      {children}
    </AdminShell>
  );
}
