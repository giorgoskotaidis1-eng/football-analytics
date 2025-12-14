import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    console.log("[players/[id].GET] Looking for player with slug/id:", id);

    // Try to find by slug first, then by id if slug doesn't work
    let player = await prisma.player.findUnique({
      where: { slug: id },
      include: {
        team: {
          select: { id: true, name: true, league: true },
        },
        matchEvents: {
          include: {
            match: {
              select: { id: true, date: true, competition: true },
            },
          },
        },
      },
    });

    // If not found by slug, try by id (in case someone uses numeric id)
    if (!player) {
      const numericId = parseInt(id);
      if (!isNaN(numericId)) {
        console.log("[players/[id].GET] Not found by slug, trying by id:", numericId);
        player = await prisma.player.findUnique({
          where: { id: numericId },
          include: {
            team: {
              select: { id: true, name: true, league: true },
            },
            matchEvents: {
              include: {
                match: {
                  select: { id: true, date: true, competition: true },
                },
              },
            },
          },
        });
        if (player) {
          console.log("[players/[id].GET] Found player by id:", player.id, player.name, "slug:", player.slug);
        }
      } else {
        // If id is not numeric, try to find all players and check their slugs
        console.log("[players/[id].GET] id is not numeric, checking all players for slug match...");
        const allPlayers = await prisma.player.findMany({
          select: { id: true, name: true, slug: true },
          take: 100, // Limit to avoid performance issues
        });
        console.log("[players/[id].GET] Sample players:", allPlayers.slice(0, 5).map(p => ({ id: p.id, name: p.name, slug: p.slug })));
      }
    }

    if (!player) {
      console.log("[players/[id].GET] Player not found with slug/id:", id);
      // Try to get all players to see what slugs exist
      const samplePlayers = await prisma.player.findMany({
        select: { id: true, name: true, slug: true },
        take: 10,
      });
      console.log("[players/[id].GET] Sample players in DB:", samplePlayers.map(p => ({ id: p.id, name: p.name, slug: p.slug })));
      return NextResponse.json({ ok: false, message: `Player not found with slug/id: ${id}` }, { status: 404 });
    }

    console.log("[players/[id].GET] Found player:", player.id, player.name, player.slug);

  // Calculate detailed stats from events
  const events = player.matchEvents || [];
  const uniqueMatchIds = new Set(events.map((e) => e.matchId));
  const matchesCount = uniqueMatchIds.size;

  // Calculate game time (max minute per match)
  const matchMinutes = new Map<number, number>();
  events.forEach((event) => {
    if (event.minute !== null) {
      const currentMax = matchMinutes.get(event.matchId) || 0;
      matchMinutes.set(event.matchId, Math.max(currentMax, event.minute));
    }
  });
  const totalMinutes = Array.from(matchMinutes.values()).reduce((sum, min) => sum + min, 0);
  const minutes90 = totalMinutes / 90;

  // Helper to parse metadata
  const parseMetadata = (metadata: string | null): Record<string, any> => {
    if (!metadata) return {};
    try {
      return JSON.parse(metadata);
    } catch {
      return {};
    }
  };

  // Calculate stats
  const shots = events.filter((e) => e.type === "shot");
  const goals = shots.filter((e) => {
    const meta = parseMetadata(e.metadata);
    return meta.outcome === "goal";
  }).length;
  const shotsOnTarget = shots.filter((e) => {
    const meta = parseMetadata(e.metadata);
    return meta.outcome === "on_target" || meta.outcome === "goal";
  }).length;
  const totalXG = shots.reduce((sum, e) => sum + (e.xg || 0), 0);
  const averageXG = shots.length > 0 ? totalXG / shots.length : 0;

  const passes = events.filter((e) => e.type === "pass");
  const successfulPasses = passes.filter((e) => {
    const meta = parseMetadata(e.metadata);
    return meta.outcome === "successful";
  }).length;
  const passAccuracy = passes.length > 0 ? (successfulPasses / passes.length) * 100 : 0;

  const touches = events.filter((e) => e.type === "touch").length;
  const tackles = events.filter((e) => e.type === "tackle").length;
  const interceptions = events.filter((e) => e.type === "interception").length;
  const clearances = events.filter((e) => e.type === "clearance").length;
  const blocks = events.filter((e) => e.type === "block").length;
  const fouls = events.filter((e) => e.type === "foul").length;
  
  // Calculate key passes (passes that lead to shots)
  const keyPasses = passes.filter((p) => {
    return shots.some(
      (s) =>
        s.matchId === p.matchId &&
        s.minute !== null &&
        p.minute !== null &&
        s.minute > p.minute &&
        s.minute <= p.minute + 1
    );
  }).length;

  // Calculate progressive passes (passes that advance the ball significantly)
  // A pass is progressive if it moves the ball into the final third (y < 33.33)
  // or if it has end coordinates and moves forward significantly
  const progressivePasses = passes.filter((p) => {
    if (p.x === null || p.y === null) return false;
    const pMeta = parseMetadata(p.metadata);
    if (pMeta.outcome !== "successful") return false;
    
    // Check if pass is into final third (most common progressive pass)
    if (p.y < 33.33) return true;
    
    // Check if pass has end coordinates and moves forward significantly
    if (pMeta.endX !== undefined && pMeta.endY !== undefined) {
      const forwardDistance = p.y - pMeta.endY; // Forward = lower y value
      if (forwardDistance >= 10) return true; // At least 10% forward
    }
    
    return false;
  }).length;

  // Passes into final third (y < 33.33)
  const passesIntoFinalThird = passes.filter((p) => {
    if (p.y === null) return false;
    const pMeta = parseMetadata(p.metadata);
    return pMeta.outcome === "successful" && p.y < 33.33;
  }).length;

  // Passes into penalty area (y < ~15.7, which is approximately the penalty area line)
  const passesIntoPenaltyArea = passes.filter((p) => {
    if (p.y === null) return false;
    const pMeta = parseMetadata(p.metadata);
    return pMeta.outcome === "successful" && p.y < 15.7;
  }).length;

  // Long passes (passes with distance > 30% of pitch)
  const longPasses = passes.filter((p) => {
    if (p.x === null || p.y === null) return false;
    const pMeta = parseMetadata(p.metadata);
    if (pMeta.outcome !== "successful") return false;
    if (pMeta.endX !== undefined && pMeta.endY !== undefined) {
      const distance = Math.sqrt(
        Math.pow((pMeta.endX - p.x), 2) + Math.pow((pMeta.endY - p.y), 2)
      );
      return distance > 30; // More than 30% of pitch
    }
    return false;
  }).length;

  // Calculate assists
  let assists = 0;
  const goalsByMatch = new Map<number, typeof shots>();
  shots.filter((s) => {
    const meta = parseMetadata(s.metadata);
    return meta.outcome === "goal";
  }).forEach((goal) => {
    if (goal.matchId) {
      if (!goalsByMatch.has(goal.matchId)) {
        goalsByMatch.set(goal.matchId, []);
      }
      goalsByMatch.get(goal.matchId)!.push(goal);
    }
  });

  goalsByMatch.forEach((matchGoals, matchId) => {
    matchGoals.forEach((goal) => {
      const assistPass = passes.find(
        (p) => {
          const pMeta = parseMetadata(p.metadata);
          return (
            p.matchId === matchId &&
            p.minute !== null &&
            goal.minute !== null &&
            p.minute <= goal.minute &&
            p.minute >= goal.minute - 2 &&
            pMeta.outcome === "successful"
          );
        }
      );
      if (assistPass) assists++;
    });
  });

  // Calculate xA
  const xA = passes
    .filter((p) => {
      return shots.some(
        (s) =>
          s.matchId === p.matchId &&
          s.minute !== null &&
          p.minute !== null &&
          s.minute > p.minute &&
          s.minute <= p.minute + 1
      );
    })
    .reduce((sum, p) => {
      const resultingShot = shots.find(
        (s) =>
          s.matchId === p.matchId &&
          s.minute !== null &&
          p.minute !== null &&
          s.minute > p.minute &&
          s.minute <= p.minute + 1
      );
      return sum + (resultingShot?.xg || 0);
    }, 0);

  // Per 90 normalization
  const normalizePer90 = (value: number) => {
    return minutes90 > 0 ? (value / minutes90) * 90 : 0;
  };

  const detailedStats = {
    matches: matchesCount,
    minutes: totalMinutes,
    goals,
    assists,
    shots: shots.length,
    shotsOnTarget,
    totalXG: Math.round(totalXG * 100) / 100,
    averageXG: Math.round(averageXG * 100) / 100,
    xA: Math.round(xA * 100) / 100,
    passes: passes.length,
    successfulPasses,
    passAccuracy: Math.round(passAccuracy * 10) / 10,
    keyPasses,
    progressivePasses,
    passesIntoFinalThird,
    passesIntoPenaltyArea,
    longPasses,
    touches,
    tackles,
    interceptions,
    clearances,
    blocks,
    fouls,
    // Per 90 stats
    goalsPer90: Math.round(normalizePer90(goals) * 10) / 10,
    assistsPer90: Math.round(normalizePer90(assists) * 10) / 10,
    shotsPer90: Math.round(normalizePer90(shots.length) * 10) / 10,
    xGPer90: Math.round(normalizePer90(totalXG) * 100) / 100,
    xAPer90: Math.round(normalizePer90(xA) * 100) / 100,
    passesPer90: Math.round(normalizePer90(passes.length) * 10) / 10,
    keyPassesPer90: Math.round(normalizePer90(keyPasses) * 10) / 10,
    progressivePassesPer90: Math.round(normalizePer90(progressivePasses) * 10) / 10,
    touchesPer90: Math.round(normalizePer90(touches) * 10) / 10,
    tacklesPer90: Math.round(normalizePer90(tackles) * 10) / 10,
    interceptionsPer90: Math.round(normalizePer90(interceptions) * 10) / 10,
    conversionRate: shots.length > 0 ? Math.round((goals / shots.length) * 1000) / 10 : 0,
  };

    return NextResponse.json({ 
      ok: true, 
      player: {
        ...player,
        matchEvents: undefined, // Remove events from response
      },
      stats: detailedStats,
    });
  } catch (error) {
    console.error("[players/[id].GET] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    position?: string;
    age?: number;
    club?: string;
    nationality?: string;
    foot?: string;
    teamId?: number;
    number?: number;
    goals?: number;
    assists?: number;
    xg?: number;
    xag?: number;
  } | null;

  if (!body) {
    return NextResponse.json({ ok: false, message: "Invalid body" }, { status: 400 });
  }

  const updateData: any = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.position !== undefined) updateData.position = body.position;
  if (body.age !== undefined) updateData.age = body.age;
  if (body.club !== undefined) updateData.club = body.club;
  if (body.nationality !== undefined) updateData.nationality = body.nationality;
  if (body.foot !== undefined) updateData.foot = body.foot;
  if (body.teamId !== undefined) updateData.teamId = body.teamId;
  if (body.number !== undefined) updateData.number = body.number;
  if (body.goals !== undefined) updateData.goals = body.goals;
  if (body.assists !== undefined) updateData.assists = body.assists;
  if (body.xg !== undefined) updateData.xg = body.xg;
  if (body.xag !== undefined) updateData.xag = body.xag;

  // Try to find by slug first, then by id
  let player = await prisma.player.findUnique({
    where: { slug: id },
  });

  if (!player) {
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      player = await prisma.player.findUnique({
        where: { id: numericId },
      });
    }
  }

  if (!player) {
    return NextResponse.json({ ok: false, message: "Player not found" }, { status: 404 });
  }

  const updatedPlayer = await prisma.player.update({
    where: { id: player.id },
    data: updateData,
    include: {
      team: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json({ ok: true, player: updatedPlayer });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    // Try to find by slug first, then by id
    let player = await prisma.player.findUnique({
      where: { slug: id },
    });

    if (!player) {
      const numericId = parseInt(id);
      if (!isNaN(numericId)) {
        player = await prisma.player.findUnique({
          where: { id: numericId },
        });
      }
    }

    if (!player) {
      return NextResponse.json({ ok: false, message: "Player not found" }, { status: 404 });
    }

    await prisma.player.delete({ where: { id: player.id } });

    return NextResponse.json({ ok: true, message: "Player deleted" });
  } catch (error) {
    console.error("[players/[id].DELETE] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

