import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Get current user to filter by their teams
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    // Get user's teams from two sources:
    // 1. Teams where user is creator (createdById)
    // 2. Teams where user is member (UserTeam table - if it exists)
    
    let userTeams: Array<{ teamId: number; team: any }> = [];
    try {
      // Try to get UserTeam memberships (if table exists)
      userTeams = await prisma.userTeam.findMany({
        where: { userId: user.id, status: "active" },
        include: {
          team: {
            include: {
              _count: {
                select: { players: true, homeGames: true, awayGames: true },
              },
            },
          },
        },
      });
    } catch (error: any) {
      // UserTeam table might not exist yet - that's OK, we'll use createdTeams
      console.warn("[teams.GET] UserTeam table not available:", error.message);
    }
    
    // Get teams where user is creator
    const createdTeams = await prisma.team.findMany({
      where: { createdById: user.id },
      include: {
        _count: {
          select: { players: true, homeGames: true, awayGames: true },
        },
      },
    });

    // Combine and deduplicate teams
    const allTeamIds = new Set([
      ...userTeams.map((ut) => ut.teamId),
      ...createdTeams.map((t) => t.id),
    ]);

    // If user has no teams, return empty array
    if (allTeamIds.size === 0) {
      return NextResponse.json({ ok: true, teams: [] });
    }

    // Get all unique teams (from UserTeam memberships and created teams)
    const teamsMap = new Map<number, any>();
    
    // Add teams from UserTeam memberships
    userTeams.forEach((ut) => {
      if (ut.team) {
        teamsMap.set(ut.teamId, ut.team);
      }
    });
    
    // Add created teams (if not already added)
    createdTeams.forEach((t) => {
      if (!teamsMap.has(t.id)) {
        teamsMap.set(t.id, t);
      }
    });

    const teams = Array.from(teamsMap.values());

    // Log for debugging
    console.log(`[teams.GET] User ${user.id} (${user.email}) has ${teams.length} teams:`);
    console.log(`  - ${userTeams.length} from UserTeam memberships`);
    console.log(`  - ${createdTeams.length} created teams`);
    if (teams.length > 0) {
      console.log(`  - Team names: ${teams.map(t => t.name).join(', ')}`);
    } else {
      console.warn(`  - ⚠️ No teams found! Check if createdById is set correctly in Team table.`);
      console.warn(`  - User ID: ${user.id}, Email: ${user.email}`);
    }

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
      createdById: user.id, // Set creator
    },
  });

  console.log(`[teams.POST] ✅ Created team "${team.name}" (ID: ${team.id}) for user ${user.id} (${user.email})`);

  // Add user to team as member (if UserTeam table exists)
  let userTeamCreated = false;
  try {
    await prisma.userTeam.create({
      data: {
        userId: user.id,
        teamId: team.id,
        role: user.role || "Head Coach",
        status: "active",
      },
    });
    userTeamCreated = true;
    console.log(`[teams.POST] ✅ UserTeam membership created for user ${user.id} and team ${team.id}`);
  } catch (error: any) {
    // If UserTeam doesn't exist yet, that's OK - team will still be visible via createdById
    console.warn(`[teams.POST] ⚠️ UserTeam not available (this is OK if table doesn't exist yet):`, error.message);
  }

  // Return team with full details (like GET endpoint)
  const teamWithDetails = await prisma.team.findUnique({
    where: { id: team.id },
    include: {
      _count: {
        select: { players: true, homeGames: true, awayGames: true },
      },
    },
  });

  return NextResponse.json({ ok: true, team: teamWithDetails || team }, { status: 201 });
}

