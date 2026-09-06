import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { Tx } from "@/lib/prisma";
import { requestContext } from "@/lib/request";
import type { SessionUser } from "@/lib/auth/session";

/**
 * Immutable audit trail.
 *
 * Every sensitive action records who did it, what changed, and why. The admin
 * interface exposes read and export only — there is no delete or update path
 * to AuditLog anywhere in the application.
 */

export const AUDIT_ACTION = {
  ADMIN_LOGIN: "admin.login",
  ADMIN_LOGIN_FAILED: "admin.login_failed",
  KYC_APPROVED: "kyc.approved",
  KYC_REJECTED: "kyc.rejected",
  KYC_RESUBMIT_REQUESTED: "kyc.resubmit_requested",
  KYC_DOCUMENT_VIEWED: "kyc.document_viewed",
  PAYMENT_APPROVED: "payment.approved",
  PAYMENT_REJECTED: "payment.rejected",
  PAYMENT_REVIEW_STARTED: "payment.review_started",
  INVESTMENT_ACTIVATED: "investment.activated",
  INVESTMENT_MATURED: "investment.matured",
  INVESTMENT_CORRECTED: "investment.corrected",
  INVESTMENT_CANCELLED: "investment.cancelled",
  CYCLE_CREATED: "cycle.created",
  CYCLE_ACTIVATED_MANUALLY: "cycle.activated_manually",
  CYCLE_COMPLETED: "cycle.completed",
  WITHDRAWAL_APPROVED: "withdrawal.approved",
  WITHDRAWAL_REJECTED: "withdrawal.rejected",
  WITHDRAWAL_PROCESSING: "withdrawal.processing",
  WITHDRAWAL_PAID: "withdrawal.paid",
  ROLLOVER_CREATED: "rollover.created",
  PACKAGE_CREATED: "package.created",
  PACKAGE_UPDATED: "package.updated",
  PACKAGE_DISABLED: "package.disabled",
  WALLET_ADDRESS_UPDATED: "settings.wallet_updated",
  SETTINGS_UPDATED: "settings.updated",
  CONTENT_UPDATED: "content.updated",
  FAQ_UPDATED: "faq.updated",
  USER_SUSPENDED: "user.suspended",
  USER_UNSUSPENDED: "user.unsuspended",
  TICKET_STATUS_CHANGED: "support.status_changed",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

export interface AuditInput {
  actor?: Pick<SessionUser, "id" | "email" | "role"> | null;
  action: AuditAction | string;
  entityType: string;
  entityId?: string | null;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  reason?: string | null;
}

export async function writeAudit(input: AuditInput, client: Tx = prisma): Promise<void> {
  const { ipAddress, userAgent } = await requestContext().catch(() => ({
    ipAddress: null,
    userAgent: null,
  }));

  await client.auditLog.create({
    data: {
      actorId: input.actor?.id ?? null,
      actorEmail: input.actor?.email ?? null,
      actorRole: input.actor?.role ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      oldValue: input.oldValue ?? undefined,
      newValue: input.newValue ?? undefined,
      reason: input.reason ?? null,
      ipAddress,
      userAgent,
    },
  });
}

/**
 * Variant for background jobs (the Friday engine, the maturity sweep) where
 * there is no HTTP request and therefore no actor or client fingerprint.
 */
export async function writeSystemAudit(
  input: Omit<AuditInput, "actor">,
  client: Tx = prisma,
): Promise<void> {
  await client.auditLog.create({
    data: {
      actorId: null,
      actorEmail: "system",
      actorRole: null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      oldValue: input.oldValue ?? undefined,
      newValue: input.newValue ?? undefined,
      reason: input.reason ?? null,
      ipAddress: null,
      userAgent: "monoceros-scheduler",
    },
  });
}

/** Human labels for the audit log table. */
export function auditActionLabel(action: string): string {
  return action
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
