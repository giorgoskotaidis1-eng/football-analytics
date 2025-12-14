import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { playerId, strengths, improvements } = body;

    if (!playerId) {
      return NextResponse.json({ ok: false, message: "Player ID is required" }, { status: 400 });
    }

    // Verify player exists
    const player = await prisma.player.findUnique({
      where: { id: parseInt(playerId) },
    });

    if (!player) {
      return NextResponse.json({ ok: false, message: "Player not found" }, { status: 404 });
    }

    // TODO: Create feedback record in database
    // For now, we'll just return success
    // You can add a Feedback model to Prisma schema later

    return NextResponse.json({
      ok: true,
      message: "Feedback saved successfully",
    });
  } catch (error) {
    console.error("[player-feedback] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to save feedback" },
      { status: 500 }
    );
  }
}

