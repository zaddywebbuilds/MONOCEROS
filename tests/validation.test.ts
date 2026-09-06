import { describe, expect, it } from "vitest";

import { evaluatePassword } from "@/lib/auth/password";
import { generateToken, hashToken, safeEquals } from "@/lib/auth/tokens";
import {
  ageOn,
  emailSchema,
  moneyInputSchema,
  nigerianPhoneSchema,
  passwordSchema,
  transactionHashSchema,
  walletAddressSchema,
} from "@/lib/validation/common";
import { registrationSchema, loginSchema } from "@/lib/validation/auth";
import {
  ninSchema,
  paymentSubmissionSchema,
  withdrawalRequestSchema,
  packageSchema,
} from "@/lib/validation/platform";

/** Server-side validation. Nothing here trusts the browser. */

describe("email", () => {
  it("normalises case and whitespace", () => {
    expect(emailSchema.parse("  Investor@Example.COM ")).toBe("investor@example.com");
  });

  it("rejects malformed addresses", () => {
    for (const value of ["not-an-email", "a@b", "@example.com", "user@", ""]) {
      expect(emailSchema.safeParse(value).success, value).toBe(false);
    }
  });
});

describe("Nigerian mobile numbers", () => {
  it("normalises the accepted formats to +234", () => {
    const cases = ["08012345678", "2348012345678", "+2348012345678", "+234 801 234 5678"];
    for (const value of cases) {
      expect(nigerianPhoneSchema.parse(value), value).toBe("+2348012345678");
    }
  });

  it("accepts the 070, 080, 081, 090 and 091 ranges", () => {
    for (const value of ["07012345678", "08112345678", "09012345678", "09112345678"]) {
      expect(nigerianPhoneSchema.safeParse(value).success, value).toBe(true);
    }
  });

  it("rejects numbers that are not Nigerian mobiles", () => {
    for (const value of ["0123456789", "+447700900000", "080123456", "0801234567890", "abc"]) {
      expect(nigerianPhoneSchema.safeParse(value).success, value).toBe(false);
    }
  });
});

describe("password policy", () => {
  it("requires length, upper, lower and a number", () => {
    expect(passwordSchema.safeParse("Str0ngPass").success).toBe(true);

    for (const weak of ["short1A", "alllowercase1", "ALLUPPERCASE1", "NoNumbersHere"]) {
      expect(passwordSchema.safeParse(weak).success, weak).toBe(false);
    }
  });

  it("reports the same rules in the strength meter as the schema enforces", () => {
    const result = evaluatePassword("Str0ngPass");
    expect(result.valid).toBe(true);
    expect(result.checks.filter((check) => check.passed)).toHaveLength(4);

    const withSpecial = evaluatePassword("Str0ngPass!");
    expect(withSpecial.score).toBe(4);
    expect(withSpecial.label).toBe("Very strong");
  });

  it("marks a password missing a required rule as invalid", () => {
    expect(evaluatePassword("nouppercase1").valid).toBe(false);
  });
});

describe("registration", () => {
  const base = {
    firstName: "Ada",
    surname: "Obi",
    dateOfBirth: "1994-05-17",
    phone: "08012345678",
    email: "ada@example.com",
    password: "Str0ngPass!",
    confirmPassword: "Str0ngPass!",
    acceptedTerms: "on",
  };

  it("accepts a complete, valid registration", () => {
    const parsed = registrationSchema.parse(base);
    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.phone).toBe("+2348012345678");
    expect(parsed.acceptedTerms).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = registrationSchema.safeParse({ ...base, confirmPassword: "Different1!" });
    expect(result.success).toBe(false);
  });

  it("requires the terms checkbox", () => {
    const result = registrationSchema.safeParse({ ...base, acceptedTerms: "off" });
    expect(result.success).toBe(false);
  });

  it("refuses applicants under 18", () => {
    const sixteen = new Date();
    sixteen.setUTCFullYear(sixteen.getUTCFullYear() - 16);
    const result = registrationSchema.safeParse({
      ...base,
      dateOfBirth: sixteen.toISOString().slice(0, 10),
    });
    expect(result.success).toBe(false);
  });

  it("does not collect a NIN at registration", () => {
    const parsed = registrationSchema.parse(base) as Record<string, unknown>;
    expect(parsed.nin).toBeUndefined();
  });

  it("computes age correctly across a birthday boundary", () => {
    const dob = new Date("2008-09-11T00:00:00Z");
    expect(ageOn(dob, new Date("2026-09-10T00:00:00Z"))).toBe(17);
    expect(ageOn(dob, new Date("2026-09-11T00:00:00Z"))).toBe(18);
  });
});

