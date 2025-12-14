import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// Get player performance trends over time (per match)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    // The id parameter can be either a slug or numeric ID
    // Try slug first (as that's what the main player endpoint uses)
    let player = await prisma.player.findUnique({
      where: { slug: id },
      select: {
        id: true,
        name: true,
      },
    });
    
    // If not found by slug, try as numeric ID
    if (!player) {
      const playerId = parseInt(id);
      if (!isNaN(playerId)) {
        player = await prisma.player.findUnique({
          where: { id: playerId },
          select: {
            id: true,
            name: true,
          },
        });
      }
    }

    if (!player) {
      return NextResponse.json({ ok: false, message: "Player not found" }, { status: 404 });
    }

    // Get all matches where this player has events, ordered by date
    const matches = await prisma.match.findMany({
      where: {
        events: {
          some: {
            playerId: playerId,
          },
        },
      },
      include: {
        homeTeam: {
          select: { id: true, name: true },
        },
        awayTeam: {
          select: { id: true, name: true },
        },
        events: {
          where: {
            playerId: playerId,
          },
          select: {
            id: true,
            type: true,
            xg: true,
            minute: true,
            metadata: true,
          },
        },
      },
      orderBy: { date: "asc" },
    });

    // Calculate stats per match
    const trends = matches.map((match) => {
      const matchEvents = match.events;
      
      // Count goals
      const goals = matchEvents.filter((e) => e.type === "goal").length;
      
      // Count assists (passes that led to goals)
      // For simplicity, we'll count successful passes that happened before goals
      const assists = matchEvents.filter((e) => {
        if (e.type !== "pass") return false;
        // Check if there's a goal shortly after this pass
        const passMinute = e.minute || 0;
        return matchEvents.some(
          (g) =>
            g.type === "goal" &&
            g.minute !== null &&
            g.minute > passMinute &&
            g.minute <= passMinute + 2
        );
      }).length;

      // Calculate total xG from shots
      const shots = matchEvents.filter((e) => e.type === "shot");
      const totalXG = shots.reduce((sum, shot) => sum + (shot.xg || 0), 0);

      // Calculate xA (expected assists) - passes that led to shots
      const passes = matchEvents.filter((e) => e.type === "pass");
      const xA = passes.reduce((sum, pass) => {
        const passMinute = pass.minute || 0;
        // Find shots that happened shortly after this pass
        const resultingShots = shots.filter(
          (s) =>
            s.minute !== null &&
            s.minute > passMinute &&
            s.minute <= passMinute + 1
        );
        // Sum xG of resulting shots
        return sum + resultingShots.reduce((shotSum, shot) => shotSum + (shot.xg || 0), 0);
      }, 0);

      // Count shots
      const shotsCount = shots.length;

      // Count passes
      const passesCount = passes.length;

      // Count touches
      const touches = matchEvents.filter((e) => e.type === "touch").length;

      // Determine opponent name
      const opponentName =
        match.homeTeam?.name || match.awayTeam?.name || "Unknown";

      return {
        matchId: match.id,
        date: match.date.toISOString(),
        opponent: opponentName,
        competition: match.competition,
        goals,
        assists,
        xg: Math.round(totalXG * 100) / 100,
        xa: Math.round(xA * 100) / 100,
        shots: shotsCount,
        passes: passesCount,
        touches,
      };
    });

    return NextResponse.json({
      ok: true,
      player: {
        id: player.id,
        name: player.name,
      },
      trends,
    });
  } catch (error) {
    console.error("[players/[id]/trends] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

