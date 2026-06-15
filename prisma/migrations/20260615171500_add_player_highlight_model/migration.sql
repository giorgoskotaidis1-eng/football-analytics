-- CreateTable
CREATE TABLE "PlayerHighlight" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "matchId" INTEGER NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "outcome" TEXT,
    "includeHeatmap" BOOLEAN NOT NULL DEFAULT false,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerHighlight_playerId_idx" ON "PlayerHighlight"("playerId");

-- CreateIndex
CREATE INDEX "PlayerHighlight_matchId_idx" ON "PlayerHighlight"("matchId");

-- CreateIndex
CREATE INDEX "PlayerHighlight_createdById_idx" ON "PlayerHighlight"("createdById");

-- AddForeignKey
ALTER TABLE "PlayerHighlight" ADD CONSTRAINT "PlayerHighlight_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerHighlight" ADD CONSTRAINT "PlayerHighlight_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerHighlight" ADD CONSTRAINT "PlayerHighlight_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
