"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { assertAdmin, assertStaff } from "@/lib/auth/rbac";
import { revokeAllSessions } from "@/lib/auth/session";
import { writeAudit, AUDIT_ACTION } from "@/lib/audit";
import { notify, notifyStaff } from "@/lib/notifications";
import { applyReturn, money } from "@/lib/money";
import { slugify } from "@/lib/utils";
import {
  SETTING_DEFAULTS,
  SETTING_KEYS,
  SETTING_META,
  setSetting,
  type SettingKey,
} from "@/lib/settings";
import {
  contentBlockSchema,
  faqSchema,
  investmentCorrectionSchema,
  kycReviewSchema,
  manualCycleSchema,
  packageSchema,
  paymentReviewSchema,
  userStatusSchema,
  withdrawalDecisionSchema,
} from "@/lib/validation/platform";
import { reviewKyc } from "@/server/services/kyc";
import { approvePayment, markPaymentUnderReview, rejectPayment } from "@/server/services/payments";
import { decideWithdrawal } from "@/server/services/withdrawals";
import { activateDueInvestments } from "@/server/services/investments";
import { ensureCycle } from "@/server/services/cycles";
import {
  errorState,
  isFrameworkError,
  parseForm,
  successState,
  toErrorState,
  type ActionState,
} from "@/server/actions/types";

/**
 * Administrative actions.
 *
 * Each one re-checks the caller's role on the server and writes an audit
 * record. UI that hides a button is a convenience, never the control.
 */

// ---------------------------------------------------------------------------
// KYC
// ---------------------------------------------------------------------------

export async function reviewKycAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(kycReviewSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const admin = await assertStaff();
    const { reference } = await reviewKyc(
      parsed.data.submissionId,
      parsed.data.decision,
      parsed.data.reason || undefined,
      admin,
    );

    revalidatePath("/admin/kyc");
    revalidatePath(`/admin/kyc/${parsed.data.submissionId}`);
    return successState(`${reference} has been updated.`);
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function startPaymentReviewAction(formData: FormData): Promise<void> {
  const admin = await assertStaff();
  const paymentId = String(formData.get("paymentId") ?? "");
  if (paymentId) await markPaymentUnderReview(paymentId, admin);
  revalidatePath(`/admin/payments/${paymentId}`);
}

export async function reviewPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(paymentReviewSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const admin = await assertAdmin();

    const result =
      parsed.data.decision === "APPROVE"
        ? await approvePayment(parsed.data.paymentId, admin)
        : await rejectPayment(parsed.data.paymentId, parsed.data.reason ?? "", admin);

    revalidatePath("/admin/payments");
    revalidatePath(`/admin/payments/${parsed.data.paymentId}`);
    revalidatePath("/admin/cycles");

    return successState(
      parsed.data.decision === "APPROVE"
        ? `${result.reference} approved and queued for the next cycle.`
        : `${result.reference} rejected. The investor has been notified.`,
    );
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}

// ---------------------------------------------------------------------------
// Withdrawals
// ---------------------------------------------------------------------------

export async function decideWithdrawalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(withdrawalDecisionSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const admin = await assertAdmin();

    const { reference } = await decideWithdrawal(
      {
        withdrawalId: parsed.data.withdrawalId,
        decision: parsed.data.decision,
        reason: parsed.data.reason || undefined,
        paymentTxid: parsed.data.paymentTxid || undefined,
        notes: parsed.data.notes || undefined,
      },
      admin,
    );

    revalidatePath("/admin/withdrawals");
    return successState(`${reference} updated.`);
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}

// ---------------------------------------------------------------------------
// Packages
// ---------------------------------------------------------------------------

export async function savePackageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(packageSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const admin = await assertAdmin();

    const minimumCapital = money(parsed.data.minimumCapital);
    const returnPercentage = money(parsed.data.returnPercentage);
    const maturityAmount = applyReturn(minimumCapital, returnPercentage);
    const slug = slugify(parsed.data.slug);

    const data = {
      name: parsed.data.name,
      slug,
      minimumCapital,
      returnPercentage,
      maturityAmount,
      durationDays: parsed.data.durationDays,
      description: parsed.data.description,
      badge: parsed.data.badge || null,
      displayOrder: parsed.data.displayOrder,
      isActive: Boolean(parsed.data.isActive),
    };

    if (parsed.data.id) {
      const existing = await prisma.package.findUnique({ where: { id: parsed.data.id } });
      if (!existing) return errorState("That package no longer exists.");

      await prisma.package.update({ where: { id: parsed.data.id }, data });

      await writeAudit({
        actor: admin,
        action: AUDIT_ACTION.PACKAGE_UPDATED,
        entityType: "Package",
        entityId: existing.id,
        oldValue: {
          name: existing.name,
          minimumCapital: existing.minimumCapital.toString(),
          returnPercentage: existing.returnPercentage.toString(),
          maturityAmount: existing.maturityAmount.toString(),
          durationDays: existing.durationDays,
          isActive: existing.isActive,
        },
        newValue: {
          name: data.name,
          minimumCapital: data.minimumCapital.toString(),
          returnPercentage: data.returnPercentage.toString(),
          maturityAmount: data.maturityAmount.toString(),
          durationDays: data.durationDays,
          isActive: data.isActive,
        },
        reason: "Existing investments keep their snapshotted terms.",
      });
    } else {
      const created = await prisma.package.create({ data });
      await writeAudit({
        actor: admin,
        action: AUDIT_ACTION.PACKAGE_CREATED,
        entityType: "Package",
        entityId: created.id,
        newValue: { name: data.name, slug: data.slug },
      });
    }
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }

  revalidatePath("/admin/packages");
  revalidatePath("/packages");
  redirect("/admin/packages?saved=1");
}

