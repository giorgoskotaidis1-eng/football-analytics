import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Log player login event
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      playerId?: number;
      timestamp?: string;
    } | null;

    if (!body?.playerId) {
      return NextResponse.json({ ok: false, message: "Player ID required" }, { status: 400 });
    }

    const playerId = body.playerId;
    const timestamp = body.timestamp ? new Date(body.timestamp) : new Date();

    // Update player login status using raw SQL (workaround until Prisma client regenerates)
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE Player SET lastLoginAt = ?, isOnline = 1 WHERE id = ?`,
        timestamp.toISOString(),
        playerId
      );
    } catch (error) {
      console.error("[log-player-login] Failed to update player status:", error);
      throw error;
    }

    console.log(`[admin/log-player-login] Player ${playerId} logged in at ${timestamp.toISOString()}`);

    return NextResponse.json({
      ok: true,
      message: "Login logged successfully",
    });
  } catch (error) {
    console.error("[admin/log-player-login] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to log login" },
      { status: 500 }
    );
  }
}

