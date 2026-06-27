/*
  Warnings:

  - The values [queue,court] on the enum `GameStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "CourtStatus" AS ENUM ('idle', 'started', 'paused', 'ended');

-- AlterEnum
BEGIN;
CREATE TYPE "GameStatus_new" AS ENUM ('waiting', 'queued', 'playing', 'paid');
ALTER TABLE "public"."SessionPlayer" ALTER COLUMN "gameStatus" DROP DEFAULT;
ALTER TABLE "SessionPlayer" ALTER COLUMN "gameStatus" TYPE "GameStatus_new" USING ("gameStatus"::text::"GameStatus_new");
ALTER TYPE "GameStatus" RENAME TO "GameStatus_old";
ALTER TYPE "GameStatus_new" RENAME TO "GameStatus";
DROP TYPE "public"."GameStatus_old";
ALTER TABLE "SessionPlayer" ALTER COLUMN "gameStatus" SET DEFAULT 'waiting';
COMMIT;

-- AlterTable
ALTER TABLE "Court" ADD COLUMN     "status" "CourtStatus" NOT NULL DEFAULT 'idle';
