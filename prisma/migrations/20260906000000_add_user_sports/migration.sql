-- CreateTable
CREATE TABLE "UserSport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sport" "Sports" NOT NULL,
    "skillLevel" "SkillLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSport_userId_sport_key" ON "UserSport"("userId", "sport");
CREATE INDEX "UserSport_userId_idx" ON "UserSport"("userId");

-- AddForeignKey
ALTER TABLE "UserSport" ADD CONSTRAINT "UserSport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
