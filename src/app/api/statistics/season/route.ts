import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Get season-based statistics
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const seasonFilter = searchParams.get("season"); // Optional: filter by specific season

    // Fetch all matches
    const matches = await prisma.match.findMany({
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        events: {
          include: {
            player: {
              select: { id: true, name: true, position: true },
            },
          },
        },
      },
      orderBy: { date: "asc" },
    });

    // Group matches by season
    // Season format: "2023-24" (July 2023 - June 2024)
    const seasonStats = new Map<string, {
      season: string;
      matches: number;
      totalGoals: number;
      totalXG: number;
      totalShots: number;
      totalAssists: number;
      players: Map<number, {
        id: number;
        name: string;
        position: string;
        goals: number;
        assists: number;
        xg: number;
        shots: number;
        matches: Set<number>;
      }>;
      teams: Map<number, {
        id: number;
        name: string;
        matches: number;
        goals: number;
        xg: number;
      }>;
    }>();

    matches.forEach((match) => {
      const matchDate = new Date(match.date);
      const year = matchDate.getFullYear();
      const month = matchDate.getMonth(); // 0-11
      
      // Season runs from July (month 6) to June (month 5)
      // If month >= 6 (July-Dec), season is year-year+1
      // If month < 6 (Jan-Jun), season is year-1-year
      const seasonYear = month >= 6 ? year : year - 1;
      const season = `${seasonYear}-${(seasonYear + 1).toString().slice(-2)}`;

      // Filter by season if specified
      if (seasonFilter && season !== seasonFilter) {
        return;
      }

      if (!seasonStats.has(season)) {
        seasonStats.set(season, {
          season,
          matches: 0,
          totalGoals: 0,
          totalXG: 0,
          totalShots: 0,
          totalAssists: 0,
          players: new Map(),
          teams: new Map(),
        });
      }

      const stats = seasonStats.get(season)!;
      stats.matches += 1;

      // Add match goals
      stats.totalGoals += (match.scoreHome ?? 0) + (match.scoreAway ?? 0);
      stats.totalXG += (match.xgHome ?? 0) + (match.xgAway ?? 0);
      stats.totalShots += (match.shotsHome ?? 0) + (match.shotsAway ?? 0);

      // Process teams
      [match.homeTeam, match.awayTeam].forEach((team, index) => {
        if (!team) return;
        
        if (!stats.teams.has(team.id)) {
          stats.teams.set(team.id, {
            id: team.id,
            name: team.name,
            matches: 0,
            goals: 0,
            xg: 0,
          });
        }
        
        const teamStats = stats.teams.get(team.id)!;
        teamStats.matches += 1;
        if (index === 0) {
          teamStats.goals += match.scoreHome ?? 0;
          teamStats.xg += match.xgHome ?? 0;
        } else {
          teamStats.goals += match.scoreAway ?? 0;
          teamStats.xg += match.xgAway ?? 0;
        }
      });

      // Process events for player stats
      match.events.forEach((event) => {
        if (!event.player) return;

        const playerId = event.player.id;
        if (!stats.players.has(playerId)) {
          stats.players.set(playerId, {
            id: playerId,
            name: event.player.name,
            position: event.player.position,
            goals: 0,
            assists: 0,
            xg: 0,
            shots: 0,
            matches: new Set(),
          });
        }

        const playerStats = stats.players.get(playerId)!;
        playerStats.matches.add(match.id);

        if (event.type === "shot") {
          playerStats.shots += 1;
          playerStats.xg += event.xg ?? 0;
          
          // Check if goal
          try {
            const metadata = event.metadata ? JSON.parse(event.metadata) : {};
            if (metadata.outcome === "goal") {
              playerStats.goals += 1;
            }
          } catch {}
        } else if (event.type === "pass") {
          // Check if assist (pass before goal in same match)
          // This is simplified - in real system you'd track goal events
          try {
            const metadata = event.metadata ? JSON.parse(event.metadata) : {};
            if (metadata.assist === true) {
              playerStats.assists += 1;
              stats.totalAssists += 1;
            }
          } catch {}
        }
      });
    });

    // Convert to array format and calculate per-match averages
    const seasonData = Array.from(seasonStats.values())
      .map((stats) => {
        const playersArray = Array.from(stats.players.values()).map((p) => ({
          ...p,
          matches: p.matches.size, // Convert Set to count
        }));

        const teamsArray = Array.from(stats.teams.values());

        return {
          season: stats.season,
          matches: stats.matches,
          totalGoals: stats.totalGoals,
          totalXG: parseFloat(stats.totalXG.toFixed(2)),
          totalShots: stats.totalShots,
          totalAssists: stats.totalAssists,
          avgGoalsPerMatch: stats.matches > 0 ? parseFloat((stats.totalGoals / stats.matches).toFixed(2)) : 0,
          avgXGPerMatch: stats.matches > 0 ? parseFloat((stats.totalXG / stats.matches).toFixed(2)) : 0,
          topScorers: playersArray
            .filter((p) => p.goals > 0)
            .sort((a, b) => b.goals - a.goals)
            .slice(0, 10),
          topAssists: playersArray
            .filter((p) => p.assists > 0)
            .sort((a, b) => b.assists - a.assists)
            .slice(0, 10),
          topXG: playersArray
            .filter((p) => p.xg > 0)
            .sort((a, b) => b.xg - a.xg)
            .slice(0, 10),
          teams: teamsArray.sort((a, b) => b.matches - a.matches),
        };
      })
      .sort((a, b) => b.season.localeCompare(a.season)); // Sort by season descending

    return NextResponse.json({
      ok: true,
      seasons: seasonData,
      summary: {
        totalSeasons: seasonData.length,
        totalMatches: seasonData.reduce((sum, s) => sum + s.matches, 0),
        totalGoals: seasonData.reduce((sum, s) => sum + s.totalGoals, 0),
        totalXG: parseFloat(seasonData.reduce((sum, s) => sum + s.totalXG, 0).toFixed(2)),
      },
    });
  } catch (error) {
    console.error("[statistics.season] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch season statistics" },
      { status: 500 }
    );
  }
}

