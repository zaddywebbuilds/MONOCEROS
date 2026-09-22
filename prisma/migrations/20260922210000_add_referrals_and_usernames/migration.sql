-- CreateEnum
CREATE TYPE "ReferralEarningStatus" AS ENUM ('PENDING', 'PAYABLE', 'PAID', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'REFERRAL_BONUS_EARNED';
ALTER TYPE "TransactionType" ADD VALUE 'REFERRAL_PAYOUT_PAID';

-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "comingSoon" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredById" TEXT,
ADD COLUMN     "username" TEXT;

-- CreateTable
CREATE TABLE "ReferralEarning" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "investmentId" TEXT,
    "percentage" DECIMAL(8,4) NOT NULL,
    "profitAmount" DECIMAL(18,6) NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "status" "ReferralEarningStatus" NOT NULL DEFAULT 'PAYABLE',
    "payoutId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralPayout" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "method" "WithdrawalMethod" NOT NULL DEFAULT 'USDT_WALLET',
    "walletAddress" TEXT,
    "walletNetwork" TEXT,
    "bankDetails" JSONB,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedById" TEXT,
    "processedAt" TIMESTAMP(3),
    "paymentTxid" TEXT,
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralEarning_reference_key" ON "ReferralEarning"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralEarning_investmentId_key" ON "ReferralEarning"("investmentId");

-- CreateIndex
CREATE INDEX "ReferralEarning_referrerId_status_idx" ON "ReferralEarning"("referrerId", "status");

-- CreateIndex
CREATE INDEX "ReferralEarning_investorId_idx" ON "ReferralEarning"("investorId");

-- CreateIndex
CREATE INDEX "ReferralEarning_payoutId_idx" ON "ReferralEarning"("payoutId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralPayout_reference_key" ON "ReferralPayout"("reference");

-- CreateIndex
CREATE INDEX "ReferralPayout_referrerId_idx" ON "ReferralPayout"("referrerId");

-- CreateIndex
CREATE INDEX "ReferralPayout_status_idx" ON "ReferralPayout"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "User_referredById_idx" ON "User"("referredById");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralEarning" ADD CONSTRAINT "ReferralEarning_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralEarning" ADD CONSTRAINT "ReferralEarning_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralEarning" ADD CONSTRAINT "ReferralEarning_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralEarning" ADD CONSTRAINT "ReferralEarning_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "ReferralPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralPayout" ADD CONSTRAINT "ReferralPayout_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

