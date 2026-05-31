import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlan, isDevMockCheckoutAllowed, resolveBillingAppUrl } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Development-only fallback that activates a paid plan locally as an
 * "internal" subscription when Stripe credentials are not configured.
 *
 * Hard-disabled outside development to avoid bypassing real billing
 * in production builds.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { ok: false, error: "FORBIDDEN_IN_PRODUCTION" },
      { status: 404 }
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  let body: { plan?: string } | null = null;
  try {
    body = (await request.json()) as { plan?: string } | null;
  } catch {
    body = null;
  }

  const planId = body?.plan ?? "";
  const plan = getPlan(planId);
  if (!plan || !plan.isPaid) {
    return NextResponse.json(
      { ok: false, error: "INVALID_PLAN", message: `Plan "${planId}" is not a paid plan.` },
      { status: 400 }
    );
  }

  if (!isDevMockCheckoutAllowed(plan.id)) {
    return NextResponse.json(
      {
        ok: false,
        error: "STRIPE_CONFIGURED",
        message: "Stripe is configured for this plan; use the real Stripe Checkout flow instead.",
      },
      { status: 400 }
    );
  }

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await prisma.subscription.updateMany({
    where: { userId: user.id, status: "active" },
    data: { status: "canceled" },
  });

  const subscription = await prisma.subscription.create({
    data: {
      userId: user.id,
      plan: plan.id,
      status: "active",
      currentPeriodEnd: periodEnd,
      provider: "internal",
    },
  });

  const appUrl = resolveBillingAppUrl();
  return NextResponse.json({
    ok: true,
    subscription,
    url: `${appUrl}/billing?success=1&dev=1`,
  });
}
