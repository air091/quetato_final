-- CreateEnum
CREATE TYPE "PlayerRoles" AS ENUM ('player', 'admin');

-- CreateTable
CREATE TABLE "CommunityPlayer" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PlayerRoles" NOT NULL DEFAULT 'player',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityPlayer_pkey" PRIMARY KEY ("id")
);
