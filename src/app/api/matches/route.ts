import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    // GET is public - frontend pages handle authentication checks
    const searchParams = request.nextUrl.searchParams;
    const competition = searchParams.get("competition");
    const season = searchParams.get("season");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const teamId = searchParams.get("teamId");
    const search = searchParams.get("search");
    const limit = searchParams.get("limit");

    const where: any = {};

    if (competition && competition !== "All") {
      where.competition = competition;
    }

    if (season && season !== "All") {
      const seasonYear = season.includes("-") ? parseInt(season.split("-")[0]) : parseInt(season);
      if (!isNaN(seasonYear)) {
        where.date = {
          gte: new Date(`${seasonYear}-07-01`),
          lt: new Date(`${seasonYear + 1}-07-01`),
        };
      }
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      if (!isNaN(fromDate.getTime())) {
        where.date = { ...where.date, gte: fromDate };
      }
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      if (!isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        where.date = { ...where.date, lte: toDate };
      }
    }

    if (teamId) {
      const teamIdNum = parseInt(teamId);
      if (!isNaN(teamIdNum)) {
        where.OR = [
          { homeTeamId: teamIdNum },
          { awayTeamId: teamIdNum },
        ];
      }
    }

    if (search && search.trim()) {
      const searchTerm = search.trim();
      const searchNum = parseInt(searchTerm);
      if (!isNaN(searchNum)) {
        where.OR = [
          ...(where.OR || []),
          { id: searchNum },
        ];
      }
    }

    const matches = await prisma.match.findMany({
      where,
      select: {
        id: true,
        slug: true,
        competition: true,
        venue: true,
        date: true,
        scoreHome: true,
        scoreAway: true,
        xgHome: true,
        xgAway: true,
        shotsHome: true,
        shotsAway: true,
        homeTeamId: true,
        awayTeamId: true,
        homeTeamName: true,
        awayTeamName: true,
        homeTeam: {
          select: { id: true, name: true },
        },
        awayTeam: {
          select: { id: true, name: true },
        },
      },
      orderBy: { date: "desc" },
      take: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json({ ok: true, matches });
  } catch (error) {
    console.error("[matches.GET] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
      console.log("[matches.POST] Received body:", body);
    } catch (parseError) {
      console.error("[matches.POST] Failed to parse request body:", parseError);
      return NextResponse.json(
        { ok: false, message: "Invalid request data. Please check all fields." },
        { status: 400 }
      );
    }

    const typedBody = body as {
      homeTeamId?: number;
      awayTeamId?: number;
      homeTeamName?: string;
      awayTeamName?: string;
      competition?: string;
      venue?: string;
      date?: string;
      scoreHome?: number;
      scoreAway?: number;
      xgHome?: number;
      xgAway?: number;
      shotsHome?: number;
      shotsAway?: number;
    };

    if (!typedBody.competition || !typedBody.competition.trim()) {
      return NextResponse.json(
        { ok: false, message: "Competition is required" },
        { status: 400 }
      );
    }

    if (!typedBody.date) {
      return NextResponse.json(
        { ok: false, message: "Date is required" },
        { status: 400 }
      );
    }

    const hasHomeTeam = !!(typedBody.homeTeamId || (typedBody.homeTeamName && typedBody.homeTeamName.trim()));
    const hasAwayTeam = !!(typedBody.awayTeamId || (typedBody.awayTeamName && typedBody.awayTeamName.trim()));
    
    if (!hasHomeTeam) {
      return NextResponse.json(
        { ok: false, message: "Home team is required (either select a registered team or enter opponent name)" },
        { status: 400 }
      );
    }

    if (!hasAwayTeam) {
      return NextResponse.json(
        { ok: false, message: "Away team is required (either select a registered team or enter opponent name)" },
        { status: 400 }
      );
    }

    let homeTeamName: string;
    let awayTeamName: string;

    if (typedBody.homeTeamId) {
      const homeTeam = await prisma.team.findUnique({ where: { id: typedBody.homeTeamId } });
      if (!homeTeam) {
        return NextResponse.json({ ok: false, message: "Home team not found" }, { status: 404 });
      }
      homeTeamName = homeTeam.name;
    } else {
      homeTeamName = typedBody.homeTeamName!.trim();
    }

    if (typedBody.awayTeamId) {
      const awayTeam = await prisma.team.findUnique({ where: { id: typedBody.awayTeamId } });
      if (!awayTeam) {
        return NextResponse.json({ ok: false, message: "Away team not found" }, { status: 404 });
      }
      awayTeamName = awayTeam.name;
    } else {
      awayTeamName = typedBody.awayTeamName!.trim();
    }

    let matchDate: Date;
    try {
      matchDate = new Date(typedBody.date);
      if (isNaN(matchDate.getTime())) {
        return NextResponse.json(
          { ok: false, message: "Invalid date format" },
          { status: 400 }
        );
      }
    } catch (dateError) {
      console.error("[matches.POST] Date parsing error:", dateError);
      return NextResponse.json(
        { ok: false, message: "Invalid date format" },
        { status: 400 }
      );
    }

    const slug = `${homeTeamName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-vs-${awayTeamName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}-${matchDate.toISOString().split("T")[0]}`;

    const existing = await prisma.match.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ ok: false, message: "A match with these details already exists" }, { status: 409 });
    }

    // Build data object - only include fields that should be set
    const createData: {
      slug: string;
      competition: string;
      venue: string | null;
      date: Date;
      scoreHome: number;
      scoreAway: number;
      xgHome: number;
      xgAway: number;
      shotsHome: number;
      shotsAway: number;
      homeTeamId?: number | null;
      awayTeamId?: number | null;
      homeTeamName?: string | null;
      awayTeamName?: string | null;
    } = {
      slug,
      competition: typedBody.competition.trim(),
      venue: typedBody.venue?.trim() || null,
      date: matchDate,
      scoreHome: typedBody.scoreHome || 0,
      scoreAway: typedBody.scoreAway || 0,
      xgHome: typedBody.xgHome || 0,
      xgAway: typedBody.xgAway || 0,
      shotsHome: typedBody.shotsHome || 0,
      shotsAway: typedBody.shotsAway || 0,
    };

    // Set team fields based on mode
    if (typedBody.homeTeamId) {
      createData.homeTeamId = typedBody.homeTeamId;
      // Don't set homeTeamName when homeTeamId is set
    } else if (typedBody.homeTeamName) {
      createData.homeTeamId = null;
      createData.homeTeamName = typedBody.homeTeamName.trim();
    }

    if (typedBody.awayTeamId) {
      createData.awayTeamId = typedBody.awayTeamId;
      // Don't set awayTeamName when awayTeamId is set
    } else if (typedBody.awayTeamName) {
      createData.awayTeamId = null;
      createData.awayTeamName = typedBody.awayTeamName.trim();
    }

    // Create match - Prisma Client should handle optional teams correctly
    const match = await prisma.match.create({
      data: createData,
      include: {
        homeTeam: {
          select: { id: true, name: true },
        },
        awayTeam: {
          select: { id: true, name: true },
        },
      },
    });

    console.log("[matches.POST] Match created successfully:", match.id);
    return NextResponse.json({ ok: true, match }, { status: 201 });
  } catch (error) {
    console.error("[matches.POST] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

