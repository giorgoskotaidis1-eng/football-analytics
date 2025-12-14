import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const email = request.headers.get("x-user-email") || undefined;
    const { code } = (await request.json().catch(() => ({}))) as { code?: string };

    if (!email || !code) {
      return NextResponse.json({ error: "Missing email or code" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const record = await prisma.phoneVerificationCode.findFirst({
      where: { userId: user.id, code },
      orderBy: { createdAt: "desc" },
    });

    if (!record || record.expiresAt < new Date()) {
      return NextResponse.json({ error: "Code is invalid or has expired" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: true },
    });

    await prisma.phoneVerificationCode.delete({ where: { id: record.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[phone.verify-code] error", error);
    return NextResponse.json({ error: "Failed to verify code" }, { status: 500 });
  }
}
