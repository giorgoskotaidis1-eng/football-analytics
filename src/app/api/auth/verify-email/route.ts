import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ ok: false, message: "Missing token" }, { status: 400 });
  }

  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record) {
    return NextResponse.json({ ok: false, message: "Invalid or already used token" }, { status: 400 });
  }

  if (record.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { id: record.id } });
    return NextResponse.json({ ok: false, message: "Verification link has expired" }, { status: 410 });
  }

  await prisma.user.update({
    where: { email: record.email },
    data: { emailVerified: true },
  });

  await prisma.emailVerificationToken.delete({ where: { id: record.id } });

  return NextResponse.json({ ok: true, message: "Email verified" });
}
