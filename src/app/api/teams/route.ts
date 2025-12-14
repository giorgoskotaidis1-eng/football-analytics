import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    // GET is public - frontend pages handle authentication checks
    const teams = await prisma.team.findMany({
      include: {
        _count: {
          select: { players: true, homeGames: true, awayGames: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, teams });
  } catch (error) {
    console.error("[teams.GET] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    league?: string;
    style?: string;
  } | null;

  if (!body?.name) {
    return NextResponse.json({ ok: false, message: "Team name is required" }, { status: 400 });
  }

  const team = await prisma.team.create({
    data: {
      name: body.name,
      league: body.league || null,
      style: body.style || null,
    },
  });

  return NextResponse.json({ ok: true, team }, { status: 201 });
}

