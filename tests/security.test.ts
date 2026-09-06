import { beforeEach, describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { rateLimit, resetRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { signDocumentUrl, verifyDocumentSignature } from "@/lib/storage/signed-url";
import { sniffMime, buildDocumentKey, ALLOWED_DOCUMENT_MIME } from "@/lib/storage";
import { isAdmin, isStaff, ADMIN_ROLES, STAFF_ROLES } from "@/lib/auth/rbac";
import { REFERENCE_PREFIX, cycleReference } from "@/lib/references";

/** Security controls that can be verified without a database. */

describe("password hashing", () => {
  it("never stores the password itself and salts every hash", async () => {
    const password = "Str0ngPass!";
    const first = await hashPassword(password);
    const second = await hashPassword(password);

    expect(first).not.toContain(password);
    expect(first).not.toBe(second);
    expect(first.startsWith("$2")).toBe(true);
  });

  it("verifies a correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("Str0ngPass!");

    expect(await verifyPassword("Str0ngPass!", hash)).toBe(true);
    expect(await verifyPassword("Str0ngPass", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("returns false rather than throwing on a malformed hash", async () => {
    expect(await verifyPassword("anything", "not-a-bcrypt-hash")).toBe(false);
  });
});

describe("rate limiting", () => {
  beforeEach(() => {
    resetRateLimit("login", "test-subject");
    resetRateLimit("withdrawalRequest", "test-subject");
  });

  it("allows requests up to the configured limit and then blocks", () => {
    const limit = RATE_LIMITS.login.limit;

    for (let attempt = 1; attempt <= limit; attempt += 1) {
      expect(rateLimit("login", "test-subject").allowed, `attempt ${attempt}`).toBe(true);
    }

    const blocked = rateLimit("login", "test-subject");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("keeps buckets separate per identifier", () => {
    for (let attempt = 0; attempt < RATE_LIMITS.login.limit + 2; attempt += 1) {
      rateLimit("login", "noisy-client");
    }

    expect(rateLimit("login", "quiet-client").allowed).toBe(true);
  });

  it("clears a bucket after a legitimate success", () => {
    for (let attempt = 0; attempt < RATE_LIMITS.login.limit; attempt += 1) {
      rateLimit("login", "test-subject");
    }
    expect(rateLimit("login", "test-subject").allowed).toBe(false);

    resetRateLimit("login", "test-subject");
    expect(rateLimit("login", "test-subject").allowed).toBe(true);
  });

  it("applies a tighter limit to withdrawals than to support messages", () => {
    expect(RATE_LIMITS.withdrawalRequest.limit).toBeLessThan(RATE_LIMITS.supportMessage.limit);
  });
});

describe("signed document URLs", () => {
  const grant = { key: "kyc/user_1/doc.png", viewerId: "admin_1" };

  function paramsFrom(url: string) {
    const query = new URLSearchParams(url.split("?")[1]);
    return { key: query.get("key"), exp: query.get("exp"), sig: query.get("sig") };
  }

  it("produces a link that validates for the intended viewer", () => {
    const params = paramsFrom(signDocumentUrl(grant));
    expect(verifyDocumentSignature({ ...params, viewerId: "admin_1" })).toBe(true);
  });

  it("refuses the same link for a different viewer", () => {
    const params = paramsFrom(signDocumentUrl(grant));
    expect(verifyDocumentSignature({ ...params, viewerId: "admin_2" })).toBe(false);
  });

  it("refuses a link whose key has been swapped", () => {
    const params = paramsFrom(signDocumentUrl(grant));
    expect(
      verifyDocumentSignature({ ...params, key: "kyc/user_2/doc.png", viewerId: "admin_1" }),
    ).toBe(false);
  });

  it("refuses a tampered signature", () => {
    const params = paramsFrom(signDocumentUrl(grant));
    expect(
      verifyDocumentSignature({ ...params, sig: `${params.sig?.slice(0, -1)}0`, viewerId: "admin_1" }),
    ).toBe(false);
  });

  it("refuses an expired link", () => {
    const params = paramsFrom(signDocumentUrl(grant, -60));
    expect(verifyDocumentSignature({ ...params, viewerId: "admin_1" })).toBe(false);
  });

  it("refuses a link with missing parameters", () => {
    expect(verifyDocumentSignature({ key: null, exp: null, sig: null, viewerId: "admin_1" })).toBe(
      false,
    );
  });
});

describe("upload validation", () => {
  it("identifies allowed file types from their bytes, not their name", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const pdf = Buffer.from("%PDF-1.7 rest of file");

    expect(sniffMime(jpeg)).toBe("image/jpeg");
    expect(sniffMime(png)).toBe("image/png");
    expect(sniffMime(pdf)).toBe("application/pdf");
  });

  it("rejects a file that merely claims to be an image", () => {
    const script = Buffer.from("<?php system($_GET['c']); ?>          ");
    const html = Buffer.from("<html><script>alert(1)</script></html>  ");

    expect(sniffMime(script)).toBeNull();
    expect(sniffMime(html)).toBeNull();
  });

  it("rejects a truncated file", () => {
    expect(sniffMime(Buffer.from([0xff, 0xd8]))).toBeNull();
  });

  it("only allows JPG, PNG and PDF", () => {
    expect([...ALLOWED_DOCUMENT_MIME]).toEqual(["image/jpeg", "image/png", "application/pdf"]);
  });

  it("builds an unguessable, namespaced object key", () => {
    const first = buildDocumentKey("kyc", "user_1", "image/png");
    const second = buildDocumentKey("kyc", "user_1", "image/png");

    expect(first).toMatch(/^kyc\/user_1\/\d{4}-\d{2}-\d{2}-[0-9a-f]{32}\.png$/);
    expect(first).not.toBe(second);
  });

  it("keeps payment proofs in a separate namespace from identity documents", () => {
    expect(buildDocumentKey("payment-proof", "user_1", "application/pdf")).toMatch(
      /^payment-proof\//,
    );
  });
});

describe("role checks", () => {
  it("treats support as staff but not as an administrator", () => {
    expect(isStaff("SUPPORT")).toBe(true);
    expect(isAdmin("SUPPORT")).toBe(false);
  });

  it("treats an investor as neither", () => {
    expect(isStaff("USER")).toBe(false);
    expect(isAdmin("USER")).toBe(false);
  });

  it("treats both administrator roles as equal for authorisation", () => {
    expect(ADMIN_ROLES).toEqual(["ADMIN", "SUPER_ADMIN"]);
    expect(STAFF_ROLES).toContain("ADMIN");
    expect(STAFF_ROLES).toContain("SUPER_ADMIN");
  });
});

describe("references", () => {
  it("uses a distinct prefix for each record type", () => {
    const prefixes = Object.values(REFERENCE_PREFIX);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it("formats a cycle reference from its date", () => {
    expect(cycleReference("2026-09-11")).toBe("MON-CYC-20260911");
  });
});
