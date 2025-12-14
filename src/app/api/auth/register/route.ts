import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { randomBytes, scryptSync } from "node:crypto";

export const runtime = "nodejs";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    club?: string;
    email?: string;
    password?: string;
  } | null;

  if (!body?.email || !body?.password) {
    return NextResponse.json({ ok: false, message: "Email and password are required" }, { status: 400 });
  }

  const { email, password, name } = body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ ok: false, message: "A user with this email already exists" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      role: "Head coach",
      passwordHash: hashPassword(password),
    },
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours
  await prisma.emailVerificationToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  });

  // Send verification email
  const emailResult = await sendVerificationEmail(user.email, token, user.name || undefined);
  if (!emailResult.success) {
    console.error("[register] Failed to send verification email:", emailResult.error);
    // Continue anyway, user can request resend
  }

  // Auto-login after registration
  const session = await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    message: "Account created successfully. Please verify your email.",
  });

  await setSessionCookie(session);

  return response;
}
