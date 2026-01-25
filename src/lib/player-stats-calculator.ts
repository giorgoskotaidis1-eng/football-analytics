import { prisma } from "@/lib/prisma";
import type { MatchEvent } from "@prisma/client";

/**
 * Calculate player statistics from MatchEvents
 * This function computes all season stats automatically from match events
 */
export async function calculatePlayerStatsFromEvents(playerId: number) {
  // Get all events for this player
  const events = await prisma.matchEvent.findMany({
    where: { playerId },
    include: {
      match: {
        select: {
          id: true,
          date: true,
        },
      },
    },
  });

  if (events.length === 0) {
    // Return zero stats if no events
    return {
      goals: 0,
      assists: 0,
      xg: 0,
      xag: 0,
      shotsPer90: 0,
      keyPassesPer90: 0,
      pressuresPer90: 0,
      progressivePassesPer90: 0,
      carriesIntoFinalThirdPer90: 0,
      defensiveDuelsWonPer90: 0,
    };
  }

  // Get unique matches and calculate total minutes played
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
  const minutes90 = totalMinutes / 90; // For per 90 calculations

  // Helper to parse metadata
  const parseMetadata = (metadata: string | null): Record<string, any> => {
    if (!metadata) return {};
    try {
      return JSON.parse(metadata);
    } catch {
      return {};
    }
  };

  // Calculate goals (shots with outcome "goal")
  const shots = events.filter((e) => e.type === "shot");
  const goals = shots.filter((e) => {
    const meta = parseMetadata(e.metadata);
    return meta.outcome === "goal";
  }).length;

  // Calculate total xG from shots
  const totalXG = shots.reduce((sum, e) => sum + (e.xg || 0), 0);

  // Calculate assists (passes that lead to goals)
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

  const passes = events.filter((e) => e.type === "pass");
  goalsByMatch.forEach((matchGoals, matchId) => {
    matchGoals.forEach((goal) => {
      const assistPass = passes.find((p) => {
        const pMeta = parseMetadata(p.metadata);
        return (
          p.matchId === matchId &&
          p.minute !== null &&
          goal.minute !== null &&
          p.minute <= goal.minute &&
          p.minute >= goal.minute - 2 &&
          pMeta.outcome === "successful"
        );
      });
      if (assistPass) assists++;
    });
  });

  // Calculate xAG (expected assists) - xG of shots that resulted from passes
  const xAG = passes
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

  // Calculate pressures (events with type "pressure")
  const pressures = events.filter((e) => e.type === "pressure").length;

  // Calculate carries into final third (carries with y < 33.33)
  const carries = events.filter((e) => e.type === "carry");
  const carriesIntoFinalThird = carries.filter((c) => {
    if (c.y === null) return false;
    const cMeta = parseMetadata(c.metadata);
    return cMeta.outcome === "successful" && c.y < 33.33;
  }).length;

  // Calculate defensive duels won (tackles + interceptions that are successful)
  const tackles = events.filter((e) => e.type === "tackle");
  const interceptions = events.filter((e) => e.type === "interception");
  const defensiveDuelsWon = [...tackles, ...interceptions].filter((e) => {
    const meta = parseMetadata(e.metadata);
    return meta.outcome === "successful" || meta.outcome === "won";
  }).length;

  // Per 90 normalization
  const normalizePer90 = (value: number) => {
    return minutes90 > 0 ? (value / minutes90) * 90 : 0;
  };

  return {
    goals,
    assists,
    xg: Math.round(totalXG * 100) / 100,
    xag: Math.round(xAG * 100) / 100,
    shotsPer90: Math.round(normalizePer90(shots.length) * 10) / 10,
    keyPassesPer90: Math.round(normalizePer90(keyPasses) * 10) / 10,
    pressuresPer90: Math.round(normalizePer90(pressures) * 10) / 10,
    progressivePassesPer90: Math.round(normalizePer90(progressivePasses) * 10) / 10,
    carriesIntoFinalThirdPer90: Math.round(normalizePer90(carriesIntoFinalThird) * 10) / 10,
    defensiveDuelsWonPer90: Math.round(normalizePer90(defensiveDuelsWon) * 10) / 10,
  };
}

/**
 * Update player statistics in the database based on MatchEvents
 * This should be called whenever new events are added or updated
 */
export async function updatePlayerStatsFromEvents(playerId: number) {
  const stats = await calculatePlayerStatsFromEvents(playerId);
  
  await prisma.player.update({
    where: { id: playerId },
    data: {
      goals: stats.goals,
      assists: stats.assists,
      xg: stats.xg,
      xag: stats.xag,
      shotsPer90: stats.shotsPer90,
      keyPassesPer90: stats.keyPassesPer90,
      pressuresPer90: stats.pressuresPer90,
      progressivePassesPer90: stats.progressivePassesPer90,
      carriesIntoFinalThirdPer90: stats.carriesIntoFinalThirdPer90,
      defensiveDuelsWonPer90: stats.defensiveDuelsWonPer90,
    },
  });

  return stats;
}

