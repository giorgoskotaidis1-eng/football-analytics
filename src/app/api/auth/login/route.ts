import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { scryptSync, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64).toString("hex");
  const hashBuf = Buffer.from(hash, "hex");
  const derivedBuf = Buffer.from(derived, "hex");
  if (hashBuf.length !== derivedBuf.length) return false;
  return timingSafeEqual(hashBuf, derivedBuf);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { email?: string; password?: string; rememberMe?: boolean } | null;

    if (!body?.email || !body?.password) {
      return NextResponse.json({ ok: false, message: "Missing credentials" }, { status: 400 });
    }

    const { email, password, rememberMe } = body;

    // Try to find user first
    const user = await prisma.user.findUnique({ where: { email } });
    let isPlayer = false;
    let player = null;

    // Check if it's a valid user login
    const isValidUser = user && user.passwordHash && verifyPassword(password, user.passwordHash);

    // If not a valid user, try to find as player
    if (!isValidUser) {
      // Try to find player by email (using findFirst since email might not be unique in schema yet)
      player = await prisma.player.findFirst({ 
        where: { email: email },
        include: {
          team: {
            select: { id: true, name: true },
          },
        },
      });

      if (player && player.passwordHash && verifyPassword(password, player.passwordHash)) {
        isPlayer = true;
      } else {
        return NextResponse.json({ ok: false, message: "Invalid email or password" }, { status: 401 });
      }
    }

    // Set expiration: 30 days if rememberMe, otherwise 1 day
    const expirationDays = rememberMe ? 30 : 1;

    let session;
    let responseData;

    if (isPlayer && player) {
      // Player login - log the login event
      const loginTimestamp = new Date();
      try {
        await prisma.player.update({
          where: { id: player.id },
          data: {
            lastLoginAt: loginTimestamp,
            isOnline: true,
          },
        });
      } catch (error) {
        console.error("[login] Failed to update player login status:", error);
        // Continue with login even if tracking fails
      }

      // Login is already logged in the database update above
      // No need for separate API call since we're already in the same process

      session = await createSession({
        userId: player.id,
        email: player.email || "",
        name: player.name,
        role: "Player",
      }, expirationDays);

      responseData = {
        ok: true,
        user: {
          id: player.id,
          email: player.email,
          name: player.name,
          role: "Player",
          position: player.position,
          team: player.team,
        },
        message: "Login successful",
      };
    } else if (user) {
      // Regular user login
      session = await createSession({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }, expirationDays);

      responseData = {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role ?? "Head analyst",
        },
        message: "Login successful",
      };
    } else {
      return NextResponse.json({ ok: false, message: "Invalid email or password" }, { status: 401 });
    }

    const maxAge = 60 * 60 * 24 * expirationDays; // days in seconds
    
    const response = NextResponse.json(responseData);

    // Set cookie in response headers
    response.cookies.set("session", session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: maxAge,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[auth/login] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
