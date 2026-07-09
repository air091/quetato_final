-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'requested';

-- AlterTable
ALTER TABLE "CommunityPlayer" ADD COLUMN     "status" "ApplicationStatus" NOT NULL DEFAULT 'requested';

-- AlterTable
ALTER TABLE "SessionPlayer" ALTER COLUMN "status" SET DEFAULT 'requested';
