import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// Get user's notifications
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const where: any = { userId: user.id };
    if (unreadOnly) {
      where.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limit to 50 most recent
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        read: false,
      },
    });

    return NextResponse.json({
      ok: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("[notifications] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      // Mark all as read
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          read: false,
        },
        data: {
          read: true,
        },
      });
      return NextResponse.json({ ok: true, message: "All notifications marked as read" });
    }

    if (!notificationId) {
      return NextResponse.json({ ok: false, message: "notificationId is required" }, { status: 400 });
    }

    // Verify notification belongs to user
    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(notificationId) },
    });

    if (!notification || notification.userId !== user.id) {
      return NextResponse.json({ ok: false, message: "Notification not found" }, { status: 404 });
    }

    // Mark as read
    await prisma.notification.update({
      where: { id: parseInt(notificationId) },
      data: { read: true },
    });

    return NextResponse.json({ ok: true, message: "Notification marked as read" });
  } catch (error) {
    console.error("[notifications] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
