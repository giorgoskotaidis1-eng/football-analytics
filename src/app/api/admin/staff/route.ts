import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// Get all staff members (with team memberships)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or head coach
    const isAdmin = user.role === "Admin" || user.role === "Head Coach";

    if (!isAdmin) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get("teamId");

    const where: Prisma.UserWhereInput = {};
    if (teamId) {
      where.teamMemberships = {
        some: {
          teamId: parseInt(teamId),
        },
      };
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        teamMemberships: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                league: true,
              },
            },
          },
        },
        createdTeams: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ ok: true, staff: users });
  } catch (error) {
    console.error("[admin/staff] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Invite staff member to team
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, teamId, role } = body;

    if (!email || !teamId || !role) {
      return NextResponse.json(
        { ok: false, message: "Email, teamId, and role are required" },
        { status: 400 }
      );
    }

    // Check if user has permission (must be team owner or admin)
    const team = await prisma.team.findUnique({
      where: { id: parseInt(teamId) },
      include: {
        members: true,
      },
    });

    if (!team) {
      return NextResponse.json({ ok: false, message: "Team not found" }, { status: 404 });
    }

    const isTeamOwner = team.createdById === user.id;
    const isUserMember = team.members.some((m) => m.userId === user.id && m.role === "Head Coach");
    const isAdmin = user.role === "Admin";

    if (!isTeamOwner && !isUserMember && !isAdmin) {
      return NextResponse.json(
        { ok: false, message: "You don't have permission to invite members to this team" },
        { status: 403 }
      );
    }

    // Find or create user
    const targetUser = await prisma.user.findUnique({ where: { email } });

    if (!targetUser) {
      // User doesn't exist - create invitation (for now, just create user without password)
      // In production, you'd send an invitation email
      return NextResponse.json(
        { ok: false, message: "User not found. They need to register first." },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const existingMembership = await prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId: targetUser.id,
          teamId: parseInt(teamId),
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { ok: false, message: "User is already a member of this team" },
        { status: 409 }
      );
    }

    // Add user to team
    const membership = await prisma.userTeam.create({
      data: {
        userId: targetUser.id,
        teamId: parseInt(teamId),
        role: role,
        invitedBy: user.id,
        status: "active",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, membership }, { status: 201 });
  } catch (error) {
    console.error("[admin/staff] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
