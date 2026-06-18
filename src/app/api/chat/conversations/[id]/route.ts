/**
 * GET  /api/chat/conversations/[id] — Load messages for a conversation.
 * DELETE /api/chat/conversations/[id] — Delete a conversation (+ its messages via cascade).
 *
 * Both operations are strictly scoped to the authenticated user.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AttachmentRow = {
  id: number;
  messageId: number;
  type: "image";
  name: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  dataUrl: string;
  createdAt: Date;
};

/** Parse and validate the route param `id` as a positive integer. */
function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function loadAttachmentsByMessageId(messageIds: number[]) {
  const byMessageId = new Map<number, Omit<AttachmentRow, "messageId">[]>();
  if (messageIds.length === 0) return byMessageId;

  try {
    const placeholders = messageIds.map((_, index) => `$${index + 1}`).join(", ");
    const rows = await prisma.$queryRawUnsafe<AttachmentRow[]>(
      `SELECT "id", "messageId", "type", "name", "mimeType", "sizeBytes", "dataUrl", "createdAt"
       FROM "ChatAttachment"
       WHERE "messageId" IN (${placeholders})
       ORDER BY "createdAt" ASC`,
      ...messageIds
    );

    for (const row of rows) {
      const existing = byMessageId.get(row.messageId) || [];
      existing.push({
        id: row.id,
        type: row.type,
        name: row.name,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        dataUrl: row.dataUrl,
        createdAt: row.createdAt,
      });
      byMessageId.set(row.messageId, existing);
    }
  } catch (err) {
    // Keep history loading even if attachments are not migrated yet.
    console.error("[api/chat/conversations] attachment load failed:", err);
  }

  return byMessageId;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 }
    );
  }
  const userId = session.userId;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) {
    return NextResponse.json(
      { ok: false, message: "Invalid conversation id" },
      { status: 400 }
    );
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: { id: true, userId: true, title: true, createdAt: true, updatedAt: true },
  });

  // Return 404 for both missing and other-user's conversations (no info leakage)
  if (!conversation || conversation.userId !== userId) {
    return NextResponse.json(
      { ok: false, message: "Conversation not found" },
      { status: 404 }
    );
  }

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true, createdAt: true },
  });

  const attachmentsByMessageId = await loadAttachmentsByMessageId(
    messages.map((message) => message.id)
  );

  return NextResponse.json({
    ok: true,
    conversation: {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    },
    messages: messages.map((message) => ({
      ...message,
      attachments: attachmentsByMessageId.get(message.id) || [],
    })),
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 }
    );
  }
  const userId = session.userId;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) {
    return NextResponse.json(
      { ok: false, message: "Invalid conversation id" },
      { status: 400 }
    );
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!conversation || conversation.userId !== userId) {
    return NextResponse.json(
      { ok: false, message: "Conversation not found" },
      { status: 404 }
    );
  }

  // ChatMessages and image attachments are deleted via cascade.
  await prisma.conversation.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