export async function togglePackageAction(formData: FormData): Promise<void> {
  const admin = await assertAdmin();
  const id = String(formData.get("packageId") ?? "");
  if (!id) return;

  const existing = await prisma.package.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.package.update({ where: { id }, data: { isActive: !existing.isActive } });

  await writeAudit({
    actor: admin,
    action: existing.isActive ? AUDIT_ACTION.PACKAGE_DISABLED : AUDIT_ACTION.PACKAGE_UPDATED,
    entityType: "Package",
    entityId: id,
    oldValue: { isActive: existing.isActive },
    newValue: { isActive: !existing.isActive },
  });

  revalidatePath("/admin/packages");
  revalidatePath("/packages");
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function setUserStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(userStatusSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const admin = await assertAdmin();

    const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
    if (!target) return errorState("That account no longer exists.");
    if (target.id === admin.id) return errorState("You cannot change your own account status.");

    const suspend = parsed.data.action === "SUSPEND";

    await prisma.user.update({
      where: { id: target.id },
      data: { status: suspend ? "SUSPENDED" : "ACTIVE" },
    });

    if (suspend) await revokeAllSessions(target.id);

    await writeAudit({
      actor: admin,
      action: suspend ? AUDIT_ACTION.USER_SUSPENDED : AUDIT_ACTION.USER_UNSUSPENDED,
      entityType: "User",
      entityId: target.id,
      oldValue: { status: target.status },
      newValue: { status: suspend ? "SUSPENDED" : "ACTIVE" },
      reason: parsed.data.reason,
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${target.id}`);

    return successState(suspend ? "Account suspended." : "Account reinstated.");
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}

// ---------------------------------------------------------------------------
// Investments (annotation only — values are never silently edited)
// ---------------------------------------------------------------------------

export async function annotateInvestmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(investmentCorrectionSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const admin = await assertAdmin();

    const investment = await prisma.investment.findUnique({
      where: { id: parsed.data.investmentId },
    });
    if (!investment) return errorState("That investment no longer exists.");

    await prisma.investment.update({
      where: { id: investment.id },
      data: { adminNote: parsed.data.note },
    });

    await writeAudit({
      actor: admin,
      action: AUDIT_ACTION.INVESTMENT_CORRECTED,
      entityType: "Investment",
      entityId: investment.id,
      oldValue: { adminNote: investment.adminNote },
      newValue: { adminNote: parsed.data.note },
      reason: parsed.data.reason,
    });

    revalidatePath(`/admin/investments/${investment.id}`);
    return successState("Note recorded against the investment and written to the audit log.");
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}

// ---------------------------------------------------------------------------
// Cycles
// ---------------------------------------------------------------------------

/**
 * Emergency manual activation. The scheduler normally does this; running it by
 * hand is confirmed in the UI and always audited.
 */
export async function runCycleActivationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(manualCycleSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const admin = await assertAdmin();

    const cycle = await prisma.investmentCycle.findUnique({
      where: { id: parsed.data.cycleId },
    });
    if (!cycle) return errorState("That cycle no longer exists.");
    if (cycle.cycleStart.getTime() > Date.now()) {
      return errorState(
        "This cycle has not reached its opening time yet. Activation only runs on or after the boundary.",
      );
    }

    const report = await activateDueInvestments(new Date());

    await writeAudit({
      actor: admin,
      action: AUDIT_ACTION.CYCLE_ACTIVATED_MANUALLY,
      entityType: "InvestmentCycle",
      entityId: cycle.id,
      newValue: {
        investmentsActivated: report.investmentsActivated,
        references: report.references,
      },
      reason: parsed.data.reason,
    });

    revalidatePath("/admin/cycles");
    revalidatePath("/admin/investments");

    return successState(
      report.investmentsActivated === 0
        ? "No queued investments were due for activation."
        : `Activated ${report.investmentsActivated} investment(s).`,
    );
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}

export async function ensureUpcomingCycleAction(): Promise<ActionState> {
  try {
    const admin = await assertAdmin();
    const { upcomingCycleStart } = await import("@/server/services/cycles");
    const start = await upcomingCycleStart();
    const cycle = await ensureCycle(start);

    await writeAudit({
      actor: admin,
      action: AUDIT_ACTION.CYCLE_CREATED,
      entityType: "InvestmentCycle",
      entityId: cycle.id,
      newValue: { cycleStart: cycle.cycleStart.toISOString() },
    });

    revalidatePath("/admin/cycles");
    return successState(`Cycle ${cycle.reference} is ready.`);
  } catch (error) {
    return toErrorState(error);
  }
}

// ---------------------------------------------------------------------------
// FAQ and content
// ---------------------------------------------------------------------------

export async function saveFaqAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(faqSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const admin = await assertStaff();

    const data = {
      question: parsed.data.question,
      answer: parsed.data.answer,
      category: parsed.data.category,
      displayOrder: parsed.data.displayOrder,
      isActive: Boolean(parsed.data.isActive),
    };

    const record = parsed.data.id
      ? await prisma.faq.update({ where: { id: parsed.data.id }, data })
      : await prisma.faq.create({ data });

    await writeAudit({
      actor: admin,
      action: AUDIT_ACTION.FAQ_UPDATED,
      entityType: "Faq",
      entityId: record.id,
      newValue: { question: data.question, isActive: data.isActive },
    });

    revalidatePath("/admin/faq");
    revalidatePath("/faq");
    return successState("FAQ saved.");
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}

export async function deleteFaqAction(formData: FormData): Promise<void> {
  const admin = await assertAdmin();
  const id = String(formData.get("faqId") ?? "");
  if (!id) return;

  const existing = await prisma.faq.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.faq.delete({ where: { id } });

  await writeAudit({
    actor: admin,
    action: AUDIT_ACTION.FAQ_UPDATED,
    entityType: "Faq",
    entityId: id,
    oldValue: { question: existing.question },
    reason: "Deleted",
  });

  revalidatePath("/admin/faq");
  revalidatePath("/faq");
}

export async function saveContentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(contentBlockSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const admin = await assertStaff();

    const existing = await prisma.contentBlock.findUnique({ where: { slug: parsed.data.slug } });

    await prisma.contentBlock.upsert({
      where: { slug: parsed.data.slug },
      create: {
        slug: parsed.data.slug,
        title: parsed.data.title,
        body: parsed.data.body,
      },
      update: { title: parsed.data.title, body: parsed.data.body },
    });

    await writeAudit({
      actor: admin,
      action: AUDIT_ACTION.CONTENT_UPDATED,
      entityType: "ContentBlock",
      entityId: parsed.data.slug,
      oldValue: existing ? { title: existing.title } : undefined,
      newValue: { title: parsed.data.title },
    });

    revalidatePath("/admin/content");
    revalidatePath(`/${parsed.data.slug}`);
    revalidatePath("/about");
    return successState("Content saved and published.");
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/** Coerces a submitted form value into the shape the setting expects. */
function coerceSettingValue(key: SettingKey, raw: FormDataEntryValue | null): unknown {
  const fallback = SETTING_DEFAULTS[key];

  if (typeof fallback === "boolean") return raw === "on" || raw === "true";
  if (typeof fallback === "number") {
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  }
  if (Array.isArray(fallback)) {
    return String(raw ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return String(raw ?? "");
}

const settingsGroupSchema = z.object({ group: z.string().min(1).max(40) });

export async function saveSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsedGroup = settingsGroupSchema.safeParse({ group: formData.get("group") });
  if (!parsedGroup.success) return errorState("Unknown settings group.");

  try {
    const admin = await assertAdmin();
    const group = parsedGroup.data.group;

    const keys = SETTING_KEYS.filter((key) => SETTING_META[key].group === group);
    const changes: Record<string, unknown> = {};

    for (const key of keys) {
      // Unchecked checkboxes are absent from FormData; that is a valid "false".
      const raw = formData.get(key);
      const value = coerceSettingValue(key, raw);
      changes[key] = value;
      await setSetting(key, value as never, admin.id);
    }

    await writeAudit({
      actor: admin,
      action: AUDIT_ACTION.SETTINGS_UPDATED,
      entityType: "SiteSetting",
      entityId: group,
      newValue: changes as never,
    });

    if (group === "payments") {
      await writeAudit({
        actor: admin,
        action: AUDIT_ACTION.WALLET_ADDRESS_UPDATED,
        entityType: "SiteSetting",
        entityId: "payment.walletAddress",
        newValue: {
          network: changes["payment.network"] as string,
          walletAddress: changes["payment.walletAddress"] as string,
        },
      });
      await notifyStaff({
        title: "Payment settings changed",
        message: "The company wallet address or network was updated. Verify it before approving payments.",
        type: "WARNING",
        link: "/admin/settings",
      });
    }

    revalidatePath("/admin/settings");
    revalidatePath("/", "layout");
    return successState("Settings saved.");
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}

// ---------------------------------------------------------------------------
// Broadcast
// ---------------------------------------------------------------------------

const broadcastSchema = z.object({
  title: z.string().trim().min(3).max(120),
  message: z.string().trim().min(3).max(1000),
  audience: z.enum(["ALL", "VERIFIED", "ACTIVE_INVESTORS"]),
});

export async function broadcastNotificationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(broadcastSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const admin = await assertAdmin();

    const where =
      parsed.data.audience === "VERIFIED"
        ? { role: "USER" as const, status: "ACTIVE" as const, kycStatus: "APPROVED" as const }
        : parsed.data.audience === "ACTIVE_INVESTORS"
          ? {
              role: "USER" as const,
              status: "ACTIVE" as const,
              investments: { some: { status: "ACTIVE" as const } },
            }
          : { role: "USER" as const, status: "ACTIVE" as const };

    const recipients = await prisma.user.findMany({ where, select: { id: true } });

    for (const recipient of recipients) {
      await notify({
        userId: recipient.id,
        title: parsed.data.title,
        message: parsed.data.message,
        type: "INFO",
      });
    }

    await writeAudit({
      actor: admin,
      action: "notification.broadcast",
      entityType: "Notification",
      newValue: {
        audience: parsed.data.audience,
        recipients: recipients.length,
        title: parsed.data.title,
      },
    });

    revalidatePath("/admin/notifications");
    return successState(
      `Sent to ${recipients.length} account${recipients.length === 1 ? "" : "s"}.`,
    );
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}
