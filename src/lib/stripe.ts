import { randomUUID } from "crypto";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

/**
 * Single source of truth for Stripe configuration.
 * - Lazily creates the Stripe client so we never crash at import time
 *   if billing is not yet configured (e.g. local dev without keys).
 * - Centralises plan -> Stripe price mapping so the rest of the codebase
 *   never deals with raw price IDs.
 * - Billing identity is **ID-driven**: `User.id` ↔ `User.stripeCustomerId` (cus_…)
 *   ↔ Stripe Subscription id (sub_…) on `Subscription.providerSubscriptionId`.
 */

let cachedClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (cachedClient) return cachedClient;

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new StripeNotConfiguredError(
      "STRIPE_SECRET_KEY is not set. Configure your Stripe credentials before using billing endpoints."
    );
  }

  cachedClient = new Stripe(secret, {
    apiVersion: "2024-06-20" as Stripe.LatestApiVersion,
    appInfo: {
      name: "Football Analytics",
      version: "1.0.0",
    },
    typescript: true,
  });

  return cachedClient;
}

export class StripeNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeNotConfiguredError";
  }
}

export interface PlanDefinition {
  id: string;
  label: string;
  amountEur: number;
  stripePriceEnv: string | null;
  isPaid: boolean;
}

export const PLAN_DEFINITIONS: Record<string, PlanDefinition> = {
  free: {
    id: "free",
    label: "Free",
    amountEur: 0,
    stripePriceEnv: null,
    isPaid: false,
  },
  starter: {
    id: "starter",
    label: "Starter",
    amountEur: 39,
    stripePriceEnv: "STRIPE_PRICE_STARTER",
    isPaid: true,
  },
  pro_monthly: {
    id: "pro_monthly",
    label: "Pro",
    amountEur: 89,
    stripePriceEnv: "STRIPE_PRICE_PRO",
    isPaid: true,
  },
};

export function getPlan(plan: string | null | undefined): PlanDefinition | null {
  if (!plan) return null;
  return PLAN_DEFINITIONS[plan] ?? null;
}

/**
 * Returns true when the development-only mock checkout may be used for a plan.
 *
 * Mock checkout is permitted only outside production AND only when real Stripe
 * billing is not configured for the plan (missing secret key or price ID).
 * When Stripe is fully configured, the real Checkout flow must be used instead.
 */
export function isDevMockCheckoutAllowed(plan: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const definition = getPlan(plan);
  if (!definition || !definition.isPaid || !definition.stripePriceEnv) return false;
  const hasSecret = Boolean(process.env.STRIPE_SECRET_KEY);
  const hasPrice = Boolean(process.env[definition.stripePriceEnv]);
  return !(hasSecret && hasPrice);
}

export function getStripePriceIdForPlan(plan: string): string {
  const definition = getPlan(plan);
  if (!definition) {
    throw new StripeNotConfiguredError(`Unknown plan "${plan}".`);
  }
  if (!definition.isPaid || !definition.stripePriceEnv) {
    throw new StripeNotConfiguredError(`Plan "${plan}" is not paid and has no Stripe price.`);
  }
  const priceId = process.env[definition.stripePriceEnv];
  if (!priceId) {
    throw new StripeNotConfiguredError(
      `${definition.stripePriceEnv} is not set. Add the Stripe price ID to your environment.`
    );
  }
  return priceId;
}

export function resolveBillingAppUrl(): string {
  const fromEnv = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  const isProd = process.env.NODE_ENV === "production";

  if (fromEnv && fromEnv.trim().length > 0) {
    if (isProd && /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(fromEnv)) {
      throw new Error(
        "[stripe] APP_URL points to localhost in production. Set APP_URL (or NEXT_PUBLIC_APP_URL) to your public origin before deploying."
      );
    }
    return fromEnv.replace(/\/+$/, "");
  }

  if (isProd) {
    throw new Error(
      "[stripe] APP_URL is not configured in production. Set APP_URL (or NEXT_PUBLIC_APP_URL) before using billing."
    );
  }

  return "http://localhost:3000";
}

export interface UserForBilling {
  id: number;
  email: string;
  name?: string | null;
}

const STRIPE_CUSTOMER_PREFIX = "cus_";

export function assertStripeCustomerId(id: string): void {
  if (!id || typeof id !== "string" || !id.startsWith(STRIPE_CUSTOMER_PREFIX)) {
    throw new Error(`Invalid Stripe customer id (expected ${STRIPE_CUSTOMER_PREFIX}…): ${id}`);
  }
}

export function assertStripeSubscriptionId(id: string): void {
  if (!id || typeof id !== "string" || !id.startsWith("sub_")) {
    throw new Error(`Invalid Stripe subscription id (expected sub_…): ${id}`);
  }
}

function customerMetadataMatchesUser(
  customer: Stripe.Customer | Stripe.DeletedCustomer,
  userId: number
): boolean {
  if ("deleted" in customer && customer.deleted) return false;
  const meta = "metadata" in customer ? customer.metadata?.appUserId : undefined;
  return meta === String(userId);
}

/**
 * Returns the Stripe Customer id for this app user. Persisted only on `User.stripeCustomerId`
 * (never inferred from “latest subscription row”).
 *
 * Customer creation uses a stable idempotency key per user so retries cannot duplicate customers.
 */
export async function getOrCreateStripeCustomer(user: UserForBilling): Promise<string> {
  const stripe = getStripeClient();
  const appUserIdStr = String(user.id);

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { stripeCustomerId: true, email: true, name: true },
  });

  if (!dbUser) {
    throw new Error(`User ${user.id} not found while resolving Stripe customer.`);
  }

  if (dbUser.stripeCustomerId) {
    assertStripeCustomerId(dbUser.stripeCustomerId);
    try {
      const existing = await stripe.customers.retrieve(dbUser.stripeCustomerId);
      if ("deleted" in existing && existing.deleted) {
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: null },
        });
      } else if (!customerMetadataMatchesUser(existing, user.id)) {
        console.error(
          `[stripe] Customer ${dbUser.stripeCustomerId} metadata mismatch for user ${user.id}; clearing link.`
        );
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: null },
        });
      } else {
        return dbUser.stripeCustomerId;
      }
    } catch {
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: null },
      });
    }
  }

  const created = await stripe.customers.create(
    {
      email: dbUser.email ?? user.email,
      name: dbUser.name ?? user.name ?? undefined,
      metadata: {
        appUserId: appUserIdStr,
      },
    },
    {
      // Same logical user → same idempotency key → Stripe dedupes parallel / retried creates.
      idempotencyKey: `fa-customer-create-${user.id}`,
    }
  );

  assertStripeCustomerId(created.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: created.id },
  });

  return created.id;
}

/** Idempotency key for a single Checkout Session attempt (unique per HTTP request). */
export function newCheckoutIdempotencyKey(userId: number, planId: string): string {
  return `fa-checkout-${userId}-${planId}-${randomUUID()}`;
}
