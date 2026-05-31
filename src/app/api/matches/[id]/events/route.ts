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

  // Get user's team IDs to verify access
  const userTeams = await prisma.userTeam.findMany({
    where: { userId: user.id, status: "active" },
    select: { teamId: true },
  });
  
  const createdTeams = await prisma.team.findMany({
    where: { createdById: user.id },
    select: { id: true },
  });
  
  const userTeamIds = [
    ...userTeams.map((ut) => ut.teamId),
    ...createdTeams.map((t) => t.id),
  ];

  // Verify match access
  if (matchId) {
    const matchForAccess = await prisma.match.findUnique({
      where: { id: matchId },
      select: { homeTeamId: true, awayTeamId: true },
    });

    if (matchForAccess) {
      const hasAccess = userTeamIds.length > 0 && (
        (matchForAccess.homeTeamId && userTeamIds.includes(matchForAccess.homeTeamId)) ||
        (matchForAccess.awayTeamId && userTeamIds.includes(matchForAccess.awayTeamId))
      );

      if (!hasAccess && userTeamIds.length > 0) {
        return NextResponse.json({ ok: false, message: "You don't have access to this match" }, { status: 403 });
      }
    }
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

  // Get user's team IDs to verify access
  const userTeams = await prisma.userTeam.findMany({
    where: { userId: user.id, status: "active" },
    select: { teamId: true },
  });
  
  const createdTeams = await prisma.team.findMany({
    where: { createdById: user.id },
    select: { id: true },
  });
  
  const userTeamIds = [
    ...userTeams.map((ut) => ut.teamId),
    ...createdTeams.map((t) => t.id),
  ];

  // Verify match exists and user has access
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  
  if (!match) {
    return NextResponse.json({ ok: false, message: "Match not found" }, { status: 404 });
  }

  // Verify user has access to this match
  const hasAccess = userTeamIds.length > 0 && (
    (match.homeTeamId && userTeamIds.includes(match.homeTeamId)) ||
    (match.awayTeamId && userTeamIds.includes(match.awayTeamId))
  );

  if (!hasAccess && userTeamIds.length > 0) {
    return NextResponse.json({ ok: false, message: "You don't have access to this match" }, { status: 403 });
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

  // Auto-update player stats if event has a player
  const eventPlayerId = event.player?.id;
  if (eventPlayerId) {
    try {
      const { updatePlayerStatsFromEvents } = await import("@/lib/player-stats-calculator");
      await updatePlayerStatsFromEvents(eventPlayerId);
    } catch (error) {
      console.error("[events] Failed to update player stats:", error);
      // Don't fail the request if stats update fails
    }
  }

  return NextResponse.json({ ok: true, event }, { status: 201 });
}

