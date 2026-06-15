import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getUserTeamIds } from "@/lib/user-teams";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get("teamId");
    const searchParam = searchParams.get("search")?.trim() || "";

    const rawPage = Number.parseInt(searchParams.get("page") || "", 10);
    const rawLimit = Number.parseInt(searchParams.get("limit") || "", 10);
    const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;
    const skip = (page - 1) * limit;

    const andFilters: Prisma.PlayerWhereInput[] = [];

    if (user) {
      const userTeamIds = await getUserTeamIds(user.id);

      if (userTeamIds.length > 0) {
        if (teamId) {
          const requestedTeamId = Number.parseInt(teamId, 10);
          if (!Number.isFinite(requestedTeamId) || requestedTeamId <= 0) {
            return NextResponse.json({ ok: false, message: "Invalid teamId" }, { status: 400 });
          }
          if (userTeamIds.includes(requestedTeamId)) {
            andFilters.push({ teamId: requestedTeamId });
          } else {
            return NextResponse.json({ ok: true, players: [], pagination: { page: 1, limit, total: 0, totalPages: 0, hasMore: false } });
          }
        } else {
          andFilters.push({ teamId: { in: userTeamIds } });
        }
      } else {
        return NextResponse.json({ ok: true, players: [], pagination: { page: 1, limit, total: 0, totalPages: 0, hasMore: false } });
      }
    } else if (teamId) {
      const publicTeamId = Number.parseInt(teamId, 10);
      if (!Number.isFinite(publicTeamId) || publicTeamId <= 0) {
        return NextResponse.json({ ok: false, message: "Invalid teamId" }, { status: 400 });
      }
      andFilters.push({ teamId: publicTeamId });
    }

    if (searchParam) {
      andFilters.push({
        OR: [
          { name: { contains: searchParam, mode: "insensitive" } },
          { position: { contains: searchParam, mode: "insensitive" } },
          { club: { contains: searchParam, mode: "insensitive" } },
          { team: { name: { contains: searchParam, mode: "insensitive" } } },
        ],
      });
    }

    const where = andFilters.length > 0 ? { AND: andFilters } : undefined;
    const [totalCount, players] = await Promise.all([
      prisma.player.count({ where }),
      prisma.player.findMany({
        where,
        include: {
          team: {
            select: { id: true, name: true },
          },
        },
        orderBy: { id: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const playerIds = players.map((player) => player.id);
    const playerMatchMinutes =
      playerIds.length > 0
        ? await prisma.matchEvent.groupBy({
            by: ["playerId", "matchId"],
            where: {
              playerId: { in: playerIds },
            },
            _max: { minute: true },
          })
        : [];

    const statByPlayerId = new Map<number, { matchesCount: number; totalGameTime: number }>();
    for (const row of playerMatchMinutes) {
      if (!row.playerId) continue;
      const existing = statByPlayerId.get(row.playerId) || { matchesCount: 0, totalGameTime: 0 };
      existing.matchesCount += 1;
      existing.totalGameTime += row._max.minute ?? 0;
      statByPlayerId.set(row.playerId, existing);
    }

    const playersWithStats = players.map((player) => {
      const stats = statByPlayerId.get(player.id) || { matchesCount: 0, totalGameTime: 0 };
      return {
        ...player,
        matchesCount: stats.matchesCount,
        totalGameTime: stats.totalGameTime,
      };
    });

    const paginationInfo = {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: page * limit < totalCount,
    };

    return NextResponse.json({
      ok: true,
      players: playersWithStats,
      pagination: paginationInfo,
    });
  } catch (error) {
    console.error("[players.GET] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch players" },
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
    position?: string;
    age?: number;
    club?: string;
    nationality?: string;
    foot?: string;
    teamId?: number;
    number?: number;
  } | null;

  if (!body?.name || !body?.position) {
    return NextResponse.json({ ok: false, message: "Name and position are required" }, { status: 400 });
  }

  // Generate slug from name + club/team to make it unique
  let slugBase = body.name
    .toLowerCase()
    .replace(/[^a-z0-9α-ωάέήίόύώ]+/g, "-") // Support Greek characters
    .replace(/(^-|-$)/g, "");
  
  // Ensure slugBase is not empty
  if (!slugBase || slugBase.length === 0) {
    slugBase = `player-${Date.now()}`;
  }
  
  // Add club or team to slug if provided
  if (body.club) {
    const clubSlug = body.club
      .toLowerCase()
      .replace(/[^a-z0-9α-ωάέήίόύώ]+/g, "-")
      .replace(/(^-|-$)/g, "");
    if (clubSlug && clubSlug.length > 0) {
      slugBase = `${slugBase}-${clubSlug}`;
    }
  } else if (body.teamId) {
    const team = await prisma.team.findUnique({ where: { id: body.teamId }, select: { name: true } });
    if (team && team.name) {
      const teamSlug = team.name
        .toLowerCase()
        .replace(/[^a-z0-9α-ωάέήίόύώ]+/g, "-")
        .replace(/(^-|-$)/g, "");
      if (teamSlug && teamSlug.length > 0) {
        slugBase = `${slugBase}-${teamSlug}`;
      }
    }
  }
  
  // If slug still exists, add a number suffix
  let slug = slugBase;
  let counter = 1;
  const maxAttempts = 100; // Prevent infinite loop
  while (counter < maxAttempts) {
    const existing = await prisma.player.findUnique({ where: { slug } });
    if (!existing) break;
    slug = `${slugBase}-${counter}`;
    counter++;
  }
  
  // Final fallback if all attempts failed
  if (counter >= maxAttempts) {
    slug = `${slugBase}-${Date.now()}`;
  }

  const player = await prisma.player.create({
    data: {
      name: body.name,
      slug,
      position: body.position,
      age: body.age || null,
      club: body.club || null,
      nationality: body.nationality || null,
      foot: body.foot || null,
      teamId: body.teamId || null,
      number: body.number || null,
    },
    include: {
      team: {
        select: { id: true, name: true },
      },
      matchEvents: {
        select: {
          matchId: true,
          minute: true,
        },
      },
    },
  });

  // Calculate matches and game time for the new player (same logic as GET)
  const uniqueMatchIds = new Set(player.matchEvents.map((e) => e.matchId));
  const matchesCount = uniqueMatchIds.size;

  const matchMinutes = new Map<number, number>();
  player.matchEvents.forEach((event) => {
    if (event.minute !== null) {
      const currentMax = matchMinutes.get(event.matchId) || 0;
      matchMinutes.set(event.matchId, Math.max(currentMax, event.minute));
    }
  });
  const totalGameTime = Array.from(matchMinutes.values()).reduce((sum, min) => sum + min, 0);

  const playerWithStats = {
    ...player,
    matchesCount,
    totalGameTime,
    matchEvents: undefined, // Remove from response
  };

  return NextResponse.json({ ok: true, player: playerWithStats }, { status: 201 });
}
