CREATE TABLE IF NOT EXISTS "PlayerFeedback" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "authorId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "strengths" TEXT NOT NULL DEFAULT '[]',
    "improvements" TEXT NOT NULL DEFAULT '[]',
    "rating" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayerFeedback_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerFeedback_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PlayerFeedback_authorId_createdAt_idx" ON "PlayerFeedback"("authorId", "createdAt");
CREATE INDEX IF NOT EXISTS "PlayerFeedback_playerId_createdAt_idx" ON "PlayerFeedback"("playerId", "createdAt");
