import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// Update staff member role in team
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const membershipId = parseInt(id);

    if (isNaN(membershipId)) {
      return NextResponse.json({ ok: false, message: "Invalid membership ID" }, { status: 400 });
    }

    const body = await request.json();
    const { role, teamId } = body;

    if (!role || !teamId) {
      return NextResponse.json(
        { ok: false, message: "Role and teamId are required" },
        { status: 400 }
      );
    }

    // Check permissions
    const membership = await prisma.userTeam.findUnique({
      where: { id: membershipId },
      include: {
        team: true,
      },
    });

    if (!membership) {
      return NextResponse.json({ ok: false, message: "Membership not found" }, { status: 404 });
    }

    const isTeamOwner = membership.team.createdById === user.id;
    const isAdmin = user.role === "Admin";

    if (!isTeamOwner && !isAdmin) {
      return NextResponse.json(
        { ok: false, message: "You don't have permission to update this membership" },
        { status: 403 }
      );
    }

    // Update membership
    const updated = await prisma.userTeam.update({
      where: { id: membershipId },
      data: {
        role: role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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

    return NextResponse.json({ ok: true, membership: updated });
  } catch (error) {
    console.error("[admin/staff] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Remove staff member from team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const membershipId = parseInt(id);

    if (isNaN(membershipId)) {
      return NextResponse.json({ ok: false, message: "Invalid membership ID" }, { status: 400 });
    }

    // Check permissions
    const membership = await prisma.userTeam.findUnique({
      where: { id: membershipId },
      include: {
        team: true,
      },
    });

    if (!membership) {
      return NextResponse.json({ ok: false, message: "Membership not found" }, { status: 404 });
    }

    const isTeamOwner = membership.team.createdById === user.id;
    const isAdmin = user.role === "Admin";
    const isRemovingSelf = membership.userId === user.id;

    if (!isTeamOwner && !isAdmin && !isRemovingSelf) {
      return NextResponse.json(
        { ok: false, message: "You don't have permission to remove this member" },
        { status: 403 }
      );
    }

    // Don't allow removing team owner
    if (membership.team.createdById === membership.userId) {
      return NextResponse.json(
        { ok: false, message: "Cannot remove team owner" },
        { status: 400 }
      );
    }

    // Remove membership
    await prisma.userTeam.delete({
      where: { id: membershipId },
    });

    return NextResponse.json({ ok: true, message: "Member removed successfully" });
  } catch (error) {
    console.error("[admin/staff] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
