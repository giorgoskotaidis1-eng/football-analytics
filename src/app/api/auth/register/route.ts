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
    role?: string;
  } | null;

  if (!body?.email || !body?.password) {
    return NextResponse.json({ ok: false, message: "Email and password are required" }, { status: 400 });
  }

  const { email, password, name, club, role } = body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ ok: false, message: "A user with this email already exists" }, { status: 409 });
  }

  // Create user with selected role (default to "Head Coach" if not provided)
  const userRole = role || "Head Coach";

  // Create user and team in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create user
    const user = await tx.user.create({
      data: {
        email,
        name,
        role: userRole,
        passwordHash: hashPassword(password),
      },
    });

    // Create team if club name is provided
    let team = null;
    if (club && club.trim()) {
      team = await tx.team.create({
        data: {
          name: club.trim(),
          createdById: user.id,
        },
      });

      // Add user to team as Head Coach (or selected role)
      // Check if UserTeam model exists (after migration)
      try {
        await tx.userTeam.create({
          data: {
            userId: user.id,
            teamId: team.id,
            role: userRole,
            status: "active",
          },
        });
      } catch (error: any) {
        // If UserTeam doesn't exist yet (before migration), just log and continue
        // The team is still created, user just won't be in UserTeam table yet
        console.warn("[register] UserTeam model not available yet. Run migration to enable staff management.");
      }
    }

    return { user, team };
  });

  const { user, team } = result;

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
    team: team ? {
      id: team.id,
      name: team.name,
    } : null,
    message: team 
      ? "Account and team created successfully. Please verify your email."
      : "Account created successfully. Please verify your email.",
  });

  await setSessionCookie(session);

  return response;
}
