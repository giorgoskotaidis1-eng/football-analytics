import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie } from "@/lib/auth";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

export const runtime = "nodejs";

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64).toString("hex");
  const hashBuf = Buffer.from(hash, "hex");
  const derivedBuf = Buffer.from(derived, "hex");
  return timingSafeEqual(hashBuf, derivedBuf);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;

    if (!body?.email || !body?.password) {
      return NextResponse.json({ ok: false, message: "Missing credentials" }, { status: 400 });
    }

    const { email, password } = body;

    const player = await prisma.player.findUnique({ 
      where: { email },
      include: {
        team: {
          select: { id: true, name: true },
        },
      },
    });

    if (!player || !player.passwordHash || !verifyPassword(password, player.passwordHash)) {
      return NextResponse.json({ ok: false, message: "Invalid email or password" }, { status: 401 });
    }

    // Create session for player
    const session = await createSession({
      userId: player.id,
      email: player.email || "",
      name: player.name,
      role: "Player",
    }, 30); // 30 days

    const maxAge = 60 * 60 * 24 * 30; // 30 days in seconds
    
    const response = NextResponse.json({
      ok: true,
      player: {
        id: player.id,
        email: player.email,
        name: player.name,
        position: player.position,
        team: player.team,
      },
      message: "Login successful",
    });

    // Set cookie in response headers (same as regular login)
    response.cookies.set("session", session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[player-login] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Login failed" },
      { status: 500 }
    );
  }
}

