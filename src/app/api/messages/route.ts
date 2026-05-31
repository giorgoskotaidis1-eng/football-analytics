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
    // Get messages for a specific thread - only if user is involved
    const messages = await prisma.message.findMany({
      where: {
        threadId: parseInt(threadId),
        OR: [
          { fromUserId: user.id },
          { toUserId: user.id },
        ],
      },
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

    return NextResponse.json({ ok: true, messages, currentUserId: user.id });
  }

  // Get threads where user is involved (sent or received messages)
  const userMessageThreadIds = await prisma.message.findMany({
    where: {
      OR: [
        { fromUserId: user.id },
        { toUserId: user.id },
      ],
    },
    select: { threadId: true },
    distinct: ["threadId"],
  });

  const threadIds = userMessageThreadIds.map((m) => m.threadId);

  if (threadIds.length === 0) {
    return NextResponse.json({ ok: true, threads: [] });
  }

  const threads = await prisma.messageThread.findMany({
    where: { id: { in: threadIds } },
    include: {
      messages: {
        where: {
          OR: [
            { fromUserId: user.id },
            { toUserId: user.id },
          ],
        },
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
    // Resolve recipient by inspecting the most recent message in this thread
    // that involves the current user. The other participant is the recipient.
    const lastMessage = await prisma.message.findFirst({
      where: {
        threadId: body.threadId,
        OR: [
          { fromUserId: user.id },
          { toUserId: user.id },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { fromUserId: true, toUserId: true },
    });

    if (!lastMessage) {
      return NextResponse.json(
        { ok: false, message: "Thread not found or you are not a participant" },
        { status: 404 }
      );
    }

    const resolvedToUserId =
      lastMessage.fromUserId === user.id ? lastMessage.toUserId : lastMessage.fromUserId;

    if (resolvedToUserId === user.id) {
      return NextResponse.json(
        { ok: false, message: "Could not determine recipient for thread" },
        { status: 400 }
      );
    }

    const message = await prisma.message.create({
      data: {
        threadId: body.threadId,
        fromUserId: user.id,
        toUserId: resolvedToUserId,
        body: body.body,
      },
    });

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
