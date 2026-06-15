import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const MIN_JWT_SECRET_LENGTH = 32;
const DEV_FALLBACK_SECRET = "development-only-jwt-secret-change-before-production-32+";

let cachedSecretKey: Uint8Array | null = null;
let hasWarnedAboutDevSecret = false;

// Resolve the signing key lazily (at request time) rather than at module load.
// Evaluating this at import time breaks `next build` page-data collection, which
// runs with NODE_ENV=production but without the real JWT_SECRET available.
function getSecretKey(): Uint8Array {
  if (cachedSecretKey) {
    return cachedSecretKey;
  }

  const isProduction = process.env.NODE_ENV === "production";
  const configuredSecret = process.env.JWT_SECRET?.trim();
  const isSecretInvalid = !configuredSecret || configuredSecret.length < MIN_JWT_SECRET_LENGTH;

  if (isProduction && isSecretInvalid) {
    throw new Error("JWT_SECRET must be set and at least 32 characters in production");
  }

  if (!isProduction && isSecretInvalid && !hasWarnedAboutDevSecret) {
    hasWarnedAboutDevSecret = true;
    console.warn(
      "[auth] JWT_SECRET is missing or too short in development; using insecure development fallback secret."
    );
  }

  cachedSecretKey = new TextEncoder().encode(
    !isSecretInvalid ? (configuredSecret as string) : DEV_FALLBACK_SECRET
  );

  return cachedSecretKey;
}

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
    .sign(getSecretKey());

  return token;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
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
