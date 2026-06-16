import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { getAuth0Client } from "@/lib/auth0";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const DEFAULT_USER_ROLE = "Head analyst";
const SESSION_EXPIRATION_DAYS = 30;

function redirectToLogin(request: NextRequest, message?: string) {
  const url = new URL("/auth/login", request.url);
  if (message) {
    url.searchParams.set("error", message);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const auth0 = getAuth0Client();
  if (!auth0) {
    return redirectToLogin(request, "Google sign-in is not configured yet.");
  }

  const auth0Session = await auth0.getSession();
  if (!auth0Session) {
    return redirectToLogin(request, "Authentication session missing. Please try again.");
  }

  const auth0User = auth0Session.user as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };

  const email = auth0User.email?.trim().toLowerCase();
  const auth0Id = auth0User.sub?.trim();
  const verifiedEmail = auth0User.email_verified === true;

  if (!email || !auth0Id || !verifiedEmail) {
    return redirectToLogin(request, "Google account must have a verified email.");
  }

  let userId: number;
  let name: string | null;
  let role: string | null;
  let redirectPath = "/";

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    userId = user.id;
    name = user.name ?? auth0User.name ?? null;
    role = user.role ?? DEFAULT_USER_ROLE;

    if (user.auth0Id !== auth0Id || (!user.name && auth0User.name)) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            auth0Id,
            ...(user.name ? {} : { name: auth0User.name ?? null }),
          },
        });
      } catch (error) {
        console.error("[sso-complete] Failed to link Auth0 user:", error);
      }
    }
  } else {
    const player = await prisma.player.findUnique({ where: { email } });

    if (player) {
      userId = player.id;
      name = player.name ?? auth0User.name ?? null;
      role = "Player";
      redirectPath = `/players/${player.id}/dashboard`;

      try {
        await prisma.player.update({
          where: { id: player.id },
          data: {
            auth0Id,
            lastLoginAt: new Date(),
            isOnline: true,
          },
        });
      } catch (error) {
        console.error("[sso-complete] Failed to update player login tracking:", error);
      }
    } else {
      const createdUser = await prisma.user.create({
        data: {
          email,
          name: auth0User.name ?? null,
          role: DEFAULT_USER_ROLE,
          passwordHash: null,
          emailVerified: true,
          auth0Id,
        },
      });

      userId = createdUser.id;
      name = createdUser.name;
      role = createdUser.role ?? DEFAULT_USER_ROLE;
    }
  }

  const token = await createSession(
    {
      userId,
      email,
      name,
      role,
    },
    SESSION_EXPIRATION_DAYS
  );

  const response = NextResponse.redirect(new URL(redirectPath, request.url));
  response.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * SESSION_EXPIRATION_DAYS,
    path: "/",
  });

  return response;
}

