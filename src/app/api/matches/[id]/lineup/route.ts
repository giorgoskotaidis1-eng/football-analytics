import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const matchId = parseInt(id);
  const teamId = parseInt(request.nextUrl.searchParams.get("teamId") || "0");

  if (isNaN(matchId) || !teamId) {
    return NextResponse.json({ ok: false, message: "Invalid match ID or team ID" }, { status: 400 });
  }

  try {
    const lineup = await prisma.matchLineup.findUnique({
      where: {
        matchId_teamId: {
          matchId,
          teamId,
        },
      },
    });

    if (!lineup) {
      return NextResponse.json({
        ok: true,
        lineup: null,
        formation: null,
      });
    }

    const positions = JSON.parse(lineup.positions || "[]");

    // Fetch player data for each position
    const positionsWithPlayers = await Promise.all(
      positions.map(async (pos: { playerId: number | null; x: number; y: number }) => {
        if (!pos.playerId) {
          return { ...pos, player: null };
        }
        const player = await prisma.player.findUnique({
          where: { id: pos.playerId },
        });
        return { ...pos, player };
      })
    );

    return NextResponse.json({
      ok: true,
      lineup: positionsWithPlayers,
      formation: lineup.formation,
    });
  } catch (error) {
    console.error("[matches.lineup] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch lineup" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const matchId = parseInt(id);

  if (isNaN(matchId)) {
    return NextResponse.json({ ok: false, message: "Invalid match ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { teamId, formation, positions } = body;

    if (!teamId || !formation || !positions) {
      return NextResponse.json(
        { ok: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify match exists
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return NextResponse.json({ ok: false, message: "Match not found" }, { status: 404 });
    }

    // Upsert lineup
    const lineup = await prisma.matchLineup.upsert({
      where: {
        matchId_teamId: {
          matchId,
          teamId: parseInt(teamId),
        },
      },
      update: {
        formation,
        positions: JSON.stringify(positions),
      },
      create: {
        matchId,
        teamId: parseInt(teamId),
        formation,
        positions: JSON.stringify(positions),
      },
    });

    return NextResponse.json({
      ok: true,
      lineup,
      message: "Lineup saved successfully",
    });
  } catch (error) {
    console.error("[matches.lineup] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to save lineup" },
      { status: 500 }
    );
  }
}

