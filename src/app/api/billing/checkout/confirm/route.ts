import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlan } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Activates a paid subscription from the in-app checkout form.
 *
 * - When STRIPE_SECRET_KEY is configured, this endpoint refuses the call so the
 *   client must instead redirect to the hosted Stripe Checkout (the source of
 *   truth for payments).
 * - Otherwise, the subscription is recorded directly in the local DB. Card
 *   details are NOT stored — only the last 4 digits + expiry, used to render
 *   the saved-payment-method line on the billing page.
 */
const ConfirmSchema = z.object({
  plan: z.string().min(1),
  billingEmail: z.string().email().max(200),
  billingName: z.string().min(1).max(120),
  cardLast4: z.string().regex(/^\d{4}$/),
  cardExpMonth: z.string().regex(/^(0[1-9]|1[0-2])$/),
  cardExpYear: z.string().regex(/^\d{2}$/),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  if (process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      {
        ok: false,
        error: "USE_STRIPE_CHECKOUT",
        message:
          "This server is connected to Stripe. Please complete payment through the Stripe Checkout page.",
      },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const parsed = ConfirmSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_INPUT",
        message: firstIssue?.message ?? "Invalid checkout details.",
      },
      { status: 400 }
    );
  }

  const plan = getPlan(parsed.data.plan);
  if (!plan) {
    return NextResponse.json(
      { ok: false, error: "INVALID_PLAN", message: `Unknown plan "${parsed.data.plan}".` },
      { status: 400 }
    );
  }

  if (!plan.isPaid) {
    return NextResponse.json(
      { ok: false, error: "INVALID_PLAN", message: "Free plan cannot be activated through checkout." },
      { status: 400 }
    );
  }

  const renewsAt = new Date();
  renewsAt.setMonth(renewsAt.getMonth() + 1);

  await prisma.subscription.updateMany({
    where: { userId: user.id, status: "active" },
    data: { status: "canceled" },
  });

  const subscription = await prisma.subscription.create({
    data: {
      userId: user.id,
      plan: plan.id,
      status: "active",
      currentPeriodEnd: renewsAt,
      provider: "internal",
    },
  });

  return NextResponse.json({
    ok: true,
    subscription: {
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      renewsAt: subscription.currentPeriodEnd?.toISOString() ?? null,
    },
  });
}
