/**
 * GET    /api/chat/memories       — List the current user's MemoryItems.
 * DELETE /api/chat/memories       — Delete all MemoryItems for the current user.
 * DELETE /api/chat/memories?all=true — Also delete all conversations + messages.
 *
 * All operations are strictly scoped to the authenticated user.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const memories = await prisma.memoryItem.findMany({
    where: { userId: user.id },
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
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const deleteAll = url.searchParams.get("all") === "true";

  // Always delete MemoryItems
  await prisma.memoryItem.deleteMany({ where: { userId: user.id } });

  if (deleteAll) {
    // Also wipe all conversations (ChatMessages cascade via FK)
    await prisma.conversation.deleteMany({ where: { userId: user.id } });
  }

  return NextResponse.json({
    ok: true,
    message: deleteAll
      ? "All chat history and memory cleared"
      : "Memory cleared",
  });
}
