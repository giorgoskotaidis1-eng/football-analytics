import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;

  if (!body?.email) {
    return NextResponse.json({ ok: false, message: "Missing email" }, { status: 400 });
  }

  // Get user info for personalized email
  const user = await prisma.user.findUnique({
    where: { email: body.email },
    select: { name: true },
  });

  const result = await sendWelcomeEmail(body.email, user?.name || undefined);

  if (!result.success) {
    console.error("[welcome-email] Failed to send:", result.error);
    // Don't fail the request, just log the error
  }

  return NextResponse.json({ ok: true, message: "Welcome email has been sent." });
}
