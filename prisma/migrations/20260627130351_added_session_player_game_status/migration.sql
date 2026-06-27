-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('waiting', 'queue', 'court');

-- AlterTable
ALTER TABLE "SessionPlayer" ADD COLUMN     "gameStatus" "GameStatus" NOT NULL DEFAULT 'waiting';
