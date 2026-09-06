import "server-only";

import type { IdDocumentType, KycStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { nextReference } from "@/lib/references";
import { getSettings } from "@/lib/settings";
import { notify, notifications, notifyStaff } from "@/lib/notifications";
import { writeAudit, AUDIT_ACTION } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth/session";
import { sendKycApprovedEmail, sendKycRejectedEmail, sendKycSubmittedEmail } from "@/lib/email";
import { buildDocumentKey, sniffMime, storage } from "@/lib/storage";
import { BusinessRuleError } from "@/lib/errors";

/**
 * Identity verification.
 *
 * Documents are written to private storage and referenced only by an opaque
 * key. Nothing in this module ever returns a document body — reading one goes
 * through the signed, role-checked /api/documents route, which also audits the
 * access.
 */

export interface KycSubmissionInput {
  userId: string;
  nin: string;
  idType: IdDocumentType;
  idNumber?: string;
  document: File;
}

export async function submitKyc(input: KycSubmissionInput): Promise<{ reference: string }> {
  const settings = await getSettings();

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    include: { profile: true },
  });
  if (!user) throw new BusinessRuleError("Account not found.");

  if (user.kycStatus === "APPROVED") {
    throw new BusinessRuleError("Your identity has already been verified.");
  }
  if (user.kycStatus === "PENDING") {
    throw new BusinessRuleError("A verification request is already under review.");
  }

  const allowed = settings["kyc.allowedIdTypes"];
  if (!allowed.includes(input.idType)) {
    throw new BusinessRuleError("That document type is not currently accepted.");
  }

  if (!input.document || input.document.size === 0) {
    throw new BusinessRuleError("Attach a photograph or scan of your identity document.");
  }

  const maxBytes = settings["kyc.maxUploadMb"] * 1024 * 1024;
  if (input.document.size > maxBytes) {
    throw new BusinessRuleError(
      `Your document must be ${settings["kyc.maxUploadMb"]}MB or smaller.`,
    );
  }

  const buffer = Buffer.from(await input.document.arrayBuffer());

  // The declared MIME type is never trusted — the file's own bytes decide.
  const mime = sniffMime(buffer);
  if (!mime) {
    throw new BusinessRuleError("Your document must be a JPG, PNG or PDF file.");
  }

  const documentKey = buildDocumentKey("kyc", input.userId, mime);
  await storage().put(documentKey, buffer, mime);

  const reference = await prisma.$transaction(async (tx) => {
    const ref = await nextReference("kyc", tx);

    await tx.kycSubmission.create({
      data: {
        reference: ref,
        userId: input.userId,
        nin: input.nin,
        idType: input.idType,
        idNumber: input.idNumber || null,
        documentKey,
        documentMime: mime,
        documentSize: buffer.byteLength,
        status: "PENDING",
      },
    });

    await tx.user.update({
      where: { id: input.userId },
      data: { kycStatus: "PENDING" },
    });

    await notify(notifications.kycSubmitted(input.userId, ref), tx);
    await notifyStaff(
      {
        title: "Identity verification awaiting review",
        message: `${ref} was submitted and needs a compliance decision.`,
        type: "WARNING",
        link: "/admin/kyc",
      },
      tx,
    );

    return ref;
  });

  await sendKycSubmittedEmail(user.email, reference);

  return { reference };
}

export type KycDecision = "APPROVE" | "REJECT" | "REQUEST_RESUBMISSION";

const DECISION_TO_STATUS: Record<KycDecision, KycStatus> = {
  APPROVE: "APPROVED",
  REJECT: "REJECTED",
  REQUEST_RESUBMISSION: "RESUBMIT_REQUESTED",
};

const DECISION_TO_AUDIT: Record<KycDecision, string> = {
  APPROVE: AUDIT_ACTION.KYC_APPROVED,
  REJECT: AUDIT_ACTION.KYC_REJECTED,
  REQUEST_RESUBMISSION: AUDIT_ACTION.KYC_RESUBMIT_REQUESTED,
};

export async function reviewKyc(
  submissionId: string,
  decision: KycDecision,
  reason: string | undefined,
  admin: SessionUser,
): Promise<{ reference: string }> {
  const submission = await prisma.kycSubmission.findUnique({
    where: { id: submissionId },
    include: { user: { include: { profile: true } } },
  });

  if (!submission) throw new BusinessRuleError("Verification request not found.");
  if (submission.status !== "PENDING") {
    throw new BusinessRuleError("This verification request has already been decided.");
  }
  if (decision !== "APPROVE" && !reason) {
    throw new BusinessRuleError("A reason is required for this decision.");
  }

  const status = DECISION_TO_STATUS[decision];
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.kycSubmission.update({
      where: { id: submission.id },
      data: {
        status,
        rejectionReason: decision === "APPROVE" ? null : (reason ?? null),
        reviewedById: admin.id,
        reviewedAt: now,
      },
    });

    await tx.user.update({
      where: { id: submission.userId },
      data: { kycStatus: status },
    });

    await notify(
      decision === "APPROVE"
        ? notifications.kycApproved(submission.userId)
        : notifications.kycRejected(submission.userId, reason ?? "Additional information required."),
      tx,
    );

    await writeAudit(
      {
        actor: admin,
        action: DECISION_TO_AUDIT[decision],
        entityType: "KycSubmission",
        entityId: submission.id,
        oldValue: { status: submission.status },
        newValue: { status },
        reason: reason ?? null,
      },
      tx,
    );
  });

  if (decision === "APPROVE") {
    await sendKycApprovedEmail(
      submission.user.email,
      submission.user.profile?.firstName ?? "there",
    );
  } else {
    await sendKycRejectedEmail(
      submission.user.email,
      reason ?? "Additional information required.",
      decision === "REQUEST_RESUBMISSION",
    );
  }

  return { reference: submission.reference };
}

export async function getLatestKycSubmission(userId: string) {
  return prisma.kycSubmission.findFirst({
    where: { userId },
    orderBy: { submittedAt: "desc" },
  });
}

export async function getPendingKycCount(): Promise<number> {
  return prisma.kycSubmission.count({ where: { status: "PENDING" } });
}
