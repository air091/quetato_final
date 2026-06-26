-- CreateEnum
CREATE TYPE "CourtType" AS ENUM ('match', 'queue');

-- CreateTable
CREATE TABLE "Court" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CourtType" NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Court_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Court_sessionId_idx" ON "Court"("sessionId");

-- AddForeignKey
ALTER TABLE "Court" ADD CONSTRAINT "Court_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Court" ADD CONSTRAINT "Court_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "SessionPlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Court" ADD CONSTRAINT "Court_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "SessionPlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
