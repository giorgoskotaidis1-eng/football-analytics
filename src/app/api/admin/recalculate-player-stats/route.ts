import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { updatePlayerStatsFromEvents } from "@/lib/player-stats-calculator";

export const runtime = "nodejs";

/**
 * Admin endpoint to manually recalculate all player statistics from MatchEvents
 * POST /api/admin/recalculate-player-stats
 * Optional query param: ?playerId=123 to recalculate only one player
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin =
      user.role &&
      (user.role.toLowerCase().includes("coach") ||
        user.role.toLowerCase().includes("analyst") ||
        user.role.toLowerCase().includes("admin"));

    if (!isAdmin) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const playerIdParam = searchParams.get("playerId");

    if (playerIdParam) {
      // Recalculate stats for a single player
      const playerId = parseInt(playerIdParam);
      if (isNaN(playerId)) {
        return NextResponse.json({ ok: false, message: "Invalid player ID" }, { status: 400 });
      }

      const player = await prisma.player.findUnique({
        where: { id: playerId },
        select: { id: true, name: true },
      });

      if (!player) {
        return NextResponse.json({ ok: false, message: "Player not found" }, { status: 404 });
      }

      await updatePlayerStatsFromEvents(playerId);

      return NextResponse.json({
        ok: true,
        message: `Stats recalculated for player ${player.name}`,
        playerId,
      });
    } else {
      // Recalculate stats for all players
      const players = await prisma.player.findMany({
        select: { id: true, name: true },
      });

      console.log(`[recalculate-stats] Recalculating stats for ${players.length} players...`);

      const results = await Promise.allSettled(
        players.map((player) =>
          updatePlayerStatsFromEvents(player.id).then(() => ({
            playerId: player.id,
            name: player.name,
            success: true,
          }))
        )
      );

      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      return NextResponse.json({
        ok: true,
        message: `Recalculated stats for ${successful} players${failed > 0 ? `, ${failed} failed` : ""}`,
        total: players.length,
        successful,
        failed,
      });
    }
  } catch (error) {
    console.error("[recalculate-stats] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to recalculate stats" },
      { status: 500 }
    );
  }
}

