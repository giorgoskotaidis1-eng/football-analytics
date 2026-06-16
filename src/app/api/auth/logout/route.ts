import { NextResponse } from "next/server";
import { deleteSessionCookie, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAuth0Client } from "@/lib/auth0";
import { AUTH0_LOGOUT_PATH } from "@/lib/auth0-routes";

export const runtime = "nodejs";

export async function POST() {
  const auth0 = getAuth0Client();
  const auth0Session = auth0 ? await auth0.getSession() : null;

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
      redirectTo: auth0Session
        ? `${AUTH0_LOGOUT_PATH}?returnTo=${encodeURIComponent("/auth/login")}`
        : null,
    });
  } catch (error) {
    console.error("[logout] Error:", error);
    // Still delete cookie even if there's an error
    await deleteSessionCookie();
    
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Logout failed",
        redirectTo: auth0Session
          ? `${AUTH0_LOGOUT_PATH}?returnTo=${encodeURIComponent("/auth/login")}`
          : null,
      },
      { status: 500 }
    );
  }
}
