-- CreateEnum
CREATE TYPE "Team" AS ENUM ('a', 'b');

-- CreateTable
CREATE TABLE "CourtSlot" (
    "id" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "sessionPlayerId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "team" "Team" NOT NULL,
    "isWin" BOOLEAN,

    CONSTRAINT "CourtSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourtSlot_sessionPlayerId_key" ON "CourtSlot"("sessionPlayerId");

-- CreateIndex
CREATE INDEX "CourtSlot_courtId_idx" ON "CourtSlot"("courtId");

-- AddForeignKey
ALTER TABLE "CourtSlot" ADD CONSTRAINT "CourtSlot_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtSlot" ADD CONSTRAINT "CourtSlot_sessionPlayerId_fkey" FOREIGN KEY ("sessionPlayerId") REFERENCES "SessionPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
