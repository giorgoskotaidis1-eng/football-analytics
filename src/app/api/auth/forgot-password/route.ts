import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { email } = (await request.json().catch(() => ({}))) as { email?: string };

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Do not reveal whether the email exists
      return NextResponse.json({ ok: true });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(user.email, token, user.name || undefined);
    if (!emailResult.success) {
      console.error("[forgot-password] Failed to send email:", emailResult.error);
      // Still return success to not reveal if email exists
    }

    return NextResponse.json({ ok: true, message: "If an account exists, a password reset email has been sent." });
  } catch (error) {
    console.error("[forgot-password] error", error);
    return NextResponse.json({ error: "Failed to create reset token" }, { status: 500 });
  }
}
