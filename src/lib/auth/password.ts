import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  checks: { label: string; passed: boolean }[];
  valid: boolean;
}

/**
 * Password policy (mirrored by the Zod schema in lib/validation/auth.ts so the
 * rules cannot drift between the meter and server-side validation).
 */
export function evaluatePassword(value: string): PasswordStrength {
  const checks = [
    { label: "At least 8 characters", passed: value.length >= 8 },
    { label: "One uppercase letter", passed: /[A-Z]/.test(value) },
    { label: "One lowercase letter", passed: /[a-z]/.test(value) },
    { label: "One number", passed: /\d/.test(value) },
    { label: "One special character", passed: /[^A-Za-z0-9]/.test(value) },
  ];

  const passed = checks.filter((c) => c.passed).length;
  const required = checks.slice(0, 4).every((c) => c.passed);

  const score = Math.min(4, Math.max(0, passed - 1)) as 0 | 1 | 2 | 3 | 4;
  const labels = ["Very weak", "Weak", "Fair", "Strong", "Very strong"];

  return {
    score,
    label: labels[score] ?? "Very weak",
    checks,
    valid: required,
  };
}
