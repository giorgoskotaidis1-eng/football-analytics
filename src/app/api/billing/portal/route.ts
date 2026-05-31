import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getStripeClient,
  resolveBillingAppUrl,
  StripeNotConfiguredError,
} from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Opens the management surface for the current user's subscription.
 *
 * - If the active subscription is internal (no Stripe), routes to the in-app
 *   `/billing/manage` page where the user can cancel.
 * - If the active subscription is Stripe-backed, creates a Stripe Billing
 *   Portal Session scoped to their canonical `User.stripeCustomerId`.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const appUrl = resolveBillingAppUrl();
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const isProd = process.env.NODE_ENV === "production";

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { stripeCustomerId: true },
  });

  const activeSub = await prisma.subscription.findFirst({
    where: { userId: user.id, status: "active" },
    orderBy: { createdAt: "desc" },
    select: { id: true, provider: true },
  });

  if (activeSub?.provider === "internal") {
    return NextResponse.json({
      ok: true,
      mode: "internal",
      url: `${appUrl}/billing/manage`,
    });
  }

  if (!stripeSecret) {
    if (isProd) {
      return NextResponse.json(
        {
          ok: false,
          error: "BILLING_NOT_CONFIGURED",
          message:
            "Billing is not configured on this server. Set STRIPE_SECRET_KEY before opening the portal.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: "NO_ACTIVE_SUBSCRIPTION",
        message: "You don't have an active subscription yet. Please subscribe to a plan first.",
      },
      { status: 400 }
    );
  }

  if (!dbUser?.stripeCustomerId) {
    return NextResponse.json(
      {
        ok: false,
        error: "NO_STRIPE_CUSTOMER",
        message:
          "No Stripe subscription was found for this account. Please subscribe to a paid plan first.",
      },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripeClient();

    const session = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripeCustomerId,
      return_url: `${appUrl}/billing`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a portal URL.");
    }

    return NextResponse.json({ ok: true, mode: "stripe", url: session.url });
  } catch (error) {
    if (error instanceof StripeNotConfiguredError) {
      return NextResponse.json(
        {
          ok: false,
          error: "BILLING_NOT_CONFIGURED",
          message: error.message,
        },
        { status: 503 }
      );
    }
    console.error("[billing/portal] Failed to create portal session:", error);
    return NextResponse.json(
      { ok: false, error: "PORTAL_FAILED", message: "Failed to open billing portal. Please try again." },
      { status: 500 }
    );
  }
}
