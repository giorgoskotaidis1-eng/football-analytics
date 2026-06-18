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

/** Parse and validate the route param `id` as a positive integer. */
function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
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

  return NextResponse.json({
    ok: true,
    conversation: {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    },
    messages,
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

  // ChatMessages are deleted via onDelete: Cascade in the schema
  await prisma.conversation.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
