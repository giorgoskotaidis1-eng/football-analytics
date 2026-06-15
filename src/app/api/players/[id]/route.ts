import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getUserTeamIds } from "@/lib/user-teams";

export const runtime = "nodejs";

type ParsedRouteEvent = {
  type: string;
  matchId: number;
  minute: number | null;
  x: number | null;
  y: number | null;
  xg: number | null;
  metadata: string | null;
  parsedMetadata: Record<string, unknown>;
  outcome: string | null;
};

function parseMetadata(metadata: string | null): Record<string, unknown> {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
}

function parseNumericRouteId(value: string): { numericId: number | null; invalidNumeric: boolean } {
  if (/^-?\d+$/.test(value)) {
    const numericId = Number.parseInt(value, 10);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return { numericId: null, invalidNumeric: true };
    }
    return { numericId, invalidNumeric: false };
  }
  return { numericId: null, invalidNumeric: false };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { numericId, invalidNumeric } = parseNumericRouteId(id);
    if (invalidNumeric) {
      return NextResponse.json({ ok: false, message: "Invalid player ID" }, { status: 400 });
    }

    const userTeamIds = await getUserTeamIds(user.id);
    const player = await prisma.player.findFirst({
      where: {
        OR: [{ slug: id }, ...(numericId !== null ? [{ id: numericId }] : [])],
      },
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

    if (!player) {
      return NextResponse.json({ ok: false, message: "Player not found" }, { status: 404 });
    }

    // Verify user has access to this player (through team)
    if (player.teamId && !userTeamIds.includes(player.teamId)) {
      return NextResponse.json({ ok: false, message: "You don't have access to this player" }, { status: 403 });
    }
    if (!player.teamId && userTeamIds.length > 0) {
      // Player without team - only allow if user has no teams (edge case)
      return NextResponse.json({ ok: false, message: "You don't have access to this player" }, { status: 403 });
    }

  const events = player.matchEvents || [];
  const parsedEvents: ParsedRouteEvent[] = events.map((event) => {
    const parsedMetadata = parseMetadata(event.metadata);
    return {
      ...event,
      parsedMetadata,
      outcome: typeof parsedMetadata.outcome === "string" ? parsedMetadata.outcome : null,
    };
  });

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

  const shots = parsedEvents.filter((e) => e.type === "shot");
  const passes = parsedEvents.filter((e) => e.type === "pass");
  const successfulPasses = passes.filter((e) => e.outcome === "successful");

  const shotsByMatchAndMinute = new Map<number, Map<number, ParsedRouteEvent[]>>();
  const successfulPassesByMatchAndMinute = new Map<number, Map<number, ParsedRouteEvent[]>>();
  const goalsByMatch = new Map<number, ParsedRouteEvent[]>();

  for (const shot of shots) {
    if (shot.outcome === "goal") {
      const goals = goalsByMatch.get(shot.matchId) || [];
      goals.push(shot);
      goalsByMatch.set(shot.matchId, goals);
    }
    if (shot.minute !== null) {
      if (!shotsByMatchAndMinute.has(shot.matchId)) {
        shotsByMatchAndMinute.set(shot.matchId, new Map());
      }
      const matchMap = shotsByMatchAndMinute.get(shot.matchId)!;
      const shotsAtMinute = matchMap.get(shot.minute) || [];
      shotsAtMinute.push(shot);
      matchMap.set(shot.minute, shotsAtMinute);
    }
  }

  for (const pass of successfulPasses) {
    if (pass.minute === null) continue;
    if (!successfulPassesByMatchAndMinute.has(pass.matchId)) {
      successfulPassesByMatchAndMinute.set(pass.matchId, new Map());
    }
    const matchMap = successfulPassesByMatchAndMinute.get(pass.matchId)!;
    const passesAtMinute = matchMap.get(pass.minute) || [];
    passesAtMinute.push(pass);
    matchMap.set(pass.minute, passesAtMinute);
  }

  const goals = shots.filter((e) => e.outcome === "goal").length;
  const shotsOnTarget = shots.filter((e) => e.outcome === "on_target" || e.outcome === "goal").length;
  const totalXG = shots.reduce((sum, e) => sum + (e.xg || 0), 0);
  const averageXG = shots.length > 0 ? totalXG / shots.length : 0;

  const successfulPassesCount = successfulPasses.length;
  const passAccuracy = passes.length > 0 ? (successfulPassesCount / passes.length) * 100 : 0;

  const touches = parsedEvents.filter((e) => e.type === "touch").length;
  const tackles = parsedEvents.filter((e) => e.type === "tackle").length;
  const interceptions = parsedEvents.filter((e) => e.type === "interception").length;
  const clearances = parsedEvents.filter((e) => e.type === "clearance").length;
  const blocks = parsedEvents.filter((e) => e.type === "block").length;
  const fouls = parsedEvents.filter((e) => e.type === "foul").length;
  
  let keyPasses = 0;
  let xA = 0;
  for (const pass of passes) {
    if (pass.minute === null) continue;
    const resultingShot = (shotsByMatchAndMinute.get(pass.matchId)?.get(pass.minute + 1) || [])[0];
    if (resultingShot) {
      keyPasses += 1;
      xA += resultingShot.xg || 0;
    }
  }

  // Calculate progressive passes (passes that advance the ball significantly)
  // A pass is progressive if it moves the ball into the final third (y < 33.33)
  // or if it has end coordinates and moves forward significantly
  const progressivePasses = passes.filter((p) => {
    if (p.x === null || p.y === null) return false;
    const pMeta = p.parsedMetadata;
    if (pMeta.outcome !== "successful") return false;
    
    // Check if pass is into final third (most common progressive pass)
    if (p.y < 33.33) return true;
    
    // Check if pass has end coordinates and moves forward significantly
    const endY = typeof pMeta.endY === "number" ? pMeta.endY : null;
    if (endY !== null) {
      const forwardDistance = p.y - endY; // Forward = lower y value
      if (forwardDistance >= 10) return true; // At least 10% forward
    }
    
    return false;
  }).length;

  // Passes into final third (y < 33.33)
  const passesIntoFinalThird = passes.filter((p) => {
    if (p.y === null) return false;
    const pMeta = p.parsedMetadata;
    return pMeta.outcome === "successful" && p.y < 33.33;
  }).length;

  // Passes into penalty area (y < ~15.7, which is approximately the penalty area line)
  const passesIntoPenaltyArea = passes.filter((p) => {
    if (p.y === null) return false;
    const pMeta = p.parsedMetadata;
    return pMeta.outcome === "successful" && p.y < 15.7;
  }).length;

  // Long passes (passes with distance > 30% of pitch)
  const longPasses = passes.filter((p) => {
    if (p.x === null || p.y === null) return false;
    const pMeta = p.parsedMetadata;
    if (pMeta.outcome !== "successful") return false;
    const endX = typeof pMeta.endX === "number" ? pMeta.endX : null;
    const endY = typeof pMeta.endY === "number" ? pMeta.endY : null;
    if (endX !== null && endY !== null) {
      const distance = Math.sqrt(
        Math.pow((endX - p.x), 2) + Math.pow((endY - p.y), 2)
      );
      return distance > 30; // More than 30% of pitch
    }
    return false;
  }).length;

  // Calculate assists
  let assists = 0;
  goalsByMatch.forEach((matchGoals, matchId) => {
    const passesByMinute = successfulPassesByMatchAndMinute.get(matchId);
    if (!passesByMinute) return;

    matchGoals.forEach((goal) => {
      if (goal.minute === null) return;
      for (let minute = goal.minute - 2; minute <= goal.minute; minute += 1) {
        if ((passesByMinute.get(minute) || []).length > 0) {
          assists += 1;
          return;
        }
      }
    });
  });

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
    successfulPasses: successfulPassesCount,
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
      { ok: false, message: "Failed to fetch player" },
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

  const updateData: Prisma.PlayerUncheckedUpdateInput = {};
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

  const { numericId, invalidNumeric } = parseNumericRouteId(id);
  if (invalidNumeric) {
    return NextResponse.json({ ok: false, message: "Invalid player ID" }, { status: 400 });
  }

  const player = await prisma.player.findFirst({
    where: {
      OR: [{ slug: id }, ...(numericId !== null ? [{ id: numericId }] : [])],
    },
  });

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
    
    const { numericId, invalidNumeric } = parseNumericRouteId(id);
    if (invalidNumeric) {
      return NextResponse.json({ ok: false, message: "Invalid player ID" }, { status: 400 });
    }

    const player = await prisma.player.findFirst({
      where: {
        OR: [{ slug: id }, ...(numericId !== null ? [{ id: numericId }] : [])],
      },
    });

    if (!player) {
      return NextResponse.json({ ok: false, message: "Player not found" }, { status: 404 });
    }

    await prisma.player.delete({ where: { id: player.id } });

    return NextResponse.json({ ok: true, message: "Player deleted" });
  } catch (error) {
    console.error("[players/[id].DELETE] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to delete player" },
      { status: 500 }
    );
  }
}
