import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePlayerStatsFromEvents } from "@/lib/player-stats-calculator";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const playerId = parseInt(id);

    if (isNaN(playerId)) {
      return NextResponse.json({ ok: false, message: "Invalid player ID" }, { status: 400 });
    }

    // Check if player exists
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true },
    });

    if (!player) {
      return NextResponse.json({ ok: false, message: "Player not found" }, { status: 404 });
    }

    // Calculate stats automatically from MatchEvents
    const calculatedStats = await calculatePlayerStatsFromEvents(playerId);

    // Also get events for additional calculated stats (shots, passes, tackles)
    const events = await prisma.matchEvent.findMany({
      where: { playerId },
    });

    const shots = events.filter((e) => e.type === "shot");
    const shotsOnTarget = shots.filter((s) => {
      try {
        const metadata = s.metadata ? JSON.parse(s.metadata) : {};
        const outcome = String(metadata.outcome || "").toLowerCase();
        return outcome === "goal" || outcome === "saved" || outcome === "ongoal";
      } catch {
        return false;
      }
    }).length;
    const passes = events.filter((e) => e.type === "pass");
    const passesCompleted = passes.length;
    const tackles = events.filter((e) => e.type === "tackle").length;

    // Return automatically calculated stats from MatchEvents
    return NextResponse.json({
      ok: true,
      stats: {
        goals: calculatedStats.goals,
        assists: calculatedStats.assists,
        xGTotal: calculatedStats.xg,
        xAGTotal: calculatedStats.xag,
        shotsTotal: shots.length,
        shotsOnTarget,
        passesCompleted,
        tacklesMade: tackles,
        // Per 90 stats (automatically calculated)
        shotsPer90: calculatedStats.shotsPer90,
        keyPassesPer90: calculatedStats.keyPassesPer90,
        pressuresPer90: calculatedStats.pressuresPer90,
        progressivePassesPer90: calculatedStats.progressivePassesPer90,
        carriesIntoFinalThirdPer90: calculatedStats.carriesIntoFinalThirdPer90,
        defensiveDuelsWonPer90: calculatedStats.defensiveDuelsWonPer90,
      },
    });
  } catch (error) {
    console.error("[player-stats] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

