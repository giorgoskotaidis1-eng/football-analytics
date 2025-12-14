import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    // GET is public - frontend pages handle authentication checks
    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get("teamId");
    const searchParam = searchParams.get("search");
    
    // Pagination parameters (like Instat/Wyscout)
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50"); // Default 50 per page
    const skip = (page - 1) * limit;

    const where: any = {};
    if (teamId) {
      where.teamId = parseInt(teamId);
      console.log(`[players.GET] Filtering by teamId: ${teamId}`);
    }
    
    // Note: SQLite doesn't support case-insensitive search with mode: "insensitive"
    // We'll filter in memory after fetching if search is provided
    const shouldFilterInMemory = searchParam && searchParam.trim();

    // If no filters, get ALL players
    // Only log verbose info if limit > 1 (not a stats request)
    const isStatsRequest = limit === 1;
    if (!isStatsRequest) {
      console.log(`[players.GET] Pagination: page=${page}, limit=${limit}, skip=${skip}`);
      console.log(`[players.GET] Where clause:`, JSON.stringify(where));
      console.log(`[players.GET] Will filter in memory:`, shouldFilterInMemory);
    }

    // Build query - if where is empty, don't pass it at all
    const queryOptions: any = {
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
      orderBy: { id: "desc" },
      skip,
      take: limit,
    };

    // Only add where clause if there are actual filters
    if (Object.keys(where).length > 0) {
      queryOptions.where = where;
      if (!isStatsRequest) {
        console.log(`[players.GET] Applying WHERE filter:`, JSON.stringify(where));
      }
    } else {
      if (!isStatsRequest) {
        console.log(`[players.GET] No filters - fetching paginated players`);
      }
    }

    // Get total count for pagination (before filtering)
    const totalCount = await prisma.player.count({
      where: Object.keys(where).length > 0 ? where : undefined,
    });

    const players = await prisma.player.findMany(queryOptions);
    
    // Double-check: if we got 0 players but there should be players, log warning
    if (players.length === 0 && Object.keys(where).length === 0) {
      const totalCount = await prisma.player.count();
      if (totalCount > 0) {
        console.error(`[players.GET] ERROR: Query returned 0 players but database has ${totalCount} players!`);
      }
    }

    if (!isStatsRequest) {
      console.log(`[players.GET] Query options:`, JSON.stringify({ 
        hasWhere: !!queryOptions.where, 
        where: queryOptions.where,
        orderBy: queryOptions.orderBy 
      }));
      console.log(`[players.GET] Found ${players.length} players in database`);
      if (players.length > 0) {
        console.log(`[players.GET] Player IDs:`, players.map((p: any) => ({ id: p.id, name: p.name, slug: p.slug })));
      }
    }
    
    if (players.length === 0 && !isStatsRequest) {
      console.warn(`[players.GET] No players found! Where clause:`, JSON.stringify(where));
      // Try to get count of all players without filters
      const totalCount = await prisma.player.count();
      console.warn(`[players.GET] Total players in database: ${totalCount}`);
      if (totalCount > 0 && Object.keys(where).length > 0) {
        console.warn(`[players.GET] WARNING: Filters are excluding all players! Total in DB: ${totalCount}, but query returned 0`);
      }
    }
    
    // Calculate matches and game time for each player
    const playersWithStats = players.map((player: any) => {
      const { matchEvents, ...playerWithoutEvents } = player;
      
      // Get unique match IDs
      const uniqueMatchIds = new Set(matchEvents.map((e: any) => e.matchId));
      const matchesCount = uniqueMatchIds.size;

      // Calculate total game time (max minute from each match)
      const matchMinutes = new Map<number, number>();
      matchEvents.forEach((event: any) => {
        if (event.minute !== null) {
          const currentMax = matchMinutes.get(event.matchId) || 0;
          matchMinutes.set(event.matchId, Math.max(currentMax, event.minute));
        }
      });
      const totalGameTime = Array.from(matchMinutes.values()).reduce((sum, min) => sum + min, 0);

      return {
        ...playerWithoutEvents,
        id: player.id, // Ensure id is always included
        matchesCount,
        totalGameTime,
      };
    });

    // Apply search filter in memory if needed (SQLite limitation)
    let finalPlayers = playersWithStats;
    if (shouldFilterInMemory) {
      const searchTerm = searchParam!.toLowerCase().trim();
      finalPlayers = playersWithStats.filter((player: any) => {
        const nameMatch = player.name?.toLowerCase().includes(searchTerm);
        const positionMatch = player.position?.toLowerCase().includes(searchTerm);
        const clubMatch = player.club?.toLowerCase().includes(searchTerm);
        const teamMatch = player.team?.name?.toLowerCase().includes(searchTerm);
        return nameMatch || positionMatch || clubMatch || teamMatch;
      });
      if (!isStatsRequest) {
        console.log(`[players.GET] After in-memory filter: ${finalPlayers.length} players`);
      }
    }

    if (!isStatsRequest) {
      console.log(`[players.GET] Returning ${finalPlayers.length} players with stats`);
      console.log(`[players.GET] Total count: ${totalCount}, Filtered: ${shouldFilterInMemory}, Final: ${finalPlayers.length}`);
      if (finalPlayers.length > 0 && finalPlayers.length <= 10) {
        console.log(`[players.GET] Returning player IDs:`, finalPlayers.map((p: any) => ({ id: p.id, name: p.name })));
      }
    }
    
    // Return pagination info (like Instat/Wyscout)
    const paginationInfo = {
      page,
      limit,
      total: shouldFilterInMemory ? finalPlayers.length : totalCount, // If filtered, use filtered count
      totalPages: Math.ceil((shouldFilterInMemory ? finalPlayers.length : totalCount) / limit),
      hasMore: page * limit < (shouldFilterInMemory ? finalPlayers.length : totalCount),
    };
    
    if (!isStatsRequest) {
      console.log(`[players.GET] Pagination info:`, paginationInfo);
    }
    
    return NextResponse.json({ 
      ok: true, 
      players: finalPlayers,
      pagination: paginationInfo
    });
  } catch (error) {
    console.error("[players.GET] Error:", error);
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
  let maxAttempts = 100; // Prevent infinite loop
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
  const uniqueMatchIds = new Set(player.matchEvents.map((e: any) => e.matchId));
  const matchesCount = uniqueMatchIds.size;

  const matchMinutes = new Map<number, number>();
  player.matchEvents.forEach((event: any) => {
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

