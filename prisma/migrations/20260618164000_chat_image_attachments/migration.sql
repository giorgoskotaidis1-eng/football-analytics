CREATE TABLE "ChatAttachment" (
  "id" SERIAL NOT NULL,
  "messageId" INTEGER NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'image',
  "name" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "dataUrl" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChatAttachment_messageId_idx" ON "ChatAttachment"("messageId");
CREATE INDEX "ChatAttachment_createdAt_idx" ON "ChatAttachment"("createdAt");

ALTER TABLE "ChatAttachment"
  ADD CONSTRAINT "ChatAttachment_messageId_fkey"
  FOREIGN KEY ("messageId")
  REFERENCES "ChatMessage"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
