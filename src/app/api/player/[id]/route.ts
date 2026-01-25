import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentPlayer } from "@/lib/player-auth";

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

    // Check if user is logged in as a player and accessing their own dashboard
    const currentPlayer = await getCurrentPlayer();
    if (currentPlayer && currentPlayer.id !== playerId) {
      // Allow access to own dashboard only
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 403 });
    }

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        team: {
          select: { id: true, name: true },
        },
      },
    });

    if (!player) {
      return NextResponse.json({ ok: false, message: "Player not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      player: {
        id: player.id,
        name: player.name,
        position: player.position,
        age: player.age,
        number: player.number,
        team: player.team,
        avatarUrl: null, // Can be added later
      },
    });
  } catch (error) {
    console.error("[player] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to fetch player" },
      { status: 500 }
    );
  }
}

