import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["all", "players", "teams", "matches"] as const);
type SearchType = "all" | "players" | "teams" | "matches";

const AGE_RANGES: Record<string, { min?: number; max?: number }> = {
  u19: { max: 18 },
  "19-24": { min: 19, max: 24 },
  "25-30": { min: 25, max: 30 },
  "30+": { min: 31 },
};

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const typeRaw = (url.searchParams.get("type") ?? "all") as SearchType;
  const type: SearchType = ALLOWED_TYPES.has(typeRaw) ? typeRaw : "all";
  const position = url.searchParams.get("position")?.trim() || null;
  const ageRangeKey = url.searchParams.get("ageRange")?.trim() || null;
  const competition = url.searchParams.get("competition")?.trim() || null;

  // Determine the user's allowed team scope
  const userTeams = await prisma.userTeam.findMany({
    where: { userId: user.id, status: "active" },
    select: { teamId: true },
  });
  const createdTeams = await prisma.team.findMany({
    where: { createdById: user.id },
    select: { id: true },
  });
  const userTeamIds = Array.from(
    new Set([
      ...userTeams.map((ut) => ut.teamId),
      ...createdTeams.map((t) => t.id),
    ])
  );

  const wantPlayers = type === "all" || type === "players";
  const wantTeams = type === "all" || type === "teams";
  const wantMatches = type === "all" || type === "matches";

  let players: Array<{
    id: number;
    name: string;
    slug: string;
    position: string;
    age: number | null;
    club: string | null;
    team: { id: number; name: string } | null;
  }> = [];
  let teams: Array<{ id: number; name: string; league: string | null }> = [];
  let matches: Array<{
    id: number;
    slug: string;
    competition: string;
    date: Date;
    homeTeam: { id: number; name: string } | null;
    awayTeam: { id: number; name: string } | null;
    homeTeamName: string | null;
    awayTeamName: string | null;
  }> = [];

  if (wantPlayers) {
    const playerWhere: Record<string, unknown> = {};
    if (userTeamIds.length > 0) {
      playerWhere.OR = [
        { teamId: { in: userTeamIds } },
        { teamId: null }, // free agents in user data
      ];
    }
    if (position) playerWhere.position = position;
    if (ageRangeKey && AGE_RANGES[ageRangeKey]) {
      const { min, max } = AGE_RANGES[ageRangeKey];
      const ageFilter: Record<string, number> = {};
      if (typeof min === "number") ageFilter.gte = min;
      if (typeof max === "number") ageFilter.lte = max;
      playerWhere.age = ageFilter;
    }
    if (q) {
      playerWhere.AND = [
        {
          OR: [
            { name: { contains: q } },
            { position: { contains: q } },
            { club: { contains: q } },
          ],
        },
      ];
    }
    const found = await prisma.player.findMany({
      where: playerWhere,
      include: { team: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
      take: 20,
    });
    players = found.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      position: p.position,
      age: p.age,
      club: p.club,
      team: p.team,
    }));
  }

  if (wantTeams) {
    const teamWhere: Record<string, unknown> = {};
    if (userTeamIds.length > 0) teamWhere.id = { in: userTeamIds };
    if (q) teamWhere.name = { contains: q };
    const foundTeams = await prisma.team.findMany({
      where: teamWhere,
      orderBy: { name: "asc" },
      take: 20,
      select: { id: true, name: true, league: true },
    });
    teams = foundTeams;
  }

  if (wantMatches) {
    const matchWhere: Record<string, unknown> = {};
    if (userTeamIds.length > 0) {
      matchWhere.OR = [
        { homeTeamId: { in: userTeamIds } },
        { awayTeamId: { in: userTeamIds } },
      ];
    }
    if (competition) matchWhere.competition = competition;
    if (q) {
      const qFilter = {
        OR: [
          { competition: { contains: q } },
          { homeTeamName: { contains: q } },
          { awayTeamName: { contains: q } },
          { homeTeam: { name: { contains: q } } },
          { awayTeam: { name: { contains: q } } },
        ],
      };
      if (matchWhere.OR) {
        matchWhere.AND = [{ OR: matchWhere.OR }, qFilter];
        delete matchWhere.OR;
      } else {
        Object.assign(matchWhere, qFilter);
      }
    }
    matches = await prisma.match.findMany({
      where: matchWhere,
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
      take: 20,
    });
  }

  return NextResponse.json({
    ok: true,
    players,
    teams,
    matches: matches.map((m) => ({
      id: m.id,
      slug: m.slug,
      competition: m.competition,
      date: m.date,
      homeTeamName: m.homeTeam?.name || m.homeTeamName,
      awayTeamName: m.awayTeam?.name || m.awayTeamName,
    })),
  });
}
