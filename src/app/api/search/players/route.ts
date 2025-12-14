import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";

  const players = await prisma.player.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { position: { contains: query, mode: "insensitive" } },
            { club: { contains: query, mode: "insensitive" } },
          ],
        }
      : {},
    include: {
      team: {
        select: { id: true, name: true },
      },
    },
    take: 50,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    ok: true,
    players: players.map((p) => ({
      name: p.name,
      position: p.position,
      age: p.age,
      club: p.club || p.team?.name || null,
      slug: p.slug,
    })),
  });
}
