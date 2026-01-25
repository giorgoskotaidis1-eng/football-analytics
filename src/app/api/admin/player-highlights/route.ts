import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const isAdmin =
      user.role === "Head coach" ||
      user.role === "Head analyst" ||
      user.role === "Admin";

    if (!isAdmin) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { playerId, matchId, timestamp, description, outcome, includeHeatmap } = body || {};

    if (!playerId || !matchId || typeof timestamp !== "number" || !description) {
      return NextResponse.json(
        { ok: false, message: "Missing required fields (playerId, matchId, timestamp, description)" },
        { status: 400 },
      );
    }

    const ts = Math.max(0, Math.floor(timestamp));

    // Ensure backing table exists (raw SQLite) – avoids schema regeneration issues
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS PlayerHighlight (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playerId INTEGER NOT NULL,
        matchId INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        description TEXT NOT NULL,
        outcome TEXT,
        includeHeatmap INTEGER NOT NULL DEFAULT 0,
        createdById INTEGER,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO PlayerHighlight
        (playerId, matchId, timestamp, description, outcome, includeHeatmap, createdById)
      VALUES
        (?, ?, ?, ?, ?, ?, ?)
    `,
      Number(playerId),
      Number(matchId),
      ts,
      String(description),
      outcome ? String(outcome) : null,
      includeHeatmap ? 1 : 0,
      Number(user.id),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/player-highlights] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Failed to create player highlight",
      },
      { status: 500 },
    );
  }
}






