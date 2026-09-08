import "server-only";

import type { NotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { Tx } from "@/lib/prisma";
import { SETTING_DEFAULTS } from "@/lib/settings-registry";

/**
 * In-app notification service.
 *
 * Every notification the specification lists has a factory here, so wording is
 * consistent and call sites cannot invent ad-hoc copy.
 */

export interface NotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}

/**
 * Reads the dashboard-notification switch on the caller's own client.
 *
 * Deliberately not `getSettings()`. `notify` is nearly always called inside an
 * interactive transaction, and `getSettings()` runs on the global client — so
 * it acquires a *second* pooled connection while the transaction still holds
 * one. Against a managed Postgres that is a full extra round trip (and a cold
 * connection at that) inside every write transaction, which is enough on its
 * own to exceed Prisma's interactive transaction timeout. It also risks a
 * deadlock once the pool is saturated. Using the caller's client keeps the
 * whole transaction on one connection, and reads one indexed row rather than
 * the entire settings table.
 */
async function dashboardNotificationsEnabled(client: Tx): Promise<boolean> {
  const row = await client.siteSetting.findUnique({
    where: { key: "notify.dashboardEnabled" },
    select: { value: true },
  });

  if (!row) return SETTING_DEFAULTS["notify.dashboardEnabled"];
  return row.value === true;
}

export async function notify(input: NotificationInput, client: Tx = prisma): Promise<void> {
  if (!(await dashboardNotificationsEnabled(client))) return;

  await client.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type ?? "INFO",
      link: input.link ?? null,
    },
  });
}

/** Fan-out to every staff account — used for "a payment needs review" alerts. */
export async function notifyStaff(
  input: Omit<NotificationInput, "userId">,
  client: Tx = prisma,
): Promise<void> {
  const staff = await client.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN", "SUPPORT"] }, status: "ACTIVE" },
    select: { id: true },
  });

  if (staff.length === 0) return;

  await client.notification.createMany({
    data: staff.map((s) => ({
      userId: s.id,
      title: input.title,
      message: input.message,
      type: input.type ?? "INFO",
      link: input.link ?? null,
    })),
  });
}

export const notifications = {
  registered: (userId: string) => ({
    userId,
    title: "Welcome to Monoceros",
    message: "Your account has been created. Confirm your email address to continue.",
    type: "SUCCESS" as const,
    link: "/dashboard",
  }),
  emailVerified: (userId: string) => ({
    userId,
    title: "Email confirmed",
    message: "Your email address has been confirmed. Next, complete identity verification.",
    type: "SUCCESS" as const,
    link: "/dashboard/verification",
  }),
  kycSubmitted: (userId: string, reference: string) => ({
    userId,
    title: "Verification submitted",
    message: `Your identity documents (${reference}) are queued for review.`,
    type: "INFO" as const,
    link: "/dashboard/verification",
  }),
  kycApproved: (userId: string) => ({
    userId,
    title: "Identity verified",
    message: "Your identity has been verified. You can now subscribe to an investment package.",
    type: "SUCCESS" as const,
    link: "/dashboard/packages",
  }),
  kycRejected: (userId: string, reason: string) => ({
    userId,
    title: "Verification needs attention",
    message: reason,
    type: "ERROR" as const,
    link: "/dashboard/verification",
  }),
  paymentSubmitted: (userId: string, reference: string) => ({
    userId,
    title: "Payment submitted",
    message: `Payment ${reference} is awaiting verification by the finance team.`,
    type: "INFO" as const,
    link: "/dashboard/payments",
  }),
  paymentApproved: (userId: string, reference: string, cycleLabel: string) => ({
    userId,
    title: "Payment approved",
    message: `Payment ${reference} was verified. Your subscription is queued for the cycle opening ${cycleLabel}.`,
    type: "SUCCESS" as const,
    link: "/dashboard/investments",
  }),
  paymentRejected: (userId: string, reference: string, reason: string) => ({
    userId,
    title: "Payment could not be verified",
    message: `${reference}: ${reason}`,
    type: "ERROR" as const,
    link: "/dashboard/payments",
  }),
  investmentQueued: (userId: string, reference: string, cycleLabel: string) => ({
    userId,
    title: "Investment queued",
    message: `${reference} will activate when the cycle opens on ${cycleLabel}.`,
    type: "INFO" as const,
    link: "/dashboard/investments",
  }),
  investmentActivated: (userId: string, reference: string, maturesLabel: string) => ({
    userId,
    title: "Investment activated",
    message: `${reference} is now active and matures on ${maturesLabel}.`,
    type: "SUCCESS" as const,
    link: "/dashboard/investments",
  }),
  investmentMatured: (userId: string, reference: string) => ({
    userId,
    title: "Investment matured",
    message: `${reference} has reached maturity. You can withdraw or roll it over.`,
    type: "SUCCESS" as const,
    link: "/dashboard/investments",
  }),
  withdrawalRequested: (userId: string, reference: string) => ({
    userId,
    title: "Withdrawal requested",
    message: `${reference} has been received and is queued for review.`,
    type: "INFO" as const,
    link: "/dashboard/withdrawals",
  }),
  withdrawalApproved: (userId: string, reference: string) => ({
    userId,
    title: "Withdrawal approved",
    message: `${reference} has been approved and is being prepared for settlement.`,
    type: "SUCCESS" as const,
    link: "/dashboard/withdrawals",
  }),
  withdrawalRejected: (userId: string, reference: string, reason: string) => ({
    userId,
    title: "Withdrawal declined",
    message: `${reference}: ${reason}`,
    type: "ERROR" as const,
    link: "/dashboard/withdrawals",
  }),
  withdrawalPaid: (userId: string, reference: string) => ({
    userId,
    title: "Withdrawal paid",
    message: `${reference} has been settled to your nominated destination.`,
    type: "SUCCESS" as const,
    link: "/dashboard/transactions",
  }),
  rolloverCreated: (userId: string, reference: string, cycleLabel: string) => ({
    userId,
    title: "Rollover created",
    message: `${reference} was created from your matured investment and is queued for ${cycleLabel}.`,
    type: "SUCCESS" as const,
    link: "/dashboard/investments",
  }),
  passwordChanged: (userId: string) => ({
    userId,
    title: "Password changed",
    message: "Your password was changed and other sessions were signed out.",
    type: "WARNING" as const,
    link: "/dashboard/security",
  }),
  walletChanged: (userId: string) => ({
    userId,
    title: "Withdrawal wallet updated",
    message: "Your saved withdrawal destination was changed.",
    type: "WARNING" as const,
    link: "/dashboard/security",
  }),
  supportReply: (userId: string, reference: string) => ({
    userId,
    title: "Support replied",
    message: `There is a new reply on ${reference}.`,
    type: "INFO" as const,
    link: "/dashboard/support",
  }),
};

export async function unreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}
