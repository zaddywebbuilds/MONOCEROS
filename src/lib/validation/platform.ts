import { z } from "zod";

import {
  emailSchema,
  moneyInputSchema,
  networkSchema,
  nigerianPhoneSchema,
  optionalText,
  safeText,
  transactionHashSchema,
  walletAddressSchema,
} from "@/lib/validation/common";

// ---------------------------------------------------------------------------
// KYC
// ---------------------------------------------------------------------------

export const ID_DOCUMENT_TYPES = [
  "NIN_SLIP",
  "NATIONAL_ID",
  "INTERNATIONAL_PASSPORT",
  "DRIVERS_LICENCE",
  "VOTERS_CARD",
] as const;

export const ID_DOCUMENT_LABELS: Record<(typeof ID_DOCUMENT_TYPES)[number], string> = {
  NIN_SLIP: "NIN Slip",
  NATIONAL_ID: "National ID Card",
  INTERNATIONAL_PASSPORT: "International Passport",
  DRIVERS_LICENCE: "Driver's Licence",
  VOTERS_CARD: "Voter's Card",
};

/** Nigerian NIN is exactly 11 digits. */
export const ninSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s/g, ""))
  .refine((v) => /^\d{11}$/.test(v), "Your NIN must be exactly 11 digits");

export const kycSubmissionSchema = z.object({
  nin: ninSchema,
  idType: z.enum(ID_DOCUMENT_TYPES),
  idNumber: optionalText(40),
});

export const kycReviewSchema = z
  .object({
    submissionId: z.string().min(1),
    decision: z.enum(["APPROVE", "REJECT", "REQUEST_RESUBMISSION"]),
    reason: optionalText(500),
  })
  .refine(
    (data) => data.decision === "APPROVE" || Boolean(data.reason && data.reason.length >= 5),
    { message: "A reason is required when declining or requesting a resubmission", path: ["reason"] },
  );

// ---------------------------------------------------------------------------
// Subscription and payment
// ---------------------------------------------------------------------------

export const subscribeSchema = z.object({
  packageSlug: z.string().min(1, "Choose a package").max(60),
});

export const paymentSubmissionSchema = z.object({
  investmentId: z.string().min(1),
  transactionHash: transactionHashSchema,
  submittedAmount: moneyInputSchema,
});

export const paymentReviewSchema = z
  .object({
    paymentId: z.string().min(1),
    decision: z.enum(["APPROVE", "REJECT"]),
    reason: optionalText(500),
    confirmed: z
      .union([z.boolean(), z.literal("on")])
      .transform((v) => v === true || v === "on"),
  })
  .refine((data) => data.confirmed, {
    message: "Confirm the decision before continuing",
    path: ["confirmed"],
  })
  .refine((data) => data.decision === "APPROVE" || Boolean(data.reason && data.reason.length >= 5), {
    message: "A reason is required when rejecting a payment",
    path: ["reason"],
  });

// ---------------------------------------------------------------------------
// Withdrawals
// ---------------------------------------------------------------------------

export const withdrawalRequestSchema = z.object({
  investmentId: z.string().min(1),
  method: z.enum(["USDT_WALLET", "BANK_TRANSFER"]).default("USDT_WALLET"),
  walletAddress: walletAddressSchema,
  walletNetwork: networkSchema,
  saveWallet: z
    .union([z.boolean(), z.literal("on")])
    .optional()
    .transform((v) => v === true || v === "on"),
  password: z.string().min(1, "Confirm your password to authorise this withdrawal"),
});

export const withdrawalDecisionSchema = z
  .object({
    withdrawalId: z.string().min(1),
    decision: z.enum(["APPROVE", "REJECT", "PROCESSING", "PAID"]),
    reason: optionalText(500),
    paymentTxid: optionalText(128),
    notes: optionalText(500),
    confirmed: z
      .union([z.boolean(), z.literal("on")])
      .transform((v) => v === true || v === "on"),
  })
  .refine((data) => data.confirmed, {
    message: "Confirm the action before continuing",
    path: ["confirmed"],
  })
  .refine((data) => data.decision !== "REJECT" || Boolean(data.reason && data.reason.length >= 5), {
    message: "A reason is required when rejecting a withdrawal",
    path: ["reason"],
  });

