import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ALLOWED_NOTIFICATION_PREFERENCES = new Set(["all", "important", "muted"]);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      phone: true,
      phoneVerified: true,
      profilePicture: true,
      notificationPreference: true,
      createdAt: true,
    },
  });

  if (!fullUser) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      email: fullUser.email,
      name: fullUser.name,
      role: fullUser.role,
      emailVerified: fullUser.emailVerified,
      phone: fullUser.phone,
      phoneVerified: fullUser.phoneVerified,
      profilePicture: fullUser.profilePicture,
      notificationPreference: fullUser.notificationPreference,
      createdAt: fullUser.createdAt,
    },
  });
}

async function updateAccount(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    role?: string;
    notificationPreference?: string;
  } | null;
  if (!body) {
    return NextResponse.json({ ok: false, message: "Invalid body" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name.trim().slice(0, 80);
  if (typeof body.role === "string") data.role = body.role.trim().slice(0, 80);
  if (typeof body.notificationPreference === "string") {
    if (!ALLOWED_NOTIFICATION_PREFERENCES.has(body.notificationPreference)) {
      return NextResponse.json(
        { ok: false, message: "Invalid notificationPreference" },
        { status: 400 }
      );
    }
    data.notificationPreference = body.notificationPreference;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, message: "No updatable fields provided" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
  });

  return NextResponse.json({
    ok: true,
    user: {
      email: updated.email,
      name: updated.name,
      role: updated.role,
      profilePicture: updated.profilePicture,
      notificationPreference: updated.notificationPreference,
    },
  });
}

export async function PATCH(request: Request) {
  return updateAccount(request);
}

export async function POST(request: Request) {
  return updateAccount(request);
}
