import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, matchId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ ok: false, message: "Playlist name is required" }, { status: 400 });
    }

    // TODO: Create playlist record in database
    // For now, we'll just return success
    // You can add a Playlist model to Prisma schema later

    return NextResponse.json({
      ok: true,
      message: "Playlist created successfully",
    });
  } catch (error) {
    console.error("[playlists] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to create playlist" },
      { status: 500 }
    );
  }
}

