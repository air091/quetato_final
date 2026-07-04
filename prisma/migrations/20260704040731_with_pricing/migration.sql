-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('PHP');

-- CreateTable
CREATE TABLE "Pricing" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "entranceFee" DECIMAL(65,30) NOT NULL,
    "perGameFee" DECIMAL(65,30) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'PHP',
    "totalFee" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pricing_pkey" PRIMARY KEY ("id")
);
