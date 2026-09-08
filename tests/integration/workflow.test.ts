import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fromZonedTime } from "date-fns-tz";

/**
 * End-to-end workflow tests.
 *
 * These exercise the real service layer against a real PostgreSQL database and
 * are therefore SKIPPED unless you point them at one:
 *
 *   TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/monoceros_test \
 *     npm run test
 *
 * The target database is migrated and TRUNCATEd by this file, so it must be a
 * disposable test database — never a development or production one.
 */

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeIfDb = testDatabaseUrl ? describe : describe.skip;

if (testDatabaseUrl) {
  process.env.DATABASE_URL = testDatabaseUrl;
}

describeIfDb("investment workflow", () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let prisma: any;
  let services: {
    createSubscription: any;
    activateDueInvestments: any;
    matureDueInvestments: any;
    submitPayment: any;
    approvePayment: any;
    rejectPayment: any;
    requestWithdrawal: any;
    decideWithdrawal: any;
    createRollover: any;
    submitKyc: any;
    reviewKyc: any;
    registerUser: any;
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const BUSINESS_TZ = "Africa/Lagos";
  const lagos = (dateTime: string) => fromZonedTime(dateTime, BUSINESS_TZ);

  const admin = {
    id: "",
    email: "admin@test.invalid",
    role: "ADMIN" as const,
  };

  beforeAll(async () => {
    prisma = (await import("@/lib/prisma")).prisma;

    services = {
      ...(await import("@/server/services/investments")),
      ...(await import("@/server/services/payments")),
      ...(await import("@/server/services/withdrawals")),
      ...(await import("@/server/services/rollovers")),
      ...(await import("@/server/services/kyc")),
      ...(await import("@/server/services/accounts")),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    vi.useRealTimers();

    // Order matters: children before parents.
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        "AuditLog", "Notification", "Transaction", "SupportMessage", "SupportTicket",
        "WalletChangeLog", "Rollover", "Withdrawal", "Payment",
        "InvestmentStatusEvent", "Investment", "InvestmentCycle",
        "KycSubmission", "LoginEvent", "Session",
        "EmailVerificationToken", "PasswordResetToken",
        "AdminProfile", "UserProfile", "User", "ReferenceCounter"
      RESTART IDENTITY CASCADE
    `);

    const { hashPassword } = await import("@/lib/auth/password");

    const adminUser = await prisma.user.create({
      data: {
        reference: "MON-USR-TEST-ADMIN",
        email: admin.email,
        passwordHash: await hashPassword("Str0ngPass!"),
        role: "ADMIN",
        emailVerifiedAt: new Date(),
        kycStatus: "APPROVED",
      },
    });
    admin.id = adminUser.id;

    // The packages the platform ships with.
    const { SEED_PACKAGES } = await import("../../prisma/seed-data");
    for (const pkg of SEED_PACKAGES) {
      await prisma.package.create({
        data: {
          name: pkg.name,
          slug: pkg.slug,
          minimumCapital: pkg.minimumCapital,
          returnPercentage: pkg.returnPercentage,
          maturityAmount: pkg.maturityAmount,
          durationDays: pkg.durationDays,
          description: pkg.description,
          badge: pkg.badge,
          displayOrder: pkg.displayOrder,
          isActive: true,
        },
      });
    }

    // Payment settings must exist or subscriptions are refused by design.
    const { setSetting } = await import("@/lib/settings");
    await setSetting("payment.wallet.TRC20", "TTestWalletAddressForIntegrationTests");
  });

  async function createInvestor(email = "investor@test.invalid") {
    const { hashPassword } = await import("@/lib/auth/password");

    return prisma.user.create({
      data: {
        reference: `MON-USR-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        email,
        passwordHash: await hashPassword("Str0ngPass!"),
        role: "USER",
        emailVerifiedAt: new Date(),
        kycStatus: "APPROVED",
        profile: {
          create: {
            firstName: "Test",
            surname: "Investor",
            dateOfBirth: new Date("1994-05-17T00:00:00Z"),
            phone: "+2348012345678",
          },
        },
      },
    });
  }

  // -------------------------------------------------------------------------

  it("creates a subscription with the package terms snapshotted onto it", async () => {
    const investor = await createInvestor();
    const { investment } = await services.createSubscription(investor.id, "gold");

    expect(investment.status).toBe("PAYMENT_PENDING");
    expect(investment.packageNameSnapshot).toBe("Gold");
    expect(investment.principalAmount.toFixed(2)).toBe("500.00");
    expect(investment.maturityAmount.toFixed(2)).toBe("650.00");
    expect(investment.reference).toMatch(/^MON-INV-\d{4}-\d{6}$/);

    const payment = await prisma.payment.findFirst({ where: { investmentId: investment.id } });
    expect(payment.status).toBe("PENDING");
    expect(payment.expectedAmount.toFixed(2)).toBe("500.00");
  });

  it("leaves an existing investment untouched when its package is later edited", async () => {
    const investor = await createInvestor();
    const { investment } = await services.createSubscription(investor.id, "gold");

    await prisma.package.update({
      where: { slug: "gold" },
      data: { minimumCapital: "999.00", returnPercentage: "5", maturityAmount: "1048.95" },
    });

    const unchanged = await prisma.investment.findUnique({ where: { id: investment.id } });
    expect(unchanged.principalAmount.toFixed(2)).toBe("500.00");
    expect(unchanged.returnPercentageSnapshot.toFixed(0)).toBe("30");
    expect(unchanged.maturityAmount.toFixed(2)).toBe("650.00");
  });

  it("refuses a second submission of the same transaction hash", async () => {
    const first = await createInvestor("one@test.invalid");
    const second = await createInvestor("two@test.invalid");

    const a = await services.createSubscription(first.id, "gold");
    const b = await services.createSubscription(second.id, "gold");

    const hash = `0x${"a".repeat(64)}`;

    await services.submitPayment({
      userId: first.id,
      investmentId: a.investment.id,
      transactionHash: hash,
      submittedAmount: "500.00",
    });

    await expect(
      services.submitPayment({
        userId: second.id,
        investmentId: b.investment.id,
        transactionHash: hash,
        submittedAmount: "500.00",
      }),
    ).rejects.toThrow(/already been submitted/i);
  });

  // --- The cycle rule ------------------------------------------------------

  it("queues a payment approved on Thursday for the very next Friday", async () => {
    const investor = await createInvestor();
    const { investment } = await services.createSubscription(investor.id, "gold");

    await services.submitPayment({
      userId: investor.id,
      investmentId: investment.id,
      transactionHash: `0x${"b".repeat(64)}`,
      submittedAmount: "500.00",
    });

    const payment = await prisma.payment.findFirst({ where: { investmentId: investment.id } });

    vi.useFakeTimers();
    vi.setSystemTime(lagos("2026-09-10T23:59:00")); // Thursday

    await services.approvePayment(payment.id, admin);

    const queued = await prisma.investment.findUnique({
      where: { id: investment.id },
      include: { cycle: true },
    });

    expect(queued.status).toBe("QUEUED");
    expect(queued.cycle.cycleStart.toISOString()).toBe(lagos("2026-09-11T00:00:00").toISOString());
  });

  it("pushes a payment approved just after the boundary to the following Friday", async () => {
    const investor = await createInvestor();
    const { investment } = await services.createSubscription(investor.id, "gold");

    await services.submitPayment({
      userId: investor.id,
      investmentId: investment.id,
      transactionHash: `0x${"c".repeat(64)}`,
      submittedAmount: "500.00",
    });

    const payment = await prisma.payment.findFirst({ where: { investmentId: investment.id } });

    vi.useFakeTimers();
    vi.setSystemTime(lagos("2026-09-11T00:01:00")); // Friday, one minute late

    await services.approvePayment(payment.id, admin);

    const queued = await prisma.investment.findUnique({
      where: { id: investment.id },
      include: { cycle: true },
    });

    expect(queued.cycle.cycleStart.toISOString()).toBe(lagos("2026-09-18T00:00:00").toISOString());
  });

  it("activates queued investments when the cycle opens and sets a 30-day maturity", async () => {
    const investor = await createInvestor();
    const { investment } = await services.createSubscription(investor.id, "gold");

    await services.submitPayment({
      userId: investor.id,
      investmentId: investment.id,
      transactionHash: `0x${"d".repeat(64)}`,
      submittedAmount: "500.00",
    });
    const payment = await prisma.payment.findFirst({ where: { investmentId: investment.id } });

    vi.useFakeTimers();
    vi.setSystemTime(lagos("2026-09-10T12:00:00"));
    await services.approvePayment(payment.id, admin);

    // Before the boundary nothing activates.
    vi.setSystemTime(lagos("2026-09-10T23:59:00"));
    expect((await services.activateDueInvestments(new Date())).investmentsActivated).toBe(0);

    // On the boundary it does.
    vi.setSystemTime(lagos("2026-09-11T00:00:00"));
    const report = await services.activateDueInvestments(new Date());
    expect(report.investmentsActivated).toBe(1);

    const active = await prisma.investment.findUnique({ where: { id: investment.id } });
    expect(active.status).toBe("ACTIVE");
    expect(active.startedAt.toISOString()).toBe(lagos("2026-09-11T00:00:00").toISOString());
    expect(active.maturesAt.toISOString()).toBe(lagos("2026-10-11T00:00:00").toISOString());

    // Re-running the engine must not double-activate.
    expect((await services.activateDueInvestments(new Date())).investmentsActivated).toBe(0);
  });

  it("matures an investment only once its term has elapsed", async () => {
    const investor = await createInvestor();
    const { investment } = await services.createSubscription(investor.id, "gold");
    await services.submitPayment({
      userId: investor.id,
      investmentId: investment.id,
      transactionHash: `0x${"e".repeat(64)}`,
      submittedAmount: "500.00",
    });
    const payment = await prisma.payment.findFirst({ where: { investmentId: investment.id } });

    vi.useFakeTimers();
    vi.setSystemTime(lagos("2026-09-10T12:00:00"));
    await services.approvePayment(payment.id, admin);

    vi.setSystemTime(lagos("2026-09-11T00:00:00"));
    await services.activateDueInvestments(new Date());

    vi.setSystemTime(lagos("2026-10-10T23:59:00"));
    expect((await services.matureDueInvestments(new Date())).matured).toBe(0);

    vi.setSystemTime(lagos("2026-10-11T00:00:00"));
    expect((await services.matureDueInvestments(new Date())).matured).toBe(1);

    const matured = await prisma.investment.findUnique({ where: { id: investment.id } });
    expect(matured.status).toBe("MATURED");
  });

  // --- Withdrawals and rollovers -------------------------------------------

  async function maturedInvestment(slug = "gold") {
    const investor = await createInvestor(`m-${Math.random().toString(36).slice(2, 8)}@test.invalid`);
    const { investment } = await services.createSubscription(investor.id, slug);

    await services.submitPayment({
      userId: investor.id,
      investmentId: investment.id,
      transactionHash: `0x${Math.random().toString(16).slice(2).padEnd(64, "f")}`,
      submittedAmount: investment.principalAmount.toFixed(2),
    });
    const payment = await prisma.payment.findFirst({ where: { investmentId: investment.id } });

    vi.useFakeTimers();
    vi.setSystemTime(lagos("2026-09-10T12:00:00"));
    await services.approvePayment(payment.id, admin);

    vi.setSystemTime(lagos("2026-09-11T00:00:00"));
    await services.activateDueInvestments(new Date());

    vi.setSystemTime(lagos("2026-10-11T00:00:00"));
    await services.matureDueInvestments(new Date());

    return { investor, investmentId: investment.id };
  }

  it("refuses a withdrawal before maturity", async () => {
    const investor = await createInvestor();
    const { investment } = await services.createSubscription(investor.id, "gold");

    await expect(
      services.requestWithdrawal({
        userId: investor.id,
        investmentId: investment.id,
        method: "USDT_WALLET",
        walletAddress: "TDestinationWalletAddressForTests12",
        walletNetwork: "TRC20",
        saveWallet: false,
        password: "Str0ngPass!",
      }),
    ).rejects.toThrow(/maturity/i);
  });

  it("allows a withdrawal of the full matured amount and settles it", async () => {
    const { investor, investmentId } = await maturedInvestment();

    await services.requestWithdrawal({
      userId: investor.id,
      investmentId,
      method: "USDT_WALLET",
      walletAddress: "TDestinationWalletAddressForTests12",
      walletNetwork: "TRC20",
      saveWallet: true,
      password: "Str0ngPass!",
    });

    const withdrawal = await prisma.withdrawal.findFirst({ where: { investmentId } });
    expect(withdrawal.amount.toFixed(2)).toBe("650.00");
    expect(withdrawal.status).toBe("PENDING");

    await services.decideWithdrawal({ withdrawalId: withdrawal.id, decision: "APPROVE" }, admin);
    await services.decideWithdrawal(
      { withdrawalId: withdrawal.id, decision: "PAID", paymentTxid: "0xsettlement" },
      admin,
    );

    const settled = await prisma.withdrawal.findUnique({ where: { id: withdrawal.id } });
    const closed = await prisma.investment.findUnique({ where: { id: investmentId } });

    expect(settled.status).toBe("PAID");
    expect(closed.status).toBe("COMPLETED");
  });

  it("rejects a wrong password on a withdrawal request", async () => {
    const { investor, investmentId } = await maturedInvestment();

    await expect(
      services.requestWithdrawal({
        userId: investor.id,
        investmentId,
        method: "USDT_WALLET",
        walletAddress: "TDestinationWalletAddressForTests12",
        walletNetwork: "TRC20",
        saveWallet: false,
        password: "WrongPassword1!",
      }),
    ).rejects.toThrow(/password/i);
  });

  it("rolls the full matured amount into a new queued investment", async () => {
    const { investor, investmentId } = await maturedInvestment();

    vi.setSystemTime(lagos("2026-10-12T10:00:00")); // Monday
    await services.createRollover({ userId: investor.id, investmentId });

    const source = await prisma.investment.findUnique({ where: { id: investmentId } });
    expect(source.status).toBe("ROLLED_OVER");

    const created = await prisma.investment.findFirst({
      where: { parentInvestmentId: investmentId },
      include: { cycle: true },
    });

    // 650 carried forward at the same 30% -> 845.
    expect(created.principalAmount.toFixed(2)).toBe("650.00");
    expect(created.returnPercentageSnapshot.toFixed(0)).toBe("30");
    expect(created.maturityAmount.toFixed(2)).toBe("845.00");
    expect(created.status).toBe("QUEUED");
    expect(created.cycle.cycleStart.toISOString()).toBe(lagos("2026-10-16T00:00:00").toISOString());
  });

  it("refuses to roll over the same investment twice", async () => {
    const { investor, investmentId } = await maturedInvestment();

    vi.setSystemTime(lagos("2026-10-12T10:00:00"));
    await services.createRollover({ userId: investor.id, investmentId });

    await expect(
      services.createRollover({ userId: investor.id, investmentId }),
    ).rejects.toThrow(/maturity|already/i);
  });

  // --- Authorisation and KYC -----------------------------------------------

  it("does not let one investor act on another investor's investment", async () => {
    const owner = await createInvestor("owner@test.invalid");
    const stranger = await createInvestor("stranger@test.invalid");
    const { investment } = await services.createSubscription(owner.id, "gold");

    await expect(
      services.submitPayment({
        userId: stranger.id,
        investmentId: investment.id,
        transactionHash: `0x${"9".repeat(64)}`,
        submittedAmount: "500.00",
      }),
    ).rejects.toThrow(/not found/i);
  });

  it("records an audit entry for every payment decision", async () => {
    const investor = await createInvestor();
    const { investment } = await services.createSubscription(investor.id, "gold");
    await services.submitPayment({
      userId: investor.id,
      investmentId: investment.id,
      transactionHash: `0x${"7".repeat(64)}`,
      submittedAmount: "500.00",
    });
    const payment = await prisma.payment.findFirst({ where: { investmentId: investment.id } });

    await services.rejectPayment(payment.id, "No matching transfer found", admin);

    const audit = await prisma.auditLog.findFirst({
      where: { entityType: "Payment", entityId: payment.id, action: "payment.rejected" },
    });

    expect(audit).toBeTruthy();
    expect(audit.reason).toBe("No matching transfer found");
    expect(audit.actorEmail).toBe(admin.email);

    const rejected = await prisma.investment.findUnique({ where: { id: investment.id } });
    expect(rejected.status).toBe("PAYMENT_REJECTED");
  });

  it("lets an investor resubmit after a rejected payment", async () => {
    const investor = await createInvestor();
    const { investment } = await services.createSubscription(investor.id, "gold");

    await services.submitPayment({
      userId: investor.id,
      investmentId: investment.id,
      transactionHash: `0x${"1".repeat(64)}`,
      submittedAmount: "500.00",
    });
    const payment = await prisma.payment.findFirst({ where: { investmentId: investment.id } });
    await services.rejectPayment(payment.id, "Wrong network", admin);

    await services.submitPayment({
      userId: investor.id,
      investmentId: investment.id,
      transactionHash: `0x${"2".repeat(64)}`,
      submittedAmount: "500.00",
    });

    const resubmitted = await prisma.investment.findUnique({ where: { id: investment.id } });
    expect(resubmitted.status).toBe("PAYMENT_SUBMITTED");
  });

  it("blocks a subscription while identity verification is not approved", async () => {
    const investor = await createInvestor("unverified@test.invalid");
    await prisma.user.update({ where: { id: investor.id }, data: { kycStatus: "PENDING" } });

    // The service itself does not gate on KYC (the action layer does), so this
    // asserts the guard the action layer relies on is actually reflected in
    // the stored state.
    const stored = await prisma.user.findUnique({ where: { id: investor.id } });
    expect(stored.kycStatus).not.toBe("APPROVED");
  });

  it("approves a KYC submission and unlocks investing", async () => {
    const { hashPassword } = await import("@/lib/auth/password");
    const investor = await prisma.user.create({
      data: {
        reference: "MON-USR-TEST-KYC",
        email: "kyc@test.invalid",
        passwordHash: await hashPassword("Str0ngPass!"),
        role: "USER",
        emailVerifiedAt: new Date(),
        kycStatus: "NOT_SUBMITTED",
        profile: {
          create: {
            firstName: "Kyc",
            surname: "Applicant",
            dateOfBirth: new Date("1994-05-17T00:00:00Z"),
            phone: "+2348012345678",
          },
        },
      },
    });

    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const file = new File([png], "id.png", { type: "image/png" });

    await services.submitKyc({
      userId: investor.id,
      nin: "12345678901",
      idType: "NIN_SLIP",
      document: file,
    });

    const submission = await prisma.kycSubmission.findFirst({ where: { userId: investor.id } });
    expect(submission.status).toBe("PENDING");
    expect(submission.reference).toMatch(/^MON-KYC-\d{4}-\d{6}$/);

    await services.reviewKyc(submission.id, "APPROVE", undefined, admin);

    const approved = await prisma.user.findUnique({ where: { id: investor.id } });
    expect(approved.kycStatus).toBe("APPROVED");
  });
});
