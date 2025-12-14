import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const threadId = searchParams.get("threadId");

  if (threadId) {
    // Get messages for a specific thread
    const messages = await prisma.message.findMany({
      where: { threadId: parseInt(threadId) },
      include: {
        fromUser: {
          select: { id: true, name: true, email: true },
        },
        toUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ ok: true, messages });
  }

  // Get all threads
  const threads = await prisma.messageThread.findMany({
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: {
        select: { messages: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    threads: threads.map((t) => ({
      id: t.id,
      subject: t.subject,
      lastMessagePreview: t.messages[0]?.body?.substring(0, 50) || "No messages yet",
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    threadId?: number;
    subject?: string;
    toUserId?: number;
    body?: string;
  } | null;

  if (!body?.body) {
    return NextResponse.json({ ok: false, message: "Message body is required" }, { status: 400 });
  }

  if (body.threadId) {
    // Add message to existing thread
    // Note: We need to determine toUserId from the thread
    const message = await prisma.message.create({
      data: {
        threadId: body.threadId,
        fromUserId: user.id,
        toUserId: body.toUserId || user.id, // TODO: Get from thread
        body: body.body,
      },
    });

    // Update thread updatedAt
    await prisma.messageThread.update({
      where: { id: body.threadId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true, message });
  }

  // Create new thread
  if (!body.subject || !body.toUserId) {
    return NextResponse.json({ ok: false, message: "Subject and toUserId are required for new thread" }, { status: 400 });
  }

  const thread = await prisma.messageThread.create({
    data: {
      subject: body.subject,
      messages: {
        create: {
          fromUserId: user.id,
          toUserId: body.toUserId,
          body: body.body,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, thread }, { status: 201 });
}
