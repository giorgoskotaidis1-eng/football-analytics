import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const CreateClipSchema = z.object({
  matchId: z.number().int().positive(),
  title: z.string().trim().min(1).max(160),
  startSec: z.number().int().min(0),
  endSec: z.number().int().min(1),
  matchEventId: z.number().int().positive().optional(),
});

function parseId(rawId: string): number | null {
  const n = Number(rawId);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function findOwnedPlaylist(userId: number, playlistId: number) {
  return prisma.playlist.findFirst({
    where: { id: playlistId, userId },
    select: { id: true },
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const playlistId = parseId(id);
  if (!playlistId) {
    return NextResponse.json({ ok: false, message: "Invalid playlist id." }, { status: 400 });
  }

  const playlist = await findOwnedPlaylist(user.id, playlistId);
  if (!playlist) {
    return NextResponse.json({ ok: false, message: "Playlist not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const parsed = CreateClipSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid payload." },
      { status: 400 }
    );
  }

  const { matchId, title, startSec, endSec, matchEventId } = parsed.data;
  if (endSec <= startSec) {
    return NextResponse.json(
      { ok: false, message: "endSec must be greater than startSec." },
      { status: 400 }
    );
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true },
  });
  if (!match) {
    return NextResponse.json({ ok: false, message: "Match not found." }, { status: 404 });
  }

  if (matchEventId) {
    const event = await prisma.matchEvent.findUnique({
      where: { id: matchEventId },
      select: { id: true, matchId: true },
    });
    if (!event) {
      return NextResponse.json({ ok: false, message: "Match event not found." }, { status: 404 });
    }
    if (event.matchId !== matchId) {
      return NextResponse.json(
        { ok: false, message: "matchEventId does not belong to the selected match." },
        { status: 400 }
      );
    }
  }

  const lastClip = await prisma.playlistClip.findFirst({
    where: { playlistId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const clip = await prisma.playlistClip.create({
    data: {
      playlistId,
      matchId,
      matchEventId: matchEventId ?? null,
      title,
      startSec,
      endSec,
      position: (lastClip?.position ?? -1) + 1,
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
      matchEvent: {
        select: {
          id: true,
          type: true,
          minute: true,
          x: true,
          y: true,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, clip });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const playlistId = parseId(id);
  if (!playlistId) {
    return NextResponse.json({ ok: false, message: "Invalid playlist id." }, { status: 400 });
  }

  const playlist = await findOwnedPlaylist(user.id, playlistId);
  if (!playlist) {
    return NextResponse.json({ ok: false, message: "Playlist not found." }, { status: 404 });
  }

  const clipIdRaw = new URL(request.url).searchParams.get("clipId");
  const clipId = clipIdRaw ? Number(clipIdRaw) : Number.NaN;
  if (!Number.isInteger(clipId) || clipId <= 0) {
    return NextResponse.json({ ok: false, message: "Invalid clip id." }, { status: 400 });
  }

  const clip = await prisma.playlistClip.findFirst({
    where: { id: clipId, playlistId },
    select: { id: true },
  });
  if (!clip) {
    return NextResponse.json({ ok: false, message: "Clip not found." }, { status: 404 });
  }

  await prisma.playlistClip.delete({ where: { id: clipId } });
  return NextResponse.json({ ok: true });
}
