import { prisma } from "@/lib/prisma";
import type { MatchEvent } from "@prisma/client";

type ParsedMatchEvent = MatchEvent & {
  parsedMetadata: Record<string, unknown>;
  parsedOutcome: string | null;
};

function parseMetadata(metadata: string | null): Record<string, unknown> {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
}

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

  const parsedEvents: ParsedMatchEvent[] = events.map((event) => {
    const parsedMetadata = parseMetadata(event.metadata);
    const parsedOutcome =
      typeof parsedMetadata.outcome === "string" ? parsedMetadata.outcome : null;
    return {
      ...event,
      parsedMetadata,
      parsedOutcome,
    };
  });

  // Calculate goals (shots with outcome "goal")
  const shots = parsedEvents.filter((e) => e.type === "shot");
  const goals = shots.filter((e) => e.parsedOutcome === "goal").length;

  // Calculate total xG from shots
  const totalXG = shots.reduce((sum, e) => sum + (e.xg || 0), 0);

  const passes = parsedEvents.filter((e) => e.type === "pass");
  const successfulPasses = passes.filter((p) => p.parsedOutcome === "successful");

  const goalsByMatch = new Map<number, ParsedMatchEvent[]>();
  const shotsByMatchAndMinute = new Map<number, Map<number, ParsedMatchEvent[]>>();
  const successfulPassesByMatchAndMinute = new Map<number, Map<number, ParsedMatchEvent[]>>();

  for (const shot of shots) {
    if (shot.parsedOutcome === "goal") {
      const currentGoals = goalsByMatch.get(shot.matchId) || [];
      currentGoals.push(shot);
      goalsByMatch.set(shot.matchId, currentGoals);
    }

    if (shot.minute !== null) {
      if (!shotsByMatchAndMinute.has(shot.matchId)) {
        shotsByMatchAndMinute.set(shot.matchId, new Map());
      }
      const minuteShots = shotsByMatchAndMinute.get(shot.matchId)!;
      const currentMinuteShots = minuteShots.get(shot.minute) || [];
      currentMinuteShots.push(shot);
      minuteShots.set(shot.minute, currentMinuteShots);
    }
  }

  for (const pass of successfulPasses) {
    if (pass.minute === null) continue;
    if (!successfulPassesByMatchAndMinute.has(pass.matchId)) {
      successfulPassesByMatchAndMinute.set(pass.matchId, new Map());
    }
    const minutePasses = successfulPassesByMatchAndMinute.get(pass.matchId)!;
    const currentMinutePasses = minutePasses.get(pass.minute) || [];
    currentMinutePasses.push(pass);
    minutePasses.set(pass.minute, currentMinutePasses);
  }

  // Calculate assists (passes that lead to goals)
  let assists = 0;
  goalsByMatch.forEach((matchGoals, matchId) => {
    const matchPassesByMinute = successfulPassesByMatchAndMinute.get(matchId);
    if (!matchPassesByMinute) return;

    matchGoals.forEach((goal) => {
      if (goal.minute === null) return;
      for (let minute = goal.minute - 2; minute <= goal.minute; minute += 1) {
        if ((matchPassesByMinute.get(minute) || []).length > 0) {
          assists += 1;
          return;
        }
      }
    });
  });

  let xAG = 0;
  let keyPasses = 0;
  for (const pass of passes) {
    if (pass.minute === null) continue;
    const matchShotsByMinute = shotsByMatchAndMinute.get(pass.matchId);
    if (!matchShotsByMinute) continue;

    const resultingShot = (matchShotsByMinute.get(pass.minute + 1) || [])[0];
    if (resultingShot) {
      keyPasses += 1;
      xAG += resultingShot.xg || 0;
    }
  }

  // Calculate progressive passes (passes that advance the ball significantly)
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

  // Calculate pressures (events with type "pressure")
  const pressures = parsedEvents.filter((e) => e.type === "pressure").length;

  // Calculate carries into final third (carries with y < 33.33)
  const carries = parsedEvents.filter((e) => e.type === "carry");
  const carriesIntoFinalThird = carries.filter((c) => {
    if (c.y === null) return false;
    const cMeta = c.parsedMetadata;
    return cMeta.outcome === "successful" && c.y < 33.33;
  }).length;

  // Calculate defensive duels won (tackles + interceptions that are successful)
  const tackles = parsedEvents.filter((e) => e.type === "tackle");
  const interceptions = parsedEvents.filter((e) => e.type === "interception");
  const defensiveDuelsWon = [...tackles, ...interceptions].filter((e) => {
    const meta = e.parsedMetadata;
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
