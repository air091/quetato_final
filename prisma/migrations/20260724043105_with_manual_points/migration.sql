-- CreateTable
CREATE TABLE "ManualPoint" (
    "id" TEXT NOT NULL,
    "communityPlayerId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManualPoint_communityPlayerId_idx" ON "ManualPoint"("communityPlayerId");

-- AddForeignKey
ALTER TABLE "ManualPoint" ADD CONSTRAINT "ManualPoint_communityPlayerId_fkey" FOREIGN KEY ("communityPlayerId") REFERENCES "CommunityPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
