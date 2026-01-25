import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { randomBytes, scryptSync } from "node:crypto";

export const runtime = "nodejs";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const isAdmin =
      user.role === "Head coach" ||
      user.role === "Head analyst" ||
      user.role === "Admin";

    if (!isAdmin) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const playerId = parseInt(id);
    if (isNaN(playerId)) {
      return NextResponse.json({ ok: false, message: "Invalid player ID" }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as {
      email?: string;
      password?: string;
    } | null;

    if (!body?.email || !body?.password) {
      return NextResponse.json(
        { ok: false, message: "Email και κωδικός είναι απαραίτητα" },
        { status: 400 },
      );
    }

    const email = body.email.trim().toLowerCase();
    if (!email.includes("@")) {
      return NextResponse.json(
        { ok: false, message: "Μη έγκυρο email" },
        { status: 400 },
      );
    }

    const passwordHash = hashPassword(body.password);

    await prisma.$executeRawUnsafe(
      `UPDATE Player SET email = ?, passwordHash = ? WHERE id = ?`,
      email,
      passwordHash,
      playerId,
    );

    return NextResponse.json({ ok: true, message: "Player account updated" });
  } catch (error) {
    console.error("[admin/player-accounts] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to update player account" },
      { status: 500 },
    );
  }
}






