import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { calculateXG } from "@/lib/analytics";

export const runtime = "nodejs";

// Cache invalidation helper (shared with analytics route)
declare global {
  var analyticsCache: Map<string, { data: any; timestamp: number; eventCount: number }> | undefined;
}

function invalidateAnalyticsCache(matchId: number) {
  if (typeof global !== "undefined" && global.analyticsCache) {
    global.analyticsCache.delete(`analytics-${matchId}`);
  }
}

// Get all events for a match
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  
  // Support both numeric ID and slug (like the match endpoint)
  let matchId: number | null = null;
  const parsedId = parseInt(id);
  
  if (!isNaN(parsedId)) {
    // It's a numeric ID
    matchId = parsedId;
  } else {
    // It's a slug - find match by slug first
    const match = await prisma.match.findUnique({
      where: { slug: id },
      select: { id: true },
    });
    
    if (!match) {
      return NextResponse.json({ ok: false, message: "Match not found" }, { status: 404 });
    }
    
    matchId = match.id;
  }

  // Only select needed fields for better performance
  const events = await prisma.matchEvent.findMany({
    where: { matchId },
    select: {
      id: true,
      type: true,
      team: true,
      x: true,
      y: true,
      minute: true,
      xg: true,
      metadata: true,
      player: {
        select: { id: true, name: true },
      },
    },
    orderBy: { minute: "asc" },
  });

  return NextResponse.json({ ok: true, events });
}

// Create a new event
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  
  // Support both numeric ID and slug (like the match endpoint)
  let matchId: number | null = null;
  const parsedId = parseInt(id);
  
  if (!isNaN(parsedId)) {
    // It's a numeric ID
    matchId = parsedId;
  } else {
    // It's a slug - find match by slug first
    const match = await prisma.match.findUnique({
      where: { slug: id },
      select: { id: true },
    });
    
    if (!match) {
      return NextResponse.json({ ok: false, message: "Match not found" }, { status: 404 });
    }
    
    matchId = match.id;
  }

  // Verify match exists
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return NextResponse.json({ ok: false, message: "Match not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    type?: string;
    team?: string;
    playerId?: number;
    x?: number;
    y?: number;
    minute?: number;
    metadata?: Record<string, any>;
  } | null;

  if (!body?.type || !body.team) {
    return NextResponse.json({ ok: false, message: "Type and team are required" }, { status: 400 });
  }

  // Calculate xG for shots
  let xg: number | null = null;
  if (body.type === "shot" && body.x !== undefined && body.y !== undefined) {
    const metadata = body.metadata || {};
    xg = calculateXG({
      x: body.x,
      y: body.y,
      shotType: metadata.shotType,
      bodyPart: metadata.bodyPart,
      outcome: metadata.outcome,
    });
  }

  const event = await prisma.matchEvent.create({
    data: {
      matchId,
      type: body.type,
      team: body.team,
      playerId: body.playerId || null,
      x: body.x || null,
      y: body.y || null,
      minute: body.minute || null,
      metadata: body.metadata ? JSON.stringify(body.metadata) : null,
      xg: xg,
    },
    select: {
      id: true,
      type: true,
      team: true,
      x: true,
      y: true,
      minute: true,
      xg: true,
      metadata: true,
      player: {
        select: { id: true, name: true },
      },
    },
  });

  // Invalidate analytics cache when new event is added
  invalidateAnalyticsCache(matchId);

  return NextResponse.json({ ok: true, event }, { status: 201 });
}

