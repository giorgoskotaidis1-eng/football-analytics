import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getUserTeamIds } from "@/lib/user-teams";

export const runtime = "nodejs";

function parseEventMeta(metadata: string | null | undefined): Record<string, unknown> {
  if (!metadata) return {};
  try {
    const v = JSON.parse(metadata);
    return typeof v === "object" && v !== null ? v : {};
  } catch {
    return {};
  }
}

type CompareEvent = {
  type: string;
  matchId: number;
  minute: number | null;
  xg: number | null;
  metadata: string | null;
};

function shotOutcome(e: CompareEvent): string | null {
  if (e.type !== "shot") return null;
  const o = parseEventMeta(e.metadata).outcome;
  return typeof o === "string" ? o : null;
}

function passWasSuccessful(e: CompareEvent): boolean {
  if (e.type !== "pass") return false;
  const m = parseEventMeta(e.metadata);
  if (typeof m.successful === "boolean") return m.successful;
  return m.outcome === "successful";
}

function normalizePlayerIds(playerIds: unknown[]): number[] {
  const normalized = playerIds
    .map((id) => (typeof id === "string" ? Number.parseInt(id, 10) : id))
    .filter((id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0);
  return Array.from(new Set(normalized));
}

// Get detailed stats for player comparison
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: { playerIds?: number[] } | null = null;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error("[players.compare] JSON parse error:", jsonError);
      return NextResponse.json({ ok: false, message: "Invalid JSON in request body" }, { status: 400 });
    }

    if (!body || !Array.isArray(body.playerIds) || body.playerIds.length === 0) {
      return NextResponse.json({ ok: false, message: "At least one player ID is required" }, { status: 400 });
    }

    if (body.playerIds.length > 4) {
      return NextResponse.json({ ok: false, message: "Maximum 4 players can be compared" }, { status: 400 });
    }

    const playerIds = normalizePlayerIds(body.playerIds);
    if (playerIds.length === 0) {
      return NextResponse.json({ ok: false, message: "At least one valid player ID is required" }, { status: 400 });
    }
    if (playerIds.length > 4) {
      return NextResponse.json({ ok: false, message: "Maximum 4 players can be compared" }, { status: 400 });
    }

    const userTeamIds = await getUserTeamIds(user.id);

    // Fetch players with all their match events
    const players = await prisma.player.findMany({
      where: {
        id: { in: playerIds },
        teamId: userTeamIds.length > 0 ? { in: userTeamIds } : undefined, // Only from user's teams
      },
      include: {
        team: {
          select: { id: true, name: true },
        },
        matchEvents: {
          include: {
            match: {
              select: { id: true, date: true },
            },
          },
        },
      },
    });

    if (players.length === 0) {
      return NextResponse.json({
        ok: true,
        players: [],
        message: "No players found with the provided IDs or no access.",
      });
    }

    // Calculate detailed stats for each player
    const playersWithStats = players.map((player) => {
      const events = (player.matchEvents || []) as CompareEvent[];
      
      // Get unique matches and calculate game time
      const uniqueMatchIds = new Set(events.map((e) => e.matchId));
      const matchesCount = uniqueMatchIds.size;
      
      const matchMinutes = new Map<number, number>();
      events.forEach((event) => {
        if (event.minute !== null) {
          const currentMax = matchMinutes.get(event.matchId) || 0;
          matchMinutes.set(event.matchId, Math.max(currentMax, event.minute));
        }
      });
      const totalMinutes = Array.from(matchMinutes.values()).reduce((sum, min) => sum + min, 0);
      const minutes90 = totalMinutes / 90; // For per 90 calculations

      // Calculate stats (outcomes live in metadata JSON, not a Prisma column)
      const shots = events.filter((e) => e.type === "shot");
      const goals = shots.filter((e) => shotOutcome(e) === "goal").length;
      const shotsOnTarget = shots.filter((e) => {
        const o = shotOutcome(e);
        return o === "goal" || o === "saved" || o === "on_target";
      }).length;
      const totalXG = shots.reduce((sum, e) => sum + (e.xg || 0), 0);
      const averageXG = shots.length > 0 ? totalXG / shots.length : 0;

      const passes = events.filter((e) => e.type === "pass");
      const successfulPasses = passes.filter((e) => passWasSuccessful(e)).length;
      const passAccuracy = passes.length > 0 ? (successfulPasses / passes.length) * 100 : 0;

      const touches = events.filter((e) => e.type === "touch").length;

      const shotsByMatchAndMinute = new Map<number, Map<number, CompareEvent[]>>();
      const successfulPassesByMatchAndMinute = new Map<number, Map<number, CompareEvent[]>>();
      const goalsByMatch = new Map<number, CompareEvent[]>();

      for (const shot of shots) {
        if (shotOutcome(shot) === "goal") {
          const goals = goalsByMatch.get(shot.matchId) || [];
          goals.push(shot);
          goalsByMatch.set(shot.matchId, goals);
        }
        if (shot.minute !== null) {
          if (!shotsByMatchAndMinute.has(shot.matchId)) {
            shotsByMatchAndMinute.set(shot.matchId, new Map());
          }
          const matchShots = shotsByMatchAndMinute.get(shot.matchId)!;
          const shotsAtMinute = matchShots.get(shot.minute) || [];
          shotsAtMinute.push(shot);
          matchShots.set(shot.minute, shotsAtMinute);
        }
      }

      for (const pass of passes) {
        if (!passWasSuccessful(pass) || pass.minute === null) continue;
        if (!successfulPassesByMatchAndMinute.has(pass.matchId)) {
          successfulPassesByMatchAndMinute.set(pass.matchId, new Map());
        }
        const matchPasses = successfulPassesByMatchAndMinute.get(pass.matchId)!;
        const passesAtMinute = matchPasses.get(pass.minute) || [];
        passesAtMinute.push(pass);
        matchPasses.set(pass.minute, passesAtMinute);
      }

      // Calculate assists (pass before goal in same match)
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

      let xA = 0;
      for (const pass of passes) {
        if (pass.minute === null) continue;
        const resultingShot = (shotsByMatchAndMinute.get(pass.matchId)?.get(pass.minute + 1) || [])[0];
        if (resultingShot) {
          xA += resultingShot.xg || 0;
        }
      }

      // Per 90 normalization
      const normalizePer90 = (value: number) => {
        // minutes90 is already totalMinutes / 90, so dividing by minutes90 yields per-90 directly.
        return minutes90 > 0 ? value / minutes90 : 0;
      };

      // Calculate per 90 stats first
      const goalsPer90 = normalizePer90(goals);
      const assistsPer90 = normalizePer90(assists);
      const shotsPer90 = normalizePer90(shots.length);
      const xGPer90 = normalizePer90(totalXG);
      const xAPer90 = normalizePer90(xA);
      const passesPer90 = normalizePer90(passes.length);
      const touchesPer90 = normalizePer90(touches);
      const shotOnTargetRate = shots.length > 0 ? (shotsOnTarget / shots.length) * 100 : 0;
      const conversionRate = shots.length > 0 ? (goals / shots.length) * 100 : 0;
      const xgPerShot = shots.length > 0 ? totalXG / shots.length : 0;
      const normalize100 = (value: number, benchmark: number) =>
        benchmark > 0 ? Math.min(100, (value / benchmark) * 100) : 0;

      return {
        id: player.id,
        name: player.name,
        position: player.position,
        age: player.age,
        number: player.number,
        team: player.team,
        // Raw stats
        matches: matchesCount,
        minutes: totalMinutes,
        goals: goals,
        assists: assists,
        shots: shots.length,
        shotsOnTarget: shotsOnTarget,
        totalXG: totalXG,
        averageXG: averageXG,
        xA: xA,
        passes: passes.length,
        successfulPasses: successfulPasses,
        passAccuracy: passAccuracy,
        touches: touches,
        // Per 90 stats
        goalsPer90,
        assistsPer90,
        shotsPer90,
        xGPer90,
        xAPer90,
        passesPer90,
        touchesPer90,
        // Radar chart metrics (0-100 scale)
        radarMetrics: {
          // Blend volume + quality signals so players with activity do not collapse to all-zero axes.
          shooting: Math.min(
            100,
            normalize100(shotsPer90, 4) * 0.5 + normalize100(xGPer90, 0.6) * 0.3 + normalize100(goalsPer90, 0.8) * 0.2
          ),
          creativity: Math.min(100, normalize100(xAPer90, 0.35) * 0.6 + normalize100(assistsPer90, 0.4) * 0.4),
          passing: Math.min(100, normalize100(passesPer90, 55) * 0.35 + passAccuracy * 0.65),
          involvement: Math.min(100, normalize100(touchesPer90, 80)),
          efficiency: Math.min(100, shotOnTargetRate * 0.4 + conversionRate * 0.4 + normalize100(xgPerShot, 0.18) * 0.2),
        },
      };
    });

    return NextResponse.json({
      ok: true,
      players: playersWithStats,
    });
  } catch (error) {
    console.error("[players.compare] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch comparison data" },
      { status: 500 }
    );
  }
}
