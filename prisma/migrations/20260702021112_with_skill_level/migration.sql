-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('LB', 'BEG', 'HB', 'LI', 'INT', 'UI', 'ADV', 'EXP');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "skillLevel" "SkillLevel" NOT NULL DEFAULT 'LB';
