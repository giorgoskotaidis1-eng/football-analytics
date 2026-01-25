import { NextRequest, NextResponse } from "next/server";
import { deleteSessionCookie, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // If it's a player, mark them as offline using raw SQL (workaround until Prisma client regenerates)
    if (session && session.role === "Player") {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE Player SET isOnline = 0 WHERE id = ?`,
          session.userId
        );
        console.log(`[logout] Player ${session.userId} logged out`);
      } catch (error) {
        console.error("[logout] Failed to update player offline status:", error);
        // Continue with logout even if this fails
      }
    }

    // Delete session cookie
    await deleteSessionCookie();

    return NextResponse.json({
      ok: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("[logout] Error:", error);
    // Still delete cookie even if there's an error
    await deleteSessionCookie();
    
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Logout failed" },
      { status: 500 }
    );
  }
}
