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
  const match = await prisma.match.findUnique({
    where: { slug: id },
    include: {
      homeTeam: true,
      awayTeam: true,
    },
  });

  if (!match) {
    return NextResponse.json({ ok: false, message: "Match not found" }, { status: 404 });
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

  const match = await prisma.match.update({
    where: { slug: id },
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
  await prisma.match.delete({ where: { slug: id } });

  return NextResponse.json({ ok: true, message: "Match deleted" });
}

