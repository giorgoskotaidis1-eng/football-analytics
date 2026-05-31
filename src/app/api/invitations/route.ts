import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// Get pending invitations for a team
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get("teamId");
    const token = searchParams.get("token"); // For accepting invitation

    // If token provided, get invitation details
    if (token) {
      const invitation = await prisma.teamInvitation.findUnique({
        where: { token },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              league: true,
            },
          },
          inviter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!invitation) {
        return NextResponse.json({ ok: false, message: "Invitation not found" }, { status: 404 });
      }

      // Check if expired
      if (invitation.expiresAt < new Date() && invitation.status === "pending") {
        await prisma.teamInvitation.update({
          where: { id: invitation.id },
          data: { status: "expired" },
        });
        return NextResponse.json({ ok: false, message: "Invitation has expired" }, { status: 410 });
      }

      return NextResponse.json({ ok: true, invitation });
    }

    // Get invitations for team (admin/owner only)
    if (!teamId) {
      return NextResponse.json({ ok: false, message: "teamId or token is required" }, { status: 400 });
    }

    const team = await prisma.team.findUnique({
      where: { id: parseInt(teamId) },
    });

    if (!team) {
      return NextResponse.json({ ok: false, message: "Team not found" }, { status: 404 });
    }

    const isTeamOwner = team.createdById === user.id;
    const isAdmin = user.role === "Admin";

    if (!isTeamOwner && !isAdmin) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    const invitations = await prisma.teamInvitation.findMany({
      where: {
        teamId: parseInt(teamId),
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ ok: true, invitations });
  } catch (error) {
    console.error("[invitations] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Decline invitation
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ ok: false, message: "Token is required" }, { status: 400 });
    }

    const invitation = await prisma.teamInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json({ ok: false, message: "Invitation not found" }, { status: 404 });
    }

    // Verify email matches
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json(
        { ok: false, message: "This invitation is for a different email address" },
        { status: 403 }
      );
    }

    // Update status to declined
    await prisma.teamInvitation.update({
      where: { id: invitation.id },
      data: { status: "declined" },
    });

    // Delete notification if exists
    await prisma.notification.deleteMany({
      where: {
        userId: user.id,
        type: "invitation",
        link: { contains: token },
      },
    });

    return NextResponse.json({ ok: true, message: "Invitation declined" });
  } catch (error) {
    console.error("[invitations] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
