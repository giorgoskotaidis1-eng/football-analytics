import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt,
    },
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { name?: string; role?: string } | null;
  if (!body) {
    return NextResponse.json({ ok: false, message: "Invalid body" }, { status: 400 });
  }

  const { name, role } = body;

  const { prisma } = await import("@/lib/prisma");
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(role !== undefined ? { role } : {}),
    },
  });

  return NextResponse.json({
    ok: true,
    user: {
      email: updated.email,
      name: updated.name,
      role: updated.role,
      profilePicture: updated.profilePicture,
    },
  });
}
