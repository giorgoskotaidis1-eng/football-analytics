import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import {
  assertStripeCustomerId,
  assertStripeSubscriptionId,
  getStripeClient,
} from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Stripe webhook receiver. Verifies the signature with STRIPE_WEBHOOK_SECRET
 * and keeps the local Subscription table in sync with Stripe state.
 *
 * All writes are **ID-scoped**:
 * - App user: `User.id` + `User.stripeCustomerId` (cus_…) must agree before we mutate rows.
 * - Stripe subscription: updates target exactly `Subscription.providerSubscriptionId === sub_…`.
 *
 * Configure the endpoint URL in your Stripe dashboard:
 *   POST {APP_URL}/api/billing/webhook
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[billing/webhook] STRIPE_WEBHOOK_SECRET is not configured.");
    return NextResponse.json(
      { ok: false, error: "WEBHOOK_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { ok: false, error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[billing/webhook] Signature verification failed:", error);
    return NextResponse.json(
      { ok: false, error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(`[billing/webhook] Failed handling ${event.type}:`, error);
    return NextResponse.json({ ok: false, error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/* ------------------------------------------------------------------------- */

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = parseAppUserId(session.metadata);
  if (userId === null) {
    console.error("[billing/webhook] checkout.session.completed missing metadata.appUserId");
    return;
  }

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (!customerId) {
    console.error("[billing/webhook] checkout.session.completed missing customer");
    return;
  }
  assertStripeCustomerId(customerId);

  const ref = session.client_reference_id;
  if (ref !== null && ref !== undefined && ref !== String(userId)) {
    console.error("[billing/webhook] client_reference_id does not match appUserId", {
      ref,
      userId,
    });
    return;
  }

  const owner = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  if (!owner?.stripeCustomerId || owner.stripeCustomerId !== customerId) {
    console.error("[billing/webhook] User / Stripe customer mismatch on checkout complete", {
      userId,
      customerId,
      storedCustomerId: owner?.stripeCustomerId,
    });
    return;
  }

  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!subscriptionId) {
    console.error("[billing/webhook] checkout.session.completed missing subscription");
    return;
  }
  assertStripeSubscriptionId(subscriptionId);

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertLocalSubscription(userId, customerId, subscription, session.metadata?.plan);
}

async function handleSubscriptionUpsert(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;
  assertStripeCustomerId(customerId);

  let userId = parseAppUserId(subscription.metadata);
  if (userId === null) {
    userId = await resolveUserIdByStripeCustomerId(customerId);
  }
  if (userId === null) {
    console.error(
      "[billing/webhook] subscription event without resolvable user (metadata.appUserId and User.stripeCustomerId)",
      { subscriptionId: subscription.id, customerId }
    );
    return;
  }

  const owner = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  if (!owner?.stripeCustomerId || owner.stripeCustomerId !== customerId) {
    console.error("[billing/webhook] subscription customer does not match User.stripeCustomerId", {
      userId,
      customerId,
      storedCustomerId: owner?.stripeCustomerId,
    });
    return;
  }

  await upsertLocalSubscription(userId, customerId, subscription, subscription.metadata?.plan);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  assertStripeSubscriptionId(subscription.id);
  await prisma.subscription.updateMany({
    where: { providerSubscriptionId: subscription.id },
    data: { status: "canceled" },
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = extractSubscriptionId(invoice);
  if (!subscriptionId) return;
  assertStripeSubscriptionId(subscriptionId);
  await prisma.subscription.updateMany({
    where: { providerSubscriptionId: subscriptionId },
    data: { status: "active" },
  });
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const subscriptionId = extractSubscriptionId(invoice);
  if (!subscriptionId) return;
  assertStripeSubscriptionId(subscriptionId);
  await prisma.subscription.updateMany({
    where: { providerSubscriptionId: subscriptionId },
    data: { status: "past_due" },
  });
}

async function upsertLocalSubscription(
  userId: number,
  customerId: string,
  subscription: Stripe.Subscription,
  planHint: string | null | undefined
) {
  assertStripeCustomerId(customerId);
  assertStripeSubscriptionId(subscription.id);

  const owner = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  if (!owner?.stripeCustomerId || owner.stripeCustomerId !== customerId) {
    console.error("[billing/webhook] upsertLocalSubscription: user/customer mismatch", {
      userId,
      customerId,
    });
    return;
  }

  const plan = planHint || resolvePlanFromSubscription(subscription) || "pro_monthly";
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  await prisma.subscription.updateMany({
    where: {
      userId,
      status: "active",
      NOT: { providerSubscriptionId: subscription.id },
    },
    data: { status: "canceled" },
  });

  const status = mapStripeStatus(subscription.status);

  const existing = await prisma.subscription.findFirst({
    where: { providerSubscriptionId: subscription.id },
  });

  if (existing) {
    if (existing.userId !== userId) {
      console.error("[billing/webhook] Subscription row belongs to different user; refusing update", {
        subscriptionId: subscription.id,
        rowUserId: existing.userId,
        eventUserId: userId,
      });
      return;
    }
    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        plan,
        status,
        currentPeriodEnd: periodEnd,
        provider: "stripe",
        providerCustomerId: customerId,
        providerSubscriptionId: subscription.id,
      },
    });
    return;
  }

  await prisma.subscription.create({
    data: {
      userId,
      plan,
      status,
      currentPeriodEnd: periodEnd,
      provider: "stripe",
      providerCustomerId: customerId,
      providerSubscriptionId: subscription.id,
    },
  });
}

async function resolveUserIdByStripeCustomerId(customerId: string): Promise<number | null> {
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return user?.id ?? null;
}

function parseAppUserId(metadata: Stripe.Metadata | null | undefined): number | null {
  const raw = metadata?.appUserId;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolvePlanFromSubscription(subscription: Stripe.Subscription): string | null {
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.id;
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro_monthly";
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  return null;
}

function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): string {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "incomplete":
    case "paused":
    default:
      return "incomplete";
  }
}

function extractSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null })
    .subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}
