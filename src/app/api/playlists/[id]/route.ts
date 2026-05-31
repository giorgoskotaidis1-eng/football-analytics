import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const UpdatePlaylistSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

async function getOwnedPlaylistOrNull(userId: number, playlistId: number) {
  return prisma.playlist.findFirst({
    where: { id: playlistId, userId },
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
      clips: {
        orderBy: { position: "asc" },
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
      },
      _count: { select: { clips: true } },
    },
  });
}

function parseId(rawId: string): number | null {
  const n = Number(rawId);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const playlistId = parseId(id);
  if (!playlistId) {
    return NextResponse.json({ ok: false, message: "Invalid playlist id." }, { status: 400 });
  }

  const playlist = await getOwnedPlaylistOrNull(user.id, playlistId);
  if (!playlist) {
    return NextResponse.json({ ok: false, message: "Playlist not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, playlist });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const playlistId = parseId(id);
  if (!playlistId) {
    return NextResponse.json({ ok: false, message: "Invalid playlist id." }, { status: 400 });
  }

  const existing = await prisma.playlist.findFirst({
    where: { id: playlistId, userId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Playlist not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const parsed = UpdatePlaylistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid payload." },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  if (payload.name === undefined && payload.description === undefined) {
    return NextResponse.json({ ok: false, message: "No changes provided." }, { status: 400 });
  }

  const updated = await prisma.playlist.update({
    where: { id: playlistId },
    data: {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
    },
  });

  return NextResponse.json({ ok: true, playlist: updated });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const playlistId = parseId(id);
  if (!playlistId) {
    return NextResponse.json({ ok: false, message: "Invalid playlist id." }, { status: 400 });
  }

  const existing = await prisma.playlist.findFirst({
    where: { id: playlistId, userId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Playlist not found." }, { status: 404 });
  }

  await prisma.playlist.delete({ where: { id: playlistId } });
  return NextResponse.json({ ok: true });
}
