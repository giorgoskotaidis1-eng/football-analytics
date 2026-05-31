import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const teamId = parseInt(id);

  if (isNaN(teamId)) {
    return NextResponse.json({ ok: false, message: "Invalid team ID" }, { status: 400 });
  }

  // Get user's team IDs to verify access
  const userTeams = await prisma.userTeam.findMany({
    where: { userId: user.id, status: "active" },
    select: { teamId: true },
  });
  
  const createdTeams = await prisma.team.findMany({
    where: { createdById: user.id },
    select: { id: true },
  });
  
  const userTeamIds = [
    ...userTeams.map((ut) => ut.teamId),
    ...createdTeams.map((t) => t.id),
  ];

  const team = await prisma.team.findUnique({
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

  if (!team) {
    return NextResponse.json({ ok: false, message: "Team not found" }, { status: 404 });
  }

  // Verify user has access to this team
  if (!userTeamIds.includes(team.id)) {
    return NextResponse.json({ ok: false, message: "You don't have access to this team" }, { status: 403 });
  }

  return NextResponse.json({ ok: true, team });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    name?: string;
    league?: string;
    style?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ ok: false, message: "Invalid body" }, { status: 400 });
  }

  const updateData: any = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.league !== undefined) updateData.league = body.league || null;
  if (body.style !== undefined) updateData.style = body.style || null;

  const team = await prisma.team.update({
    where: { id: teamId },
    data: updateData,
    include: {
      _count: {
        select: { players: true, homeGames: true, awayGames: true },
      },
    },
  });

  return NextResponse.json({ ok: true, team });
}

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

  await prisma.team.delete({ where: { id: teamId } });

  return NextResponse.json({ ok: true, message: "Team deleted" });
}


