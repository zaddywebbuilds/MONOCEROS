import "dotenv/config";

import { Prisma } from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth/password";
import { nextReference, cycleReference } from "../src/lib/references";
import {
  cycleEndFor,
  currentCycleStart,
  maturityFor,
  nextCycleStart,
  zonedDateKey,
  DEFAULT_CYCLE_CONFIG,
} from "../src/lib/time";

/**
 * Development sample data.
 *
 * Refuses to run when NODE_ENV=production. Every record it creates is clearly
 * labelled as a demo: accounts use the reserved `@demo.monoceros.invalid`
 * domain, and transaction descriptions say so. Nothing here is designed to
 * look like real investor activity.
 */

const DEMO_DOMAIN = "demo.monoceros.invalid";
const DEMO_PASSWORD = "DemoInvestor#2026";

function decimal(value: string | number) {
  return new Prisma.Decimal(value);
}

async function demoUser(
  email: string,
  firstName: string,
  surname: string,
  kycStatus: "NOT_SUBMITTED" | "PENDING" | "APPROVED",
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  return prisma.$transaction(async (tx) =>
    tx.user.create({
      data: {
        reference: await nextReference("user", tx),
        email,
        passwordHash,
        role: "USER",
        emailVerifiedAt: new Date(),
        kycStatus,
        profile: {
          create: {
            firstName,
            surname,
            dateOfBirth: new Date("1994-05-17T00:00:00Z"),
            phone: "+2348012345678",
            country: "Nigeria",
          },
        },
      },
    }),
  );
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Refusing to seed demo data with NODE_ENV=production. Demo accounts must never exist on a live platform.",
    );
  }

  console.info("Seeding DEMO data (development only)…\n");

  const packages = await prisma.package.findMany({ orderBy: { displayOrder: "asc" } });
  if (packages.length === 0) {
    throw new Error("Run `npm run db:seed` first — demo data needs the packages to exist.");
  }

  const gold = packages.find((p) => p.slug === "gold") ?? packages[0]!;
  const diamond = packages.find((p) => p.slug === "diamond") ?? packages[0]!;
  const sapphire = packages.find((p) => p.slug === "sapphire") ?? packages[0]!;

  // --- Accounts at different stages of the journey -------------------------
  const unverified = await demoUser(
    `new.investor@${DEMO_DOMAIN}`,
    "Demo",
    "Newcomer",
    "NOT_SUBMITTED",
  );
  const pending = await demoUser(`pending.kyc@${DEMO_DOMAIN}`, "Demo", "Pending", "PENDING");
  const active = await demoUser(`active.investor@${DEMO_DOMAIN}`, "Demo", "Investor", "APPROVED");

  console.info(`accounts: ${unverified.email}, ${pending.email}, ${active.email}`);
  console.info(`demo password for all three: ${DEMO_PASSWORD}\n`);

  // A pending KYC submission for the middle account.
  const hasSubmission = await prisma.kycSubmission.findFirst({ where: { userId: pending.id } });
  if (!hasSubmission) {
    await prisma.$transaction(async (tx) => {
      await tx.kycSubmission.create({
        data: {
          reference: await nextReference("kyc", tx),
          userId: pending.id,
          nin: "12345678901",
          idType: "NIN_SLIP",
          documentKey: `kyc/${pending.id}/demo-placeholder.png`,
          documentMime: "image/png",
          documentSize: 1024,
          status: "PENDING",
        },
      });
    });
    console.info("kyc: one pending submission created (document file is a placeholder key)");
  }

  // --- Cycles --------------------------------------------------------------
  const now = new Date();
  const runningStart = currentCycleStart(now, DEFAULT_CYCLE_CONFIG);
  const upcomingStart = nextCycleStart(now, DEFAULT_CYCLE_CONFIG);

  const runningCycle = await prisma.investmentCycle.upsert({
    where: { cycleStart: runningStart },
    create: {
      reference: cycleReference(zonedDateKey(runningStart)),
      cycleStart: runningStart,
      cycleEnd: cycleEndFor(runningStart),
      status: "ACTIVE",
      activatedAt: runningStart,
    },
    update: {},
  });

  const upcomingCycle = await prisma.investmentCycle.upsert({
    where: { cycleStart: upcomingStart },
    create: {
      reference: cycleReference(zonedDateKey(upcomingStart)),
      cycleStart: upcomingStart,
      cycleEnd: cycleEndFor(upcomingStart),
      status: "UPCOMING",
    },
    update: {},
  });

  const alreadySeeded = await prisma.investment.count({ where: { userId: active.id } });
  if (alreadySeeded > 0) {
    console.info("\ninvestments: demo investments already exist — skipping.\n");
    return;
  }

  // --- An ACTIVE investment running in the current cycle -------------------
  await prisma.$transaction(async (tx) => {
    const reference = await nextReference("investment", tx);
    const investment = await tx.investment.create({
      data: {
        reference,
        userId: active.id,
        packageId: gold.id,
        packageNameSnapshot: gold.name,
        principalAmount: gold.minimumCapital,
        returnPercentageSnapshot: gold.returnPercentage,
        maturityAmount: gold.maturityAmount,
        durationDays: gold.durationDays,
        status: "ACTIVE",
        cycleId: runningCycle.id,
        queuedAt: runningStart,
        startedAt: runningStart,
        maturesAt: maturityFor(runningStart, gold.durationDays),
      },
    });

    await tx.payment.create({
      data: {
        reference: await nextReference("payment", tx),
        userId: active.id,
        investmentId: investment.id,
        asset: "USDT",
        network: "DEMO-NETWORK",
        walletAddress: "DEMO-WALLET-ADDRESS-NOT-REAL",
        expectedAmount: gold.minimumCapital,
        submittedAmount: gold.minimumCapital,
        transactionHash: `DEMOHASH${investment.id.slice(0, 20)}`,
        status: "APPROVED",
        submittedAt: runningStart,
        approvedAt: runningStart,
      },
    });

    await tx.investmentStatusEvent.createMany({
      data: [
        { investmentId: investment.id, toStatus: "PAYMENT_PENDING", reason: "Demo data" },
        { investmentId: investment.id, fromStatus: "PAYMENT_PENDING", toStatus: "PAYMENT_SUBMITTED", reason: "Demo data" },
        { investmentId: investment.id, fromStatus: "PAYMENT_SUBMITTED", toStatus: "QUEUED", reason: "Demo data" },
        { investmentId: investment.id, fromStatus: "QUEUED", toStatus: "ACTIVE", reason: "Demo data" },
      ],
    });

    await tx.transaction.create({
      data: {
        reference: await nextReference("transaction", tx),
        userId: active.id,
        investmentId: investment.id,
        type: "INVESTMENT_ACTIVATED",
        amount: gold.minimumCapital,
        description: `DEMO DATA — ${reference} activated`,
      },
    });
  });

  // --- A QUEUED investment waiting for the next cycle ----------------------
  await prisma.$transaction(async (tx) => {
    const reference = await nextReference("investment", tx);
    const investment = await tx.investment.create({
      data: {
        reference,
        userId: active.id,
        packageId: diamond.id,
        packageNameSnapshot: diamond.name,
        principalAmount: diamond.minimumCapital,
        returnPercentageSnapshot: diamond.returnPercentage,
        maturityAmount: diamond.maturityAmount,
        durationDays: diamond.durationDays,
        status: "QUEUED",
        cycleId: upcomingCycle.id,
        queuedAt: now,
      },
    });

    await tx.payment.create({
      data: {
        reference: await nextReference("payment", tx),
        userId: active.id,
        investmentId: investment.id,
        asset: "USDT",
        network: "DEMO-NETWORK",
        walletAddress: "DEMO-WALLET-ADDRESS-NOT-REAL",
        expectedAmount: diamond.minimumCapital,
        submittedAmount: diamond.minimumCapital,
        transactionHash: `DEMOHASH${investment.id.slice(0, 20)}`,
        status: "APPROVED",
        submittedAt: now,
        approvedAt: now,
      },
    });
  });

  // --- A MATURED investment, so withdraw/rollover can be exercised ---------
  await prisma.$transaction(async (tx) => {
    const startedAt = new Date(now.getTime() - 31 * 86_400_000);
    const reference = await nextReference("investment", tx);

    const investment = await tx.investment.create({
      data: {
        reference,
        userId: active.id,
        packageId: sapphire.id,
        packageNameSnapshot: sapphire.name,
        principalAmount: sapphire.minimumCapital,
        returnPercentageSnapshot: sapphire.returnPercentage,
        maturityAmount: sapphire.maturityAmount,
        durationDays: sapphire.durationDays,
        status: "MATURED",
        startedAt,
        maturesAt: maturityFor(startedAt, sapphire.durationDays),
        maturedAt: maturityFor(startedAt, sapphire.durationDays),
      },
    });

    await tx.payment.create({
      data: {
        reference: await nextReference("payment", tx),
        userId: active.id,
        investmentId: investment.id,
        asset: "USDT",
        network: "DEMO-NETWORK",
        walletAddress: "DEMO-WALLET-ADDRESS-NOT-REAL",
        expectedAmount: sapphire.minimumCapital,
        submittedAmount: sapphire.minimumCapital,
        transactionHash: `DEMOHASH${investment.id.slice(0, 20)}`,
        status: "APPROVED",
        submittedAt: startedAt,
        approvedAt: startedAt,
      },
    });

    await tx.transaction.create({
      data: {
        reference: await nextReference("transaction", tx),
        userId: active.id,
        investmentId: investment.id,
        type: "INVESTMENT_MATURED",
        amount: decimal(sapphire.maturityAmount.toString()),
        description: `DEMO DATA — ${reference} reached maturity`,
      },
    });
  });

  // --- A payment awaiting verification, so the admin queue is not empty ----
  await prisma.$transaction(async (tx) => {
    const reference = await nextReference("investment", tx);
    const investment = await tx.investment.create({
      data: {
        reference,
        userId: active.id,
        packageId: gold.id,
        packageNameSnapshot: gold.name,
        principalAmount: gold.minimumCapital,
        returnPercentageSnapshot: gold.returnPercentage,
        maturityAmount: gold.maturityAmount,
        durationDays: gold.durationDays,
        status: "PAYMENT_SUBMITTED",
      },
    });

    await tx.payment.create({
      data: {
        reference: await nextReference("payment", tx),
        userId: active.id,
        investmentId: investment.id,
        asset: "USDT",
        network: "DEMO-NETWORK",
        walletAddress: "DEMO-WALLET-ADDRESS-NOT-REAL",
        expectedAmount: gold.minimumCapital,
        submittedAmount: gold.minimumCapital,
        transactionHash: `DEMOPENDING${investment.id.slice(0, 16)}`,
        status: "SUBMITTED",
        submittedAt: now,
      },
    });
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: active.id,
        title: "Demo notification",
        message: "This is sample data created by seed-demo.ts and is not real account activity.",
        type: "INFO",
      },
    ],
  });

  console.info("investments: active, queued, matured and awaiting-verification examples created");
  console.info("\nDemo seed complete. All demo records are labelled and use the");
  console.info(`${DEMO_DOMAIN} email domain.\n`);
}

main()
  .catch((error) => {
    console.error("Demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
