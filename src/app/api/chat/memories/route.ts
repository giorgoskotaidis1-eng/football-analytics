/**
 * GET    /api/chat/memories       — List the current user's MemoryItems.
 * DELETE /api/chat/memories       — Delete all MemoryItems for the current user.
 * DELETE /api/chat/memories?all=true — Also delete all conversations + messages.
 *
 * All operations are strictly scoped to the authenticated user.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 }
    );
  }
  const userId = session.userId;

  const memories = await prisma.memoryItem.findMany({
    where: { userId },
    orderBy: [{ importanceScore: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      summary: true,
      importanceScore: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, memories });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 }
    );
  }
  const userId = session.userId;

  const url = new URL(request.url);
  const deleteAll = url.searchParams.get("all") === "true";

  // Always delete MemoryItems
  await prisma.memoryItem.deleteMany({ where: { userId } });

  if (deleteAll) {
    // Also wipe all conversations (ChatMessages cascade via FK)
    await prisma.conversation.deleteMany({ where: { userId } });
  }

  return NextResponse.json({
    ok: true,
    message: deleteAll
      ? "All chat history and memory cleared"
      : "Memory cleared",
  });
}
