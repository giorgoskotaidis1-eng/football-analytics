import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const email = request.headers.get("x-user-email") || undefined;
    const { phone } = (await request.json().catch(() => ({}))) as { phone?: string };

    if (!email || !phone) {
      return NextResponse.json({ error: "Missing email or phone" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const code = (crypto.randomInt(100000, 999999)).toString();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 10); // 10 minutes

    await prisma.phoneVerificationCode.create({
      data: {
        code,
        userId: user.id,
        expiresAt,
      },
    });

    // Optionally store phone number on user in a real implementation.
    await prisma.user.update({ where: { id: user.id }, data: { phone } });

    // In production you would send this code via SMS provider.
    return NextResponse.json({ ok: true, code });
  } catch (error) {
    console.error("[phone.send-code] error", error);
    return NextResponse.json({ error: "Failed to generate verification code" }, { status: 500 });
  }
}
