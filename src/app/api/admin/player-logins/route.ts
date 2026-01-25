import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// Get all player login activity
export async function GET(request: NextRequest) {
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

    // Get admin's team (if user has a team association)
    // For now, we'll show all players, but you can filter by teamId if needed
    // TODO: Add teamId to User model or use a different association method
    
    // Use raw SQL query to get players with login tracking (workaround until Prisma client regenerates)
    // Filter by team if admin has a specific team (can be extended later)
    const playersRaw = await prisma.$queryRawUnsafe<Array<{
      id: number;
      name: string;
      email: string | null;
      position: string;
      number: number | null;
      lastLoginAt: Date | null;
      isOnline: number; // SQLite returns 0/1
      teamId: number | null;
      teamName: string | null;
    }>>(`
      SELECT 
        p.id,
        p.name,
        p.email,
        p.position,
        p.number,
        p.lastLoginAt,
        p.isOnline,
        t.id as teamId,
        t.name as teamName
      FROM Player p
      LEFT JOIN Team t ON p.teamId = t.id
      WHERE p.email IS NOT NULL
      ORDER BY p.isOnline DESC, p.lastLoginAt DESC
    `);

    const players = playersRaw.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      position: p.position,
      number: p.number,
      lastLoginAt: p.lastLoginAt,
      isOnline: p.isOnline === 1,
      team: p.teamId && p.teamName ? { id: p.teamId, name: p.teamName } : null,
    }));

    return NextResponse.json({
      ok: true,
      players: players.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        position: p.position,
        number: p.number,
        team: p.team,
        lastLoginAt: p.lastLoginAt ? (p.lastLoginAt instanceof Date ? p.lastLoginAt.toISOString() : String(p.lastLoginAt)) : null,
        isOnline: p.isOnline,
        status: p.isOnline ? "Online" : p.lastLoginAt ? "Offline" : "Never logged in",
      })),
    });
  } catch (error) {
    console.error("[admin/player-logins] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to fetch player logins" },
      { status: 500 }
    );
  }
}

