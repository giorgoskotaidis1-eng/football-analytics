import { NextResponse } from "next/server";
import { deleteSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  await deleteSessionCookie();
  return NextResponse.json({ ok: true, message: "Logged out successfully" });
}

