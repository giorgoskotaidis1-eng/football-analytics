import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { calculateTotalXG, calculatePossession, calculateShotStats } from "@/lib/analytics";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      team1Id?: number;
      team2Id?: number;
      team1Name?: string; // Opponent team name
      team2Name?: string; // Opponent team name
    } | null;

    // Validate: need either IDs or names for both teams
    const hasTeam1 = body?.team1Id || body?.team1Name;
    const hasTeam2 = body?.team2Id || body?.team2Name;

    if (!hasTeam1 || !hasTeam2) {
      return NextResponse.json(
        { ok: false, message: "Both teams are required (ID or name)" },
        { status: 400 }
      );
    }

    // Cannot compare same team
    if (
      (body.team1Id && body.team2Id && body.team1Id === body.team2Id) ||
      (body.team1Name && body.team2Name && body.team1Name === body.team2Name)
    ) {
      return NextResponse.json({ ok: false, message: "Cannot compare a team with itself" }, { status: 400 });
    }

    // Fetch registered teams (if IDs provided)
    let team1: { id: number; name: string; league: string | null } | null = null;
    let team2: { id: number; name: string; league: string | null } | null = null;

    if (body.team1Id) {
      const t1 = await prisma.team.findUnique({ where: { id: body.team1Id } });
      if (!t1) {
        return NextResponse.json({ ok: false, message: "Team 1 not found" }, { status: 404 });
      }
      team1 = { id: t1.id, name: t1.name, league: t1.league };
    }

    if (body.team2Id) {
      const t2 = await prisma.team.findUnique({ where: { id: body.team2Id } });
      if (!t2) {
        return NextResponse.json({ ok: false, message: "Team 2 not found" }, { status: 404 });
      }
      team2 = { id: t2.id, name: t2.name, league: t2.league };
    }

    // For opponent teams (names only), create virtual team objects
    const team1Name = team1?.name || body.team1Name || "Unknown";
    const team2Name = team2?.name || body.team2Name || "Unknown";
    const team1Id = team1?.id || null;
    const team2Id = team2?.id || null;

    // Build head-to-head match query
    const h2hWhere: any = {
      OR: [],
    };

    // Team 1 vs Team 2 (both registered)
    if (team1Id && team2Id) {
      h2hWhere.OR.push(
        { homeTeamId: team1Id, awayTeamId: team2Id },
        { homeTeamId: team2Id, awayTeamId: team1Id }
      );
    }
    // Team 1 (registered) vs Team 2 (opponent)
    if (team1Id && body.team2Name) {
      h2hWhere.OR.push(
        { homeTeamId: team1Id, awayTeamName: body.team2Name },
        { awayTeamId: team1Id, homeTeamName: body.team2Name }
      );
    }
    // Team 1 (opponent) vs Team 2 (registered)
    if (body.team1Name && team2Id) {
      h2hWhere.OR.push(
        { homeTeamName: body.team1Name, awayTeamId: team2Id },
        { awayTeamName: body.team1Name, homeTeamId: team2Id }
      );
    }
    // Team 1 (opponent) vs Team 2 (opponent)
    if (body.team1Name && body.team2Name) {
      h2hWhere.OR.push(
        { homeTeamName: body.team1Name, awayTeamName: body.team2Name },
        { homeTeamName: body.team2Name, awayTeamName: body.team1Name }
      );
    }

    // If OR is empty, set to empty object (no matches)
    if (h2hWhere.OR.length === 0) {
      h2hWhere.OR = [{ id: -1 }]; // Impossible condition
    }

    const headToHeadMatches = await prisma.match.findMany({
      where: h2hWhere,
      include: {
        events: {
          include: {
            player: {
              select: { id: true, name: true },
            },
          },
        },
        lineups: (() => {
          const lineupOr = [
            ...(team1Id ? [{ teamId: team1Id }] : []),
            ...(team2Id ? [{ teamId: team2Id }] : []),
          ];
          return {
            where: {
              OR: lineupOr.length > 0 ? lineupOr : [{ id: -1 }], // Impossible condition if no team IDs
            },
          };
        })(),
      },
      orderBy: { date: "desc" },
    });

    // Build match queries for each team
    const team1Where: any = { OR: [] };
    if (team1Id) {
      team1Where.OR.push({ homeTeamId: team1Id }, { awayTeamId: team1Id });
    }
    if (body.team1Name) {
      team1Where.OR.push({ homeTeamName: body.team1Name }, { awayTeamName: body.team1Name });
    }
    // If OR is empty, set to empty object (no matches)
    if (team1Where.OR.length === 0) {
      team1Where.OR = [{ id: -1 }]; // Impossible condition
    }

    const team2Where: any = { OR: [] };
    if (team2Id) {
      team2Where.OR.push({ homeTeamId: team2Id }, { awayTeamId: team2Id });
    }
    if (body.team2Name) {
      team2Where.OR.push({ homeTeamName: body.team2Name }, { awayTeamName: body.team2Name });
    }
    // If OR is empty, set to empty object (no matches)
    if (team2Where.OR.length === 0) {
      team2Where.OR = [{ id: -1 }]; // Impossible condition
    }

    // Fetch all matches for each team (for overall stats)
    const [team1Matches, team2Matches] = await Promise.all([
      prisma.match.findMany({
        where: team1Where,
        include: {
          events: {
            include: {
              player: {
                select: { id: true, name: true },
              },
            },
          },
          lineups: team1Id
            ? {
                where: { teamId: team1Id },
              }
            : undefined,
        },
      }),
      prisma.match.findMany({
        where: team2Where,
        include: {
          events: {
            include: {
              player: {
                select: { id: true, name: true },
              },
            },
          },
          lineups: team2Id
            ? {
                where: { teamId: team2Id },
              }
            : undefined,
        },
      }),
    ]);

    // Helper to parse metadata
    const parseMetadata = (metadata: string | null): Record<string, any> => {
      if (!metadata) return {};
      try {
        return JSON.parse(metadata);
      } catch {
        return {};
      }
    };

    // Calculate team stats from matches
    const calculateTeamStats = (
      matches: typeof team1Matches,
      teamId: number | null,
      teamName: string | null
    ) => {
      let totalGoals = 0;
      let totalXG = 0;
      let totalShots = 0;
      let shotsOnTarget = 0;
      let totalPasses = 0;
      let successfulPasses = 0;
      let totalTouches = 0;
      let totalTackles = 0;
      let totalInterceptions = 0;
      let totalPossession = 0;
      let matchesCount = 0;
      let wins = 0;
      let draws = 0;
      let losses = 0;

      const homePasses: Array<{ x: number; y: number }> = [];
      const awayPasses: Array<{ x: number; y: number }> = [];
      const homeTouches: Array<{ x: number; y: number }> = [];
      const awayTouches: Array<{ x: number; y: number }> = [];

      matches.forEach((match) => {
        // Check if this match belongs to the team (by ID or name)
        const isHomeById = teamId !== null && match.homeTeamId === teamId;
        const isAwayById = teamId !== null && match.awayTeamId === teamId;
        const isHomeByName = teamName !== null && match.homeTeamName === teamName;
        const isAwayByName = teamName !== null && match.awayTeamName === teamName;

        const isHome = isHomeById || isHomeByName;
        const isAway = isAwayById || isAwayByName;

        if (!isHome && !isAway) return;

        matchesCount++;

        // Match results
        if (isHome) {
          totalGoals += match.scoreHome || 0;
          totalXG += match.xgHome || 0;
          totalShots += match.shotsHome || 0;
          totalPossession += match.possessionHome || 0;

          if ((match.scoreHome || 0) > (match.scoreAway || 0)) wins++;
          else if ((match.scoreHome || 0) === (match.scoreAway || 0)) draws++;
          else losses++;
        } else {
          totalGoals += match.scoreAway || 0;
          totalXG += match.xgAway || 0;
          totalShots += match.shotsAway || 0;
          totalPossession += match.possessionAway || 0;

          if ((match.scoreAway || 0) > (match.scoreHome || 0)) wins++;
          else if ((match.scoreAway || 0) === (match.scoreHome || 0)) draws++;
          else losses++;
        }

        // Events
        if (match.events && Array.isArray(match.events)) {
          match.events.forEach((event) => {
            // Check if event belongs to this team
            const eventTeam = isHome ? "home" : "away";
            if (event.team !== eventTeam) return;

            if (event.type === "shot") {
              const meta = parseMetadata(event.metadata);
              if (meta.outcome === "on_target" || meta.outcome === "goal") {
                shotsOnTarget++;
              }
            } else if (event.type === "pass") {
              totalPasses++;
              const meta = parseMetadata(event.metadata);
              if (meta.outcome === "successful") {
                successfulPasses++;
                if (isHome) {
                  homePasses.push({ x: event.x || 0, y: event.y || 0 });
                } else {
                  awayPasses.push({ x: event.x || 0, y: event.y || 0 });
                }
              }
            } else if (event.type === "touch") {
              totalTouches++;
              if (isHome) {
                homeTouches.push({ x: event.x || 0, y: event.y || 0 });
              } else {
                awayTouches.push({ x: event.x || 0, y: event.y || 0 });
              }
            } else if (event.type === "tackle") {
              totalTackles++;
            } else if (event.type === "interception") {
              totalInterceptions++;
            }
          });
        }
      });

      const avgPossession = matchesCount > 0 ? totalPossession / matchesCount : 0;
      const passAccuracy = totalPasses > 0 ? (successfulPasses / totalPasses) * 100 : 0;

      // Calculate possession from events if not available
      let calculatedPossession = avgPossession;
      if (matchesCount > 0 && (homePasses.length > 0 || awayPasses.length > 0)) {
        const allPasses = [...homePasses, ...awayPasses];
        const allTouches = [...homeTouches, ...awayTouches];
        const teamEvents = [...homePasses, ...homeTouches];
        const opponentEvents = [...awayPasses, ...awayTouches];
        calculatedPossession = calculatePossession(teamEvents, opponentEvents).home;
      }

      return {
        matches: matchesCount,
        wins,
        draws,
        losses,
        goals: totalGoals,
        xG: Math.round(totalXG * 100) / 100,
        shots: totalShots,
        shotsOnTarget,
        passes: totalPasses,
        successfulPasses,
        passAccuracy: Math.round(passAccuracy * 10) / 10,
        touches: totalTouches,
        tackles: totalTackles,
        interceptions: totalInterceptions,
        possession: Math.round(calculatedPossession * 10) / 10,
        goalsPerMatch: matchesCount > 0 ? Math.round((totalGoals / matchesCount) * 10) / 10 : 0,
        xGPerMatch: matchesCount > 0 ? Math.round((totalXG / matchesCount) * 100) / 100 : 0,
      };
    };

    // Calculate stats for both teams
    const team1Stats = calculateTeamStats(team1Matches, team1Id, body.team1Name || null);
    const team2Stats = calculateTeamStats(team2Matches, team2Id, body.team2Name || null);

    // Calculate head-to-head stats
    let h2hTeam1Wins = 0;
    let h2hTeam2Wins = 0;
    let h2hDraws = 0;
    let h2hTeam1Goals = 0;
    let h2hTeam2Goals = 0;

    headToHeadMatches.forEach((match) => {
      // Determine which team is home
      const team1IsHome =
        (team1Id !== null && match.homeTeamId === team1Id) ||
        (body.team1Name && match.homeTeamName === body.team1Name);
      const team1Score = team1IsHome ? (match.scoreHome || 0) : (match.scoreAway || 0);
      const team2Score = team1IsHome ? (match.scoreAway || 0) : (match.scoreHome || 0);

      h2hTeam1Goals += team1Score;
      h2hTeam2Goals += team2Score;

      if (team1Score > team2Score) h2hTeam1Wins++;
      else if (team2Score > team1Score) h2hTeam2Wins++;
      else h2hDraws++;
    });

    // Get formations
    const team1Formations = new Map<string, number>();
    const team2Formations = new Map<string, number>();

    team1Matches.forEach((match) => {
      if (match.lineups && Array.isArray(match.lineups)) {
        match.lineups.forEach((lineup) => {
          if (lineup.formation) {
            const count = team1Formations.get(lineup.formation) || 0;
            team1Formations.set(lineup.formation, count + 1);
          }
        });
      }
    });

    team2Matches.forEach((match) => {
      if (match.lineups && Array.isArray(match.lineups)) {
        match.lineups.forEach((lineup) => {
          if (lineup.formation) {
            const count = team2Formations.get(lineup.formation) || 0;
            team2Formations.set(lineup.formation, count + 1);
          }
        });
      }
    });

    // Get most used formations
    const team1MostUsedFormation = Array.from(team1Formations.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    const team2MostUsedFormation = Array.from(team2Formations.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    return NextResponse.json({
      ok: true,
      teams: {
        team1: {
          id: team1Id,
          name: team1Name,
          league: team1?.league || null,
        },
        team2: {
          id: team2Id,
          name: team2Name,
          league: team2?.league || null,
        },
      },
      stats: {
        team1: team1Stats,
        team2: team2Stats,
      },
      headToHead: {
        matches: headToHeadMatches.length,
        team1Wins: h2hTeam1Wins,
        team2Wins: h2hTeam2Wins,
        draws: h2hDraws,
        team1Goals: h2hTeam1Goals,
        team2Goals: h2hTeam2Goals,
        matchList: headToHeadMatches.map((match) => ({
          id: match.id,
          slug: match.slug,
          date: match.date.toISOString(),
          competition: match.competition,
          venue: match.venue,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          homeTeamName: match.homeTeamName,
          awayTeamName: match.awayTeamName,
          scoreHome: match.scoreHome,
          scoreAway: match.scoreAway,
          xgHome: match.xgHome,
          xgAway: match.xgAway,
        })),
      },
      formations: {
        team1: {
          mostUsed: team1MostUsedFormation,
          all: Array.from(team1Formations.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([formation, count]) => ({ formation, count })),
        },
        team2: {
          mostUsed: team2MostUsedFormation,
          all: Array.from(team2Formations.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([formation, count]) => ({ formation, count })),
        },
      },
    });
  } catch (error) {
    console.error("[teams/compare.POST] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

