import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getOrCreateStripeCustomer,
  getPlan,
  getStripeClient,
  getStripePriceIdForPlan,
  newCheckoutIdempotencyKey,
  resolveBillingAppUrl,
  StripeNotConfiguredError,
} from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Resolves where the client should send the user to start a plan change:
 *
 * - Free plan         → activates a local subscription immediately.
 * - Paid + Stripe     → real Stripe Checkout Session URL.
 * - Paid + no Stripe  → in-app checkout form at `/billing/checkout`.
 *
 * Production refuses the no-Stripe path explicitly; the in-app form is for
 * environments without external billing wiring (e.g. development or self-hosted).
 */
export async function POST(request: NextRequest) {
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

  const planId = body?.plan ?? "pro_monthly";
  const plan = getPlan(planId);

  if (!plan) {
    return NextResponse.json(
      { ok: false, error: "INVALID_PLAN", message: `Unknown plan "${planId}".` },
      { status: 400 }
    );
  }

  const appUrl = resolveBillingAppUrl();

  if (!plan.isPaid) {
    await activateInternalSubscription(user.id, plan.id);
    return NextResponse.json({ ok: true, mode: "free", url: `${appUrl}/billing?success=1` });
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const isProd = process.env.NODE_ENV === "production";

  if (!stripeSecret) {
    if (isProd) {
      return NextResponse.json(
        {
          ok: false,
          error: "BILLING_NOT_CONFIGURED",
          message:
            "Billing is not configured on this server. Set STRIPE_SECRET_KEY and STRIPE_PRICE_* before accepting payments.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      mode: "internal",
      url: `${appUrl}/billing/checkout?plan=${encodeURIComponent(plan.id)}`,
    });
  }

  try {
    const stripe = getStripeClient();
    const priceId = getStripePriceIdForPlan(plan.id);
    const customerId = await getOrCreateStripeCustomer({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        client_reference_id: String(user.id),
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        billing_address_collection: "auto",
        success_url: `${appUrl}/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/billing?canceled=1`,
        metadata: {
          appUserId: String(user.id),
          plan: plan.id,
        },
        subscription_data: {
          metadata: {
            appUserId: String(user.id),
            plan: plan.id,
          },
        },
      },
      { idempotencyKey: newCheckoutIdempotencyKey(user.id, plan.id) }
    );

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return NextResponse.json({ ok: true, mode: "stripe", url: session.url });
  } catch (error) {
    if (error instanceof StripeNotConfiguredError) {
      console.warn("[billing/checkout] Stripe configuration error:", error.message);
      return NextResponse.json(
        {
          ok: false,
          error: "BILLING_NOT_CONFIGURED",
          message: error.message,
        },
        { status: 503 }
      );
    }
    console.error("[billing/checkout] Failed to create checkout session:", error);
    return NextResponse.json(
      { ok: false, error: "CHECKOUT_FAILED", message: "Failed to start checkout. Please try again." },
      { status: 500 }
    );
  }
}

async function activateInternalSubscription(userId: number, planId: string): Promise<void> {
  const currentPeriodEnd = new Date();
  currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 100);

  await prisma.subscription.updateMany({
    where: { userId, status: "active" },
    data: { status: "canceled" },
  });

  await prisma.subscription.create({
    data: {
      userId,
      plan: planId,
      status: "active",
      currentPeriodEnd,
      provider: "internal",
    },
  });
}
