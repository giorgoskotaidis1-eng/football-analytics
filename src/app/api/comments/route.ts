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
  const targetType = searchParams.get("targetType") || "player";
  const targetSlug = searchParams.get("targetSlug") || "";

  if (!targetSlug) {
    return NextResponse.json({ ok: false, message: "targetSlug is required" }, { status: 400 });
  }

  const comments = await prisma.comment.findMany({
    where: {
      targetType,
      targetSlug,
    },
    include: {
      // Note: We need to add author relation in schema
    },
    orderBy: { createdAt: "desc" },
  });

  const commentsWithAuthor = await Promise.all(
    comments.map(async (c) => {
      const author = await prisma.user.findUnique({
        where: { id: c.authorId },
        select: { name: true, email: true },
      });
      return {
        id: c.id,
        author: author?.name || author?.email || "User",
        body: c.body,
        createdAt: c.createdAt.toISOString(),
      };
    })
  );

  return NextResponse.json({
    ok: true,
    comments: commentsWithAuthor,
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    targetType?: string;
    targetSlug?: string;
    body?: string;
  } | null;

  if (!body?.targetType || !body?.targetSlug || !body?.body) {
    return NextResponse.json({ ok: false, message: "targetType, targetSlug, and body are required" }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: {
      authorId: user.id,
      targetType: body.targetType,
      targetSlug: body.targetSlug,
      body: body.body,
    },
  });

  return NextResponse.json({ ok: true, comment }, { status: 201 });
}
