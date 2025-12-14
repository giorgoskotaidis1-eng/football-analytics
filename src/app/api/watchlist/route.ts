import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET: Get user's watchlist
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const watchlist = await prisma.watchlistPlayer.findMany({
      where: { userId: user.id },
      include: {
        player: {
          include: {
            team: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      ok: true,
      watchlist: watchlist.map((w) => ({
        id: w.id,
        player: w.player,
        notes: w.notes,
        addedAt: w.createdAt,
      })),
    });
  } catch (error) {
    console.error("[watchlist.GET] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch watchlist" },
      { status: 500 }
    );
  }
}

// POST: Add player to watchlist
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      playerId?: number;
      notes?: string;
    } | null;

    if (!body?.playerId) {
      return NextResponse.json(
        { ok: false, message: "Player ID is required" },
        { status: 400 }
      );
    }

    // Check if player exists
    const player = await prisma.player.findUnique({
      where: { id: body.playerId },
    });

    if (!player) {
      return NextResponse.json(
        { ok: false, message: "Player not found" },
        { status: 404 }
      );
    }

    // Check if already in watchlist
    const existing = await prisma.watchlistPlayer.findUnique({
      where: {
        userId_playerId: {
          userId: user.id,
          playerId: body.playerId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, message: "Player already in watchlist" },
        { status: 409 }
      );
    }

    // Add to watchlist
    const watchlistItem = await prisma.watchlistPlayer.create({
      data: {
        userId: user.id,
        playerId: body.playerId,
        notes: body.notes || null,
      },
      include: {
        player: {
          include: {
            team: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      watchlistItem: {
        id: watchlistItem.id,
        player: watchlistItem.player,
        notes: watchlistItem.notes,
        addedAt: watchlistItem.createdAt,
      },
    });
  } catch (error) {
    console.error("[watchlist.POST] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to add player to watchlist" },
      { status: 500 }
    );
  }
}

// DELETE: Remove player from watchlist
export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const playerId = searchParams.get("playerId");

    if (!playerId) {
      return NextResponse.json(
        { ok: false, message: "Player ID is required" },
        { status: 400 }
      );
    }

    await prisma.watchlistPlayer.delete({
      where: {
        userId_playerId: {
          userId: user.id,
          playerId: parseInt(playerId),
        },
      },
    });

    return NextResponse.json({ ok: true, message: "Player removed from watchlist" });
  } catch (error) {
    console.error("[watchlist.DELETE] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to remove player from watchlist" },
      { status: 500 }
    );
  }
}


