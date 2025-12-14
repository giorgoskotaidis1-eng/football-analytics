import { NextRequest, NextResponse } from "next/server";
import { getSession } from "./auth";

export async function requireAuth(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  return session;
}

export async function getAuthUser(request: NextRequest) {
  const session = await getSession();
  return session;
}

