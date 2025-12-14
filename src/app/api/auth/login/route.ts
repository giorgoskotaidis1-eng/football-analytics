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

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ ok: false, message: "Invalid email or password" }, { status: 401 });
    }

    // Set expiration: 30 days if rememberMe, otherwise 1 day
    const expirationDays = rememberMe ? 30 : 1;

    const session = await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }, expirationDays);

    const maxAge = 60 * 60 * 24 * expirationDays; // days in seconds
    
    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role ?? "Head analyst",
      },
      message: "Login successful",
    });

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
