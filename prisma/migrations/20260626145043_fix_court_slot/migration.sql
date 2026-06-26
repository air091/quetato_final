-- DropIndex
DROP INDEX "CourtSlot_sessionPlayerId_key";

-- CreateIndex
CREATE INDEX "CourtSlot_sessionPlayerId_idx" ON "CourtSlot"("sessionPlayerId");
