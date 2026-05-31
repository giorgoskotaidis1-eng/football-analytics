import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendTeamInvitationEmail } from "@/lib/email";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

// Send team invitation via email
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
    });

    if (!team) {
      return NextResponse.json({ ok: false, message: "Team not found" }, { status: 404 });
    }

    const isTeamOwner = team.createdById === user.id;
    const isAdmin = user.role === "Admin";

    if (!isTeamOwner && !isAdmin) {
      return NextResponse.json(
        { ok: false, message: "You don't have permission to invite members to this team" },
        { status: 403 }
      );
    }

    // Check if user already exists and is already a member
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMembership = await prisma.userTeam.findUnique({
        where: {
          userId_teamId: {
            userId: existingUser.id,
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
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.teamInvitation.findFirst({
      where: {
        email,
        teamId: parseInt(teamId),
        status: "pending",
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { ok: false, message: "An invitation has already been sent to this email" },
        { status: 409 }
      );
    }

    // Generate unique token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    // Create invitation
    const invitation = await prisma.teamInvitation.create({
      data: {
        email,
        teamId: parseInt(teamId),
        role,
        invitedBy: user.id,
        token,
        status: "pending",
        expiresAt,
      },
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

    // Send invitation email
    const emailResult = await sendTeamInvitationEmail(
      email,
      team.name,
      user.name || user.email,
      role,
      token
    );

    if (!emailResult.success) {
      console.error("[invitations/send] Failed to send email:", emailResult.error);
      // Don't fail the request, just log
    }

    // If user already exists, create notification
    if (existingUser) {
      await prisma.notification.create({
        data: {
          userId: existingUser.id,
          type: "invitation",
          title: `You've been invited to ${team.name}`,
          message: `${user.name || user.email} has invited you to join ${team.name} as a ${role}.`,
          link: `/invitations?token=${token}`,
        },
      });
    }

    return NextResponse.json({ ok: true, invitation }, { status: 201 });
  } catch (error) {
    console.error("[invitations/send] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
