import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const all = searchParams.get("all") === "true";

  if (all) {
    // Get all subscriptions (admin view)
    const subscriptions = await prisma.subscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, subscriptions });
  }

  // Get current user's subscription
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: user.id,
      status: "active",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) {
    return NextResponse.json({
      ok: true,
      plan: null,
      status: "none",
      subscriptions: [],
      invoices: [],
    });
  }

  // Get invoices (can be wired to payment provider later)
  const invoices: any[] = [];

  return NextResponse.json({
    ok: true,
    plan: subscription.plan,
    status: subscription.status,
    renewsAt: subscription.currentPeriodEnd?.toISOString() || null,
    subscriptions: [subscription],
    invoices,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body?.action as "cancel" | "reactivate" | "subscribe" | undefined;
  const plan = body?.plan as string | undefined;

  if (action === "subscribe" && plan) {
    // Create or update subscription
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1); // 1 month from now

    // Cancel existing active subscriptions
    await prisma.subscription.updateMany({
      where: {
        userId: user.id,
        status: "active",
      },
      data: {
        status: "canceled",
      },
    });

    // Create new subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: plan,
        status: "active",
        currentPeriodEnd: currentPeriodEnd,
        provider: "internal", // For now, using internal payment processing
      },
    });

    return NextResponse.json({ ok: true, subscription });
  }

  if (action === "cancel") {
    await prisma.subscription.updateMany({
      where: {
        userId: user.id,
        status: "active",
      },
      data: {
        status: "canceled",
      },
    });
    return NextResponse.json({ ok: true, message: "Subscription canceled" });
  }

  if (action === "reactivate") {
    await prisma.subscription.updateMany({
      where: {
        userId: user.id,
        status: "canceled",
      },
      data: {
        status: "active",
      },
    });
    return NextResponse.json({ ok: true, message: "Subscription reactivated" });
  }

  return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
}
