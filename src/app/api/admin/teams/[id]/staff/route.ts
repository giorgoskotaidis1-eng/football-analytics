import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// Get all staff members for a specific team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const teamId = parseInt(id);

    if (isNaN(teamId)) {
      return NextResponse.json({ ok: false, message: "Invalid team ID" }, { status: 400 });
    }

    // Check if user has access to this team
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                profilePicture: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ ok: false, message: "Team not found" }, { status: 404 });
    }

    // Check if user is member of this team or admin
    const isMember = team.members.some((m) => m.userId === user.id);
    const isAdmin = user.role === "Admin";

    if (!isMember && !isAdmin) {
      return NextResponse.json(
        { ok: false, message: "You don't have access to this team" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      team: {
        id: team.id,
        name: team.name,
      },
      staff: team.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        status: m.status,
        createdAt: m.createdAt,
        user: m.user,
      })),
    });
  } catch (error) {
    console.error("[admin/teams/staff] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
