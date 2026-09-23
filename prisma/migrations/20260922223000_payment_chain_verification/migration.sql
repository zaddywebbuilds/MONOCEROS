-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('ONCHAIN', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentVerification" AS ENUM ('UNCHECKED', 'VERIFIED', 'WRONG_RECIPIENT', 'WRONG_ASSET', 'AMOUNT_SHORT', 'TOO_OLD', 'FAILED_ON_CHAIN', 'NOT_FOUND', 'UNSUPPORTED_NETWORK', 'UNAVAILABLE', 'EXEMPT');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "onChainAmount" DECIMAL(18,6),
ADD COLUMN     "source" "PaymentSource" NOT NULL DEFAULT 'ONCHAIN',
ADD COLUMN     "verification" "PaymentVerification" NOT NULL DEFAULT 'UNCHECKED',
ADD COLUMN     "verificationDetail" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

