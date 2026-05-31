import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const CreatePlaylistSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  matchId: z.number().int().positive().optional().nullable(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const playlists = await prisma.playlist.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      match: {
        select: {
          id: true,
          slug: true,
          date: true,
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
          homeTeamName: true,
          awayTeamName: true,
        },
      },
      _count: { select: { clips: true } },
    },
  });

  return NextResponse.json({ ok: true, playlists });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const parsed = CreatePlaylistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_INPUT",
        message: parsed.error.issues[0]?.message ?? "Invalid playlist payload.",
      },
      { status: 400 }
    );
  }

  const { name, description, matchId } = parsed.data;

  if (matchId) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true },
    });
    if (!match) {
      return NextResponse.json(
        { ok: false, code: "MATCH_NOT_FOUND", message: "Selected match was not found." },
        { status: 404 }
      );
    }
  }

  const playlist = await prisma.playlist.create({
    data: {
      userId: user.id,
      name,
      description: description || null,
      matchId: matchId ?? null,
    },
    include: {
      match: {
        select: {
          id: true,
          slug: true,
          date: true,
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
          homeTeamName: true,
          awayTeamName: true,
        },
      },
      _count: { select: { clips: true } },
    },
  });

  return NextResponse.json(
    {
      ok: true,
      playlist,
    }
  );
}

