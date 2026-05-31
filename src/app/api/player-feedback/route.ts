import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FeedbackBody = {
  playerId?: number | string;
  strengths?: unknown;
  improvements?: unknown;
  rating?: number | string | null;
};

function normalizeStringList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const cleaned: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (trimmed) cleaned.push(trimmed.slice(0, 500));
  }
  return cleaned.slice(0, 50);
}

function parseStoredList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function clampRating(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(10, Math.max(0, n));
}

function parsePositiveInt(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function serializeFeedback(record: {
  id: number;
  authorId: number;
  playerId: number;
  strengths: string;
  improvements: string;
  rating: number | null;
  createdAt: Date;
  updatedAt: Date;
  player?: {
    id: number;
    name: string;
    position: string;
    club: string | null;
    team: { id: number; name: string } | null;
  } | null;
}) {
  return {
    id: record.id,
    authorId: record.authorId,
    playerId: record.playerId,
    strengths: parseStoredList(record.strengths),
    improvements: parseStoredList(record.improvements),
    rating: record.rating,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    player: record.player
      ? {
          id: record.player.id,
          name: record.player.name,
          position: record.player.position,
          club: record.player.club,
          team: record.player.team,
        }
      : null,
  };
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as FeedbackBody | null;
  if (!body) {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const playerId = parsePositiveInt(body.playerId);
  if (!playerId) {
    return NextResponse.json(
      { ok: false, message: "playerId is required" },
      { status: 400 }
    );
  }

  const strengths = normalizeStringList(body.strengths);
  const improvements = normalizeStringList(body.improvements);
  if (strengths.length === 0 && improvements.length === 0) {
    return NextResponse.json(
      { ok: false, message: "Provide at least one strength or improvement note." },
      { status: 400 }
    );
  }

  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { id: true } });
  if (!player) {
    return NextResponse.json({ ok: false, message: "Player not found" }, { status: 404 });
  }

  const created = await prisma.playerFeedback.create({
    data: {
      authorId: user.id,
      playerId,
      strengths: JSON.stringify(strengths),
      improvements: JSON.stringify(improvements),
      rating: clampRating(body.rating),
    },
    include: {
      player: {
        select: {
          id: true,
          name: true,
          position: true,
          club: true,
          team: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({ ok: true, feedback: serializeFeedback(created) });
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const teamId = parsePositiveInt(url.searchParams.get("teamId"));
  const playerId = parsePositiveInt(url.searchParams.get("playerId"));
  const positionRaw = url.searchParams.get("position");
  const position = positionRaw && positionRaw.trim() ? positionRaw.trim() : null;
  const limitRaw = parsePositiveInt(url.searchParams.get("limit"));
  const limit = Math.min(limitRaw ?? 100, 200);

  const playerFilter: Record<string, unknown> = {};
  if (teamId) playerFilter.teamId = teamId;
  if (position) playerFilter.position = position;

  const records = await prisma.playerFeedback.findMany({
    where: {
      authorId: user.id,
      ...(playerId ? { playerId } : {}),
      ...(Object.keys(playerFilter).length > 0 ? { player: playerFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      player: {
        select: {
          id: true,
          name: true,
          position: true,
          club: true,
          team: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    feedback: records.map(serializeFeedback),
  });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = parsePositiveInt(url.searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const existing = await prisma.playerFeedback.findFirst({
    where: { id, authorId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Feedback not found" }, { status: 404 });
  }

  await prisma.playerFeedback.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
