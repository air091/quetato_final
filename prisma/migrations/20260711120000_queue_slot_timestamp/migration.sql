-- Track when a player joins a Queue Court independently from their active match timer.
ALTER TABLE "CourtSlot" ADD COLUMN "queuedAt" TIMESTAMP(3);
