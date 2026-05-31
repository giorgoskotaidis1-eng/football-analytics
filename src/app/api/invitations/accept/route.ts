import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// Accept team invitation
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ ok: false, message: "Token is required" }, { status: 400 });
    }

    // Find invitation
    const invitation = await prisma.teamInvitation.findUnique({
      where: { token },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json({ ok: false, message: "Invitation not found" }, { status: 404 });
    }

    // Check if invitation is expired
    if (invitation.expiresAt < new Date()) {
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: "expired" },
      });
      return NextResponse.json({ ok: false, message: "Invitation has expired" }, { status: 410 });
    }

    // Check if already accepted/declined
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { ok: false, message: `Invitation has already been ${invitation.status}` },
        { status: 409 }
      );
    }

    // Verify email matches
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json(
        { ok: false, message: "This invitation is for a different email address" },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existingMembership = await prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId: user.id,
          teamId: invitation.teamId,
        },
      },
    });

    if (existingMembership) {
      // Update invitation status
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: "accepted" },
      });
      return NextResponse.json({ ok: false, message: "You are already a member of this team" }, { status: 409 });
    }

    // Create UserTeam membership
    const membership = await prisma.$transaction(async (tx) => {
      // Create membership
      const newMembership = await tx.userTeam.create({
        data: {
          userId: user.id,
          teamId: invitation.teamId,
          role: invitation.role,
          invitedBy: invitation.invitedBy,
          status: "active",
        },
        include: {
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Update invitation status
      await tx.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: "accepted" },
      });

      // Delete notification if exists
      await tx.notification.deleteMany({
        where: {
          userId: user.id,
          type: "invitation",
          link: { contains: token },
        },
      });

      return newMembership;
    });

    return NextResponse.json({ ok: true, membership, team: invitation.team });
  } catch (error) {
    console.error("[invitations/accept] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
