import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getPlan } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const all = searchParams.get("all") === "true";

  if (all) {
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

  return NextResponse.json({
    ok: true,
    plan: subscription.plan,
    status: subscription.status,
    renewsAt: subscription.currentPeriodEnd?.toISOString() || null,
    provider: subscription.provider,
    subscriptions: [subscription],
    invoices: [],
  });
}

/**
 * Subscription mutations:
 *  - "subscribe" with the free plan creates an internal record (no payment).
 *  - All other state changes (paid subscribe, cancel, reactivate) must go
 *    through Stripe Checkout (POST /api/billing/checkout) or the Stripe
 *    Billing Portal (POST /api/billing/portal). This guarantees the local
 *    DB stays in sync with Stripe via the webhook.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body?.action as "cancel" | "reactivate" | "subscribe" | undefined;
  const planId = typeof body?.plan === "string" ? body.plan : undefined;

  if (action === "subscribe" && planId) {
    const plan = getPlan(planId);
    if (!plan) {
      return NextResponse.json(
        { ok: false, error: "INVALID_PLAN", message: `Unknown plan "${planId}".` },
        { status: 400 }
      );
    }

    if (plan.isPaid) {
      return NextResponse.json(
        {
          ok: false,
          error: "USE_STRIPE_CHECKOUT",
          message:
            "Paid plans must be activated through the Stripe Checkout flow. Use POST /api/billing/checkout instead.",
        },
        { status: 400 }
      );
    }

    const currentPeriodEnd = new Date();
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 100);

    await prisma.subscription.updateMany({
      where: { userId: user.id, status: "active" },
      data: { status: "canceled" },
    });

    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: plan.id,
        status: "active",
        currentPeriodEnd,
        provider: "internal",
      },
    });

    return NextResponse.json({ ok: true, subscription });
  }

  if (action === "cancel" || action === "reactivate") {
    return NextResponse.json(
      {
        ok: false,
        error: "USE_STRIPE_PORTAL",
        message:
          "Subscription changes must be made through the Stripe Billing Portal. Use POST /api/billing/portal to open it.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
}
