import { z } from "zod";

import {
  ageOn,
  emailSchema,
  isoDateSchema,
  nameSchema,
  nigerianPhoneSchema,
  passwordSchema,
} from "@/lib/validation/common";

/** Registration step 1 — personal details. NIN is deliberately NOT collected here. */
export const registrationDetailsSchema = z.object({
  firstName: nameSchema,
  surname: nameSchema,
  otherName: z
    .union([nameSchema, z.literal("")])
    .optional()
    .transform((v) => (v ? v : undefined)),
  dateOfBirth: isoDateSchema.refine(
    (value) => {
      const dob = new Date(`${value}T00:00:00Z`);
      if (Number.isNaN(dob.getTime())) return false;
      const age = ageOn(dob);
      return age >= 18 && age <= 100;
    },
    { message: "You must be at least 18 years old to open an account" },
  ),
  phone: nigerianPhoneSchema,
  email: emailSchema,
});

/** Registration step 2 — credentials and consent. */
export const registrationCredentialsSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptedTerms: z
      .union([z.boolean(), z.literal("on"), z.literal("true")])
      .transform((v) => v === true || v === "on" || v === "true")
      .refine((v) => v, {
        message: "You must accept the Terms & Conditions and Privacy Policy",
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const registrationSchema = registrationDetailsSchema.and(
  registrationCredentialsSchema,
);

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(128),
  next: z.string().max(512).optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10, "This reset link is not valid"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.password, {
    message: "Choose a password you have not used before",
    path: ["password"],
  });

export const verifyEmailSchema = z.object({
  token: z.string().min(10),
});
