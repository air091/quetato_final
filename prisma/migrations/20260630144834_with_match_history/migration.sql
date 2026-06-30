-- CreateTable
CREATE TABLE "MatchHistory" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "courtId" TEXT NOT NULL,
    "courtName" TEXT NOT NULL,
    "winningTeam" "Team" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchHistoryPlayer" (
    "id" TEXT NOT NULL,
    "matchHistoryId" TEXT NOT NULL,
    "sessionPlayerId" TEXT NOT NULL,
    "team" "Team" NOT NULL,
    "iswin" BOOLEAN NOT NULL,

    CONSTRAINT "MatchHistoryPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchHistory_sessionId_idx" ON "MatchHistory"("sessionId");

-- CreateIndex
CREATE INDEX "MatchHistory_courtId_idx" ON "MatchHistory"("courtId");

-- CreateIndex
CREATE INDEX "MatchHistoryPlayer_matchHistoryId_idx" ON "MatchHistoryPlayer"("matchHistoryId");

-- CreateIndex
CREATE INDEX "MatchHistoryPlayer_sessionPlayerId_idx" ON "MatchHistoryPlayer"("sessionPlayerId");

-- AddForeignKey
ALTER TABLE "MatchHistory" ADD CONSTRAINT "MatchHistory_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchHistoryPlayer" ADD CONSTRAINT "MatchHistoryPlayer_matchHistoryId_fkey" FOREIGN KEY ("matchHistoryId") REFERENCES "MatchHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchHistoryPlayer" ADD CONSTRAINT "MatchHistoryPlayer_sessionPlayerId_fkey" FOREIGN KEY ("sessionPlayerId") REFERENCES "SessionPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