describe("login", () => {
  it("keeps a safe internal redirect target", () => {
    const parsed = loginSchema.parse({
      email: "a@b.com",
      password: "x",
      next: "/dashboard/investments",
    });
    expect(parsed.next).toBe("/dashboard/investments");
  });
});

describe("NIN", () => {
  it("requires exactly eleven digits", () => {
    expect(ninSchema.parse("12345678901")).toBe("12345678901");
    expect(ninSchema.parse("123 4567 8901")).toBe("12345678901");

    for (const value of ["1234567890", "123456789012", "1234567890a", ""]) {
      expect(ninSchema.safeParse(value).success, value).toBe(false);
    }
  });
});

describe("payment submission", () => {
  it("accepts a plausible transaction hash", () => {
    const evm = `0x${"a".repeat(64)}`;
    const tron = "b".repeat(64);
    expect(transactionHashSchema.safeParse(evm).success).toBe(true);
    expect(transactionHashSchema.safeParse(tron).success).toBe(true);
  });

  it("rejects hashes that are too short or contain separators", () => {
    for (const value of ["abc123", "hash with spaces", "hash/with/slashes"]) {
      expect(transactionHashSchema.safeParse(value).success, value).toBe(false);
    }
  });

  it("requires an amount and an investment reference", () => {
    const valid = paymentSubmissionSchema.safeParse({
      investmentId: "inv_1",
      transactionHash: "c".repeat(64),
      submittedAmount: "500.00",
    });
    expect(valid.success).toBe(true);

    expect(
      paymentSubmissionSchema.safeParse({
        investmentId: "inv_1",
        transactionHash: "c".repeat(64),
        submittedAmount: "0",
      }).success,
    ).toBe(false);
  });

  it("rejects amounts with more than two decimal places or a negative sign", () => {
    for (const value of ["500.123", "-500.00", "abc", ""]) {
      expect(moneyInputSchema.safeParse(value).success, value).toBe(false);
    }
  });
});

describe("withdrawal request", () => {
  it("requires a destination, a network and a password", () => {
    const parsed = withdrawalRequestSchema.safeParse({
      investmentId: "inv_1",
      method: "USDT_WALLET",
      walletAddress: "TQn9Y2khDD95J42FQtQTdwVVRZqiTLXXXX",
      walletNetwork: "TRC20",
      password: "Str0ngPass!",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a wallet address that is obviously wrong", () => {
    for (const value of ["short", "has spaces in it here", ""]) {
      expect(walletAddressSchema.safeParse(value).success, value).toBe(false);
    }
  });

  it("refuses a request with no password confirmation", () => {
    const parsed = withdrawalRequestSchema.safeParse({
      investmentId: "inv_1",
      method: "USDT_WALLET",
      walletAddress: "TQn9Y2khDD95J42FQtQTdwVVRZqiTLXXXX",
      walletNetwork: "TRC20",
      password: "",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("package administration", () => {
  it("accepts a well-formed package", () => {
    const parsed = packageSchema.safeParse({
      name: "Gold",
      slug: "gold",
      minimumCapital: "500.00",
      returnPercentage: "30",
      durationDays: "30",
      description: "Entry tier",
      displayOrder: "1",
      isActive: "on",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a slug with uppercase or spaces", () => {
    for (const slug of ["Gold", "gold package", "gold_package"]) {
      const parsed = packageSchema.safeParse({
        name: "Gold",
        slug,
        minimumCapital: "500.00",
        returnPercentage: "30",
        durationDays: "30",
        description: "Entry tier",
        displayOrder: "1",
      });
      expect(parsed.success, slug).toBe(false);
    }
  });
});

describe("opaque tokens", () => {
  it("never stores the token itself", () => {
    const token = generateToken();
    const hash = hashToken(token);

    expect(hash).not.toBe(token);
    expect(hash).toHaveLength(64);
    expect(hashToken(token)).toBe(hash);
  });

  it("produces a different token every time", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateToken()));
    expect(tokens.size).toBe(50);
  });

  it("compares tokens without leaking length differences as a match", () => {
    expect(safeEquals("abc", "abc")).toBe(true);
    expect(safeEquals("abc", "abd")).toBe(false);
    expect(safeEquals("abc", "abcd")).toBe(false);
  });
});
