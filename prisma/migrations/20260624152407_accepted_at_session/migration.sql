-- AlterTable
ALTER TABLE "SessionPlayer" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ALTER COLUMN "requestedAt" DROP NOT NULL,
ALTER COLUMN "requestedAt" DROP DEFAULT;
