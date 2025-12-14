import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

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

    if (!body || !body.playerIds || !Array.isArray(body.playerIds) || body.playerIds.length === 0) {
      console.error("[players.compare] Missing or invalid playerIds:", body);
      return NextResponse.json({ ok: false, message: "At least one player ID is required" }, { status: 400 });
    }

    if (body.playerIds.length > 4) {
      return NextResponse.json({ ok: false, message: "Maximum 4 players can be compared" }, { status: 400 });
    }

    console.log(`[players.compare] Fetching players with IDs:`, body.playerIds, "count:", body.playerIds.length);
    console.log(`[players.compare] Player IDs type:`, typeof body.playerIds[0], "sample:", body.playerIds[0]);
    
    // Ensure all IDs are numbers
    const playerIds = body.playerIds.map(id => {
      const numId = typeof id === 'string' ? parseInt(id) : id;
      console.log(`[players.compare] Converting ID: ${id} (${typeof id}) -> ${numId} (${typeof numId})`);
      return numId;
    }).filter(id => {
      const isValid = !isNaN(id) && id > 0;
      if (!isValid) {
        console.warn(`[players.compare] Filtering out invalid ID:`, id);
      }
      return isValid;
    });
    console.log(`[players.compare] Normalized player IDs:`, playerIds);
    
    // Double-check: verify each ID exists in database
    for (const id of playerIds) {
      const exists = await prisma.player.findUnique({ where: { id }, select: { id: true, name: true } });
      console.log(`[players.compare] Player ID ${id} exists:`, exists ? `YES (${exists.name})` : "NO");
    }
    
    // Fetch players with all their match events
    const players = await prisma.player.findMany({
      where: {
        id: { in: playerIds },
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

    console.log(`[players.compare] Found ${players.length} players in database`);
    if (players.length > 0) {
      console.log(`[players.compare] Player IDs found:`, players.map(p => ({ id: p.id, name: p.name })));
    }
    if (players.length !== playerIds.length) {
      console.error(`[players.compare] ❌ MISMATCH! Requested ${playerIds.length} players but found ${players.length}`);
      console.error(`[players.compare] Requested IDs:`, playerIds);
      console.error(`[players.compare] Found IDs:`, players.map(p => p.id));
      const missingIds = playerIds.filter(id => !players.some(p => p.id === id));
      console.error(`[players.compare] Missing IDs:`, missingIds);
      
      // Try to find missing players by checking database
      for (const missingId of missingIds) {
        const checkPlayer = await prisma.player.findUnique({ where: { id: missingId } });
        if (checkPlayer) {
          console.error(`[players.compare] ⚠️ Player ${missingId} exists in DB but wasn't returned by findMany!`);
        } else {
          console.error(`[players.compare] ❌ Player ${missingId} does NOT exist in database`);
        }
      }
      
      // Still return what we found, but log the issue
    } else {
      console.log(`[players.compare] ✅ All ${players.length} players found successfully`);
    }
    
    if (players.length === 0) {
      return NextResponse.json({ ok: false, message: "No players found with the provided IDs" }, { status: 404 });
    }

    // Calculate detailed stats for each player
    const playersWithStats = players.map((player) => {
      const events = player.matchEvents || [];
      
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

      // Calculate stats
      const shots = events.filter((e) => e.type === "shot");
      const goals = shots.filter((e) => e.outcome === "goal").length;
      const shotsOnTarget = shots.filter((e) => e.outcome === "on_target").length;
      const totalXG = shots.reduce((sum, e) => sum + (e.xg || 0), 0);
      const averageXG = shots.length > 0 ? totalXG / shots.length : 0;
      
      const passes = events.filter((e) => e.type === "pass");
      const successfulPasses = passes.filter((e) => e.outcome === "successful").length;
      const passAccuracy = passes.length > 0 ? (successfulPasses / passes.length) * 100 : 0;
      
      const touches = events.filter((e) => e.type === "touch").length;
      
      // Calculate assists (pass before goal in same match)
      let assists = 0;
      const goalsByMatch = new Map<number, typeof shots>();
      shots.filter((s) => s.outcome === "goal").forEach((goal) => {
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
            (p) =>
              p.matchId === matchId &&
              p.minute !== null &&
              goal.minute !== null &&
              p.minute <= goal.minute &&
              p.minute >= goal.minute - 2 &&
              p.outcome === "successful"
          );
          if (assistPass) assists++;
        });
      });

      // Calculate xA (expected assists) - passes that lead to shots
      const xA = passes
        .filter((p) => {
          // Find if this pass led to a shot in the same match within 5 seconds
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
          // Find the shot this pass led to
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

      // Calculate per 90 stats first
      const goalsPer90 = normalizePer90(goals);
      const assistsPer90 = normalizePer90(assists);
      const shotsPer90 = normalizePer90(shots.length);
      const xGPer90 = normalizePer90(totalXG);
      const xAPer90 = normalizePer90(xA);
      const passesPer90 = normalizePer90(passes.length);
      const touchesPer90 = normalizePer90(touches);

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
          shooting: Math.min(100, (goalsPer90 / 1.0) * 100), // 1 goal per 90 = 100
          creativity: Math.min(100, (assistsPer90 / 0.5) * 100), // 0.5 assists per 90 = 100
          passing: Math.min(100, passAccuracy),
          involvement: Math.min(100, (touchesPer90 / 80) * 100), // 80 touches per 90 = 100
          efficiency: Math.min(100, shots.length > 0 ? (goals / shots.length) * 100 * 10 : 0), // Conversion rate
        },
      };
    });

    console.log(`[players.compare] Returning stats for ${playersWithStats.length} players`);
    if (playersWithStats.length > 0) {
      console.log(`[players.compare] Sample player:`, {
        id: playersWithStats[0].id,
        name: playersWithStats[0].name,
        matches: playersWithStats[0].matches,
        minutes: playersWithStats[0].minutes,
        goals: playersWithStats[0].goals,
        assists: playersWithStats[0].assists,
      });
    }
    
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

