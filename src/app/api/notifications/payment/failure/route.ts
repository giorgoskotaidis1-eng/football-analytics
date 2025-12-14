import { NextResponse } from "next/server";
import { sendPaymentFailureEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    userId?: number;
    email?: string;
    reason?: string;
  } | null;

  if (!body?.email || !body.reason) {
    return NextResponse.json({ ok: false, message: "Missing email or reason" }, { status: 400 });
  }

  // Get user info if userId provided
  let userName: string | undefined;
  if (body.userId) {
    const user = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { name: true },
    });
    userName = user?.name || undefined;
  }

  const result = await sendPaymentFailureEmail(body.email, body.reason, userName);

  if (!result.success) {
    console.error("[payment.failure] Failed to send:", result.error);
  }

  return NextResponse.json({ ok: true, message: "Failure notification sent" });
}
