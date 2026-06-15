import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const MIN_JWT_SECRET_LENGTH = 32;
const isProduction = process.env.NODE_ENV === "production";
const configuredSecret = process.env.JWT_SECRET?.trim();

if (isProduction && (!configuredSecret || configuredSecret.length < MIN_JWT_SECRET_LENGTH)) {
  throw new Error("JWT_SECRET must be set and at least 32 characters in production");
}

if (!isProduction && (!configuredSecret || configuredSecret.length < MIN_JWT_SECRET_LENGTH)) {
  console.warn(
    "[auth] JWT_SECRET is missing or too short in development; using insecure development fallback secret."
  );
}

const SECRET_KEY = new TextEncoder().encode(
  configuredSecret && configuredSecret.length >= MIN_JWT_SECRET_LENGTH
    ? configuredSecret
    : "development-only-jwt-secret-change-before-production-32+"
);

export interface SessionPayload extends JWTPayload {
  userId: number;
  email: string;
  name: string | null;
  role: string | null;
}

export async function createSession(payload: SessionPayload, expirationDays: number = 7): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${expirationDays}d`)
    .sign(SECRET_KEY);

  return token;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return null;
    return verifySession(token);
  } catch (error) {
    console.error("[auth.getSession] Error:", error);
    return null; // Return null on error instead of throwing
  }
}

export async function setSessionCookie(token: string, expirationDays: number = 7) {
  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * expirationDays, // days in seconds
    path: "/",
  });
}

export async function deleteSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export async function getCurrentUser() {
  try {
    const session = await getSession();
    if (!session) return null;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
      },
    });

    return user;
  } catch (error) {
    console.error("[auth.getCurrentUser] Error:", error);
    return null; // Return null on error instead of throwing
  }
}
