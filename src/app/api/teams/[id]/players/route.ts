import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// Assign players to a team
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const teamId = parseInt(id);

  if (isNaN(teamId)) {
    return NextResponse.json({ ok: false, message: "Invalid team ID" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    playerIds?: number[];
  } | null;

  if (!body || !body.playerIds || !Array.isArray(body.playerIds)) {
    return NextResponse.json({ ok: false, message: "playerIds array is required" }, { status: 400 });
  }

  // Verify team exists
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    return NextResponse.json({ ok: false, message: "Team not found" }, { status: 404 });
  }

  // Update all players to assign them to this team
  await prisma.player.updateMany({
    where: {
      id: { in: body.playerIds },
    },
    data: {
      teamId: teamId,
    },
  });

  // Get updated team with players
  const updatedTeam = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      players: {
        select: {
          id: true,
          name: true,
          position: true,
          number: true,
          slug: true,
        },
        orderBy: { name: "asc" },
      },
      _count: {
        select: { players: true, homeGames: true, awayGames: true },
      },
    },
  });

  return NextResponse.json({ ok: true, team: updatedTeam });
}

// Remove a player from a team
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const teamId = parseInt(id);

  if (isNaN(teamId)) {
    return NextResponse.json({ ok: false, message: "Invalid team ID" }, { status: 400 });
  }

  const searchParams = request.nextUrl.searchParams;
  const playerId = searchParams.get("playerId");

  if (!playerId) {
    return NextResponse.json({ ok: false, message: "playerId is required" }, { status: 400 });
  }

  const playerIdNum = parseInt(playerId);
  if (isNaN(playerIdNum)) {
    return NextResponse.json({ ok: false, message: "Invalid player ID" }, { status: 400 });
  }

  // Remove player from team
  await prisma.player.update({
    where: { id: playerIdNum },
    data: { teamId: null },
  });

  return NextResponse.json({ ok: true, message: "Player removed from team" });
}


