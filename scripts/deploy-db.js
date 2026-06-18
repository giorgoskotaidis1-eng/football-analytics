const { PrismaClient } = require('@prisma/client');

function getDeployUrl() {
  const url = process.env.DIRECT_URL || process.env.PRISMA_DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required.');
  return url.includes('pooler.supabase.com:6543') ? url.replace(':6543', ':5432') : url;
}

async function main() {
  process.env.DATABASE_URL = getDeployUrl();
  const prisma = new PrismaClient();

  console.log('Preparing production database tables...');

  await prisma.$executeRaw`
    ALTER TABLE IF EXISTS "User"
      ADD COLUMN IF NOT EXISTS "auth0Id" TEXT;
  `;

  await prisma.$executeRaw`
    ALTER TABLE IF EXISTS "User"
      ALTER COLUMN "passwordHash" DROP NOT NULL;
  `;

  await prisma.$executeRaw`
    ALTER TABLE IF EXISTS "Player"
      ADD COLUMN IF NOT EXISTS "auth0Id" TEXT;
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "Conversation" (
      "id" SERIAL PRIMARY KEY,
      "userId" INTEGER NOT NULL,
      "title" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "ChatMessage" (
      "id" SERIAL PRIMARY KEY,
      "userId" INTEGER NOT NULL,
      "conversationId" INTEGER NOT NULL,
      "role" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "MemoryItem" (
      "id" SERIAL PRIMARY KEY,
      "userId" INTEGER NOT NULL,
      "summary" TEXT NOT NULL,
      "sourceMessageIds" TEXT NOT NULL DEFAULT '[]',
      "importanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Conversation_userId_idx" ON "Conversation"("userId");`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "ChatMessage_userId_createdAt_idx" ON "ChatMessage"("userId", "createdAt");`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "MemoryItem_userId_importanceScore_idx" ON "MemoryItem"("userId", "importanceScore");`;

  await prisma.$disconnect();
  console.log('Database is ready for the assistant.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
