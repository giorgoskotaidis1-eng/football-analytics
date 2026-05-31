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

  const numericId = /^\d+$/.test(id) ? parseInt(id, 10) : null;
  const match = await prisma.match.findFirst({
    where: {
      OR: [{ slug: id }, ...(numericId !== null ? [{ id: numericId }] : [])],
    },
    include: {
      homeTeam: true,
      awayTeam: true,
    },
  });

  if (!match) {
    return NextResponse.json({ ok: false, message: "Match not found" }, { status: 404 });
  }

  // Verify user has access to this match (through teams)
  const hasAccess = userTeamIds.length > 0 && (
    (match.homeTeamId && userTeamIds.includes(match.homeTeamId)) ||
    (match.awayTeamId && userTeamIds.includes(match.awayTeamId))
  );

  if (!hasAccess && userTeamIds.length > 0) {
    return NextResponse.json({ ok: false, message: "You don't have access to this match" }, { status: 403 });
  }

  return NextResponse.json({ ok: true, match });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    competition?: string;
    venue?: string;
    date?: string;
    scoreHome?: number;
    scoreAway?: number;
    xgHome?: number;
    xgAway?: number;
    shotsHome?: number;
    shotsAway?: number;
  } | null;

  if (!body) {
    return NextResponse.json({ ok: false, message: "Invalid body" }, { status: 400 });
  }

  const updateData: any = {};
  if (body.competition !== undefined) updateData.competition = body.competition;
  if (body.venue !== undefined) updateData.venue = body.venue;
  if (body.date !== undefined) updateData.date = new Date(body.date);
  if (body.scoreHome !== undefined) updateData.scoreHome = body.scoreHome;
  if (body.scoreAway !== undefined) updateData.scoreAway = body.scoreAway;
  if (body.xgHome !== undefined) updateData.xgHome = body.xgHome;
  if (body.xgAway !== undefined) updateData.xgAway = body.xgAway;
  if (body.shotsHome !== undefined) updateData.shotsHome = body.shotsHome;
  if (body.shotsAway !== undefined) updateData.shotsAway = body.shotsAway;

  const numericIdPatch = /^\d+$/.test(id) ? parseInt(id, 10) : null;
  const existing = await prisma.match.findFirst({
    where: {
      OR: [{ slug: id }, ...(numericIdPatch !== null ? [{ id: numericIdPatch }] : [])],
    },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Match not found" }, { status: 404 });
  }

  const match = await prisma.match.update({
    where: { id: existing.id },
    data: updateData,
    include: {
      homeTeam: {
        select: { id: true, name: true },
      },
      awayTeam: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json({ ok: true, match });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numericIdDel = /^\d+$/.test(id) ? parseInt(id, 10) : null;
  const existing = await prisma.match.findFirst({
    where: {
      OR: [{ slug: id }, ...(numericIdDel !== null ? [{ id: numericIdDel }] : [])],
    },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Match not found" }, { status: 404 });
  }
  await prisma.match.delete({ where: { id: existing.id } });

  return NextResponse.json({ ok: true, message: "Match deleted" });
}

