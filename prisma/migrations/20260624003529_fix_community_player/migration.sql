/*
  Warnings:

  - A unique constraint covering the columns `[communityId,userId]` on the table `CommunityPlayer` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "Community_ownerId_idx" ON "Community"("ownerId");

-- CreateIndex
CREATE INDEX "CommunityPlayer_userId_idx" ON "CommunityPlayer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPlayer_communityId_userId_key" ON "CommunityPlayer"("communityId", "userId");

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPlayer" ADD CONSTRAINT "CommunityPlayer_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPlayer" ADD CONSTRAINT "CommunityPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
