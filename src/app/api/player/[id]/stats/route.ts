import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // Get player with stored stats
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        goals: true,
        assists: true,
        xg: true,
        xag: true,
        shotsPer90: true,
        keyPassesPer90: true,
        pressuresPer90: true,
        progressivePassesPer90: true,
        carriesIntoFinalThirdPer90: true,
        defensiveDuelsWonPer90: true,
      },
    });

    if (!player) {
      return NextResponse.json({ ok: false, message: "Player not found" }, { status: 404 });
    }

    // Also get events for calculated stats (shots, passes, tackles)
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

    // Use stored stats from Player model, fallback to calculated from events
    return NextResponse.json({
      ok: true,
      stats: {
        goals: player.goals ?? 0,
        assists: player.assists ?? 0,
        xGTotal: player.xg ?? 0,
        xAGTotal: player.xag ?? 0,
        shotsTotal: shots.length,
        shotsOnTarget,
        passesCompleted,
        tacklesMade: tackles,
        // Per 90 stats
        shotsPer90: player.shotsPer90 ?? 0,
        keyPassesPer90: player.keyPassesPer90 ?? 0,
        pressuresPer90: player.pressuresPer90 ?? 0,
        progressivePassesPer90: player.progressivePassesPer90 ?? 0,
        carriesIntoFinalThirdPer90: player.carriesIntoFinalThirdPer90 ?? 0,
        defensiveDuelsWonPer90: player.defensiveDuelsWonPer90 ?? 0,
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

