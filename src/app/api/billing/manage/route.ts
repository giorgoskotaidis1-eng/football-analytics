import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * In-app subscription management (cancel/reactivate) used by the demo
 * `/billing/manage` page when Stripe is not configured. Refuses to mutate
 * Stripe-backed subscriptions — those must go through the Stripe Billing
 * Portal so state stays in sync.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  let body: { action?: string } | null = null;
  try {
    body = (await request.json()) as { action?: string } | null;
  } catch {
    body = null;
  }

  const action = body?.action;
  if (action !== "cancel" && action !== "reactivate") {
    return NextResponse.json(
      { ok: false, error: "INVALID_ACTION", message: "Action must be 'cancel' or 'reactivate'." },
      { status: 400 }
    );
  }

  const target = await prisma.subscription.findFirst({
    where: {
      userId: user.id,
      ...(action === "cancel" ? { status: "active" } : { status: "canceled" }),
    },
    orderBy: { createdAt: "desc" },
  });

  if (!target) {
    return NextResponse.json(
      {
        ok: false,
        error: "NO_SUBSCRIPTION",
        message:
          action === "cancel"
            ? "No active subscription to cancel."
            : "No canceled subscription to reactivate.",
      },
      { status: 400 }
    );
  }

  if (target.provider === "stripe") {
    return NextResponse.json(
      {
        ok: false,
        error: "STRIPE_MANAGED",
        message:
          "This subscription is managed by Stripe. Please use the Stripe Billing Portal to make changes.",
      },
      { status: 400 }
    );
  }

  await prisma.subscription.update({
    where: { id: target.id },
    data: { status: action === "cancel" ? "canceled" : "active" },
  });

  return NextResponse.json({ ok: true });
}
