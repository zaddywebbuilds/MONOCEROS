import { z } from "zod";

/** Shared primitives used by every schema on the platform. */

/**
 * Strips ASCII control characters from free text before it is persisted.
 * Implemented by code point rather than a regular expression so the source
 * file itself stays free of control characters.
 */
const stripControl = (value: string): string =>
  Array.from(value)
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code > 31 && code !== 127;
    })
    .join("");

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email address is required")
  .max(254, "Email address is too long")
  .email("Enter a valid email address")
  .transform((v) => v.toLowerCase());

/**
 * Nigerian mobile numbers. Accepts 08012345678, 2348012345678 and
 * +234 801 234 5678, and normalises to +234XXXXXXXXXX.
 */
export const nigerianPhoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .refine((v) => /^(?:\+?234|0)[789][01]\d{8}$/.test(v), {
    message: "Enter a valid Nigerian mobile number, e.g. 0801 234 5678",
  })
  .transform((v) => {
    const digits = v.replace(/^\+?234/, "").replace(/^0/, "");
    return `+234${digits}`;
  });

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be 128 characters or fewer")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/\d/, "Password must contain a number");

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Must be at least 2 characters")
  .max(60, "Must be 60 characters or fewer")
  .regex(/^[\p{L}'’\-. ]+$/u, "Use letters, hyphens and apostrophes only");

/** Free text that will be rendered — stripped of control characters. */
export const safeText = (max: number, label = "This field") =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform(stripControl);

export const optionalText = (max: number) =>
  z.string().trim().max(max).transform(stripControl).optional();

/** Money entered by a human: up to 2 decimal places, positive. */
export const moneyInputSchema = z
  .string()
  .trim()
  .regex(/^\d{1,12}(\.\d{1,2})?$/, "Enter a valid amount, e.g. 500.00")
  .refine((v) => Number(v) > 0, "Amount must be greater than zero");

/**
 * Blockchain transaction hash. Deliberately permissive across networks
 * (TRON base58/hex, EVM 0x-prefixed hex, Solana base58) but strict about shape.
 */
export const transactionHashSchema = z
  .string()
  .trim()
  .min(16, "Transaction hash looks too short")
  .max(128, "Transaction hash looks too long")
  .regex(/^[A-Za-z0-9]+$/, "Transaction hash contains invalid characters");

export const walletAddressSchema = z
  .string()
  .trim()
  .min(20, "Wallet address looks too short")
  .max(128, "Wallet address looks too long")
  .regex(/^[A-Za-z0-9:_-]+$/, "Wallet address contains invalid characters");

export const networkSchema = z.string().trim().min(2, "Select a network").max(24);

/** ISO date string (yyyy-MM-dd) from a native date input. */
export const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");

export function ageOn(dateOfBirth: Date, reference: Date = new Date()): number {
  let age = reference.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDelta = reference.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && reference.getUTCDate() < dateOfBirth.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(5).max(100).default(20),
});
