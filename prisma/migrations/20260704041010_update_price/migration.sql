-- CreateIndex
CREATE INDEX "Pricing_sessionId_idx" ON "Pricing"("sessionId");

-- AddForeignKey
ALTER TABLE "Pricing" ADD CONSTRAINT "Pricing_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
