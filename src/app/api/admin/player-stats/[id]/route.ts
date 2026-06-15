import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// Update player statistics
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin/coach
    const isAdmin = user.role === "Head coach" || user.role === "Head analyst" || user.role === "Admin";
    if (!isAdmin) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const playerId = parseInt(id);

    if (isNaN(playerId)) {
      return NextResponse.json({ ok: false, message: "Invalid player ID" }, { status: 400 });
    }

    const body = await request.json();
    const {
      goals,
      assists,
      xg,
      xag,
      shotsPer90,
      keyPassesPer90,
      pressuresPer90,
      progressivePassesPer90,
      carriesIntoFinalThirdPer90,
      defensiveDuelsWonPer90,
    } = body;

    // Verify player exists
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      return NextResponse.json({ ok: false, message: "Player not found" }, { status: 404 });
    }

    await prisma.player.update({
      where: { id: playerId },
      data: {
        goals: goals ?? 0,
        assists: assists ?? 0,
        xg: xg ?? 0,
        xag: xag ?? 0,
        shotsPer90: shotsPer90 ?? 0,
        keyPassesPer90: keyPassesPer90 ?? 0,
        pressuresPer90: pressuresPer90 ?? 0,
        progressivePassesPer90: progressivePassesPer90 ?? 0,
        carriesIntoFinalThirdPer90: carriesIntoFinalThirdPer90 ?? 0,
        defensiveDuelsWonPer90: defensiveDuelsWonPer90 ?? 0,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Statistics updated successfully",
    });
  } catch (error) {
    console.error("[admin/player-stats] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to update statistics" },
      { status: 500 }
    );
  }
}