// ---------------------------------------------------------------------------
// Rollover
// ---------------------------------------------------------------------------

export const rolloverRequestSchema = z.object({
  investmentId: z.string().min(1),
  /** Only used when the admin rollover mode is REQUIRE_PACKAGE_SELECTION. */
  packageSlug: z.string().max(60).optional(),
});

// ---------------------------------------------------------------------------
// Profile and security
// ---------------------------------------------------------------------------

export const profileUpdateSchema = z.object({
  phone: nigerianPhoneSchema,
});

export const withdrawalWalletSchema = z.object({
  walletAddress: walletAddressSchema,
  walletNetwork: networkSchema,
  password: z.string().min(1, "Confirm your password to change your withdrawal wallet"),
});

// ---------------------------------------------------------------------------
// Support
// ---------------------------------------------------------------------------

export const TICKET_CATEGORIES = [
  "GENERAL",
  "ACCOUNT",
  "KYC",
  "PAYMENT",
  "WITHDRAWAL",
  "TECHNICAL",
  "OTHER",
] as const;

export const supportTicketSchema = z.object({
  subject: safeText(120, "Subject"),
  category: z.enum(TICKET_CATEGORIES).default("GENERAL"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  message: safeText(4000, "Message"),
});

export const supportReplySchema = z.object({
  ticketId: z.string().min(1),
  message: safeText(4000, "Message"),
});

export const supportStatusSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"]),
});

export const contactFormSchema = z.object({
  name: safeText(80, "Name"),
  email: emailSchema,
  subject: safeText(120, "Subject"),
  message: safeText(3000, "Message"),
});

// ---------------------------------------------------------------------------
// Admin: packages, content, settings
// ---------------------------------------------------------------------------

export const packageSchema = z.object({
  id: z.string().optional(),
  name: safeText(60, "Name"),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens only"),
  minimumCapital: moneyInputSchema,
  returnPercentage: z
    .string()
    .trim()
    .regex(/^\d{1,3}(\.\d{1,2})?$/, "Enter a percentage, e.g. 30 or 30.5"),
  durationDays: z.coerce.number().int().min(1).max(3650),
  description: safeText(400, "Description"),
  badge: optionalText(30),
  displayOrder: z.coerce.number().int().min(0).max(999),
  isActive: z
    .union([z.boolean(), z.literal("on")])
    .optional()
    .transform((v) => v === true || v === "on"),
});

export const faqSchema = z.object({
  id: z.string().optional(),
  question: safeText(200, "Question"),
  answer: safeText(2000, "Answer"),
  category: safeText(40, "Category").default("General"),
  displayOrder: z.coerce.number().int().min(0).max(999),
  isActive: z
    .union([z.boolean(), z.literal("on")])
    .optional()
    .transform((v) => v === true || v === "on"),
});

export const contentBlockSchema = z.object({
  slug: z.string().trim().min(2).max(60),
  title: safeText(160, "Title"),
  body: safeText(40_000, "Body"),
});

export const userStatusSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["SUSPEND", "UNSUSPEND"]),
  reason: safeText(300, "Reason"),
});

export const investmentCorrectionSchema = z.object({
  investmentId: z.string().min(1),
  note: safeText(500, "Correction note"),
  reason: safeText(300, "Reason"),
});

export const manualCycleSchema = z.object({
  cycleId: z.string().min(1),
  reason: safeText(300, "Reason"),
  confirmed: z
    .union([z.boolean(), z.literal("on")])
    .transform((v) => v === true || v === "on")
    .refine((v) => v, { message: "Confirm before starting a cycle manually" }),
});
