# Billing & Stripe Setup

The billing flow is implemented with **Stripe Checkout** (hosted payment page),
the **Stripe Billing Portal** (subscription management) and a verified
**Stripe webhook** that keeps the local database in sync.

---

## 1. Required environment variables

Add the following variables to your `.env` (and to Vercel/your host for
production):

```env
# Stripe API credentials
STRIPE_SECRET_KEY=sk_test_xxx        # use sk_live_... in production
STRIPE_WEBHOOK_SECRET=whsec_xxx      # the signing secret for your webhook endpoint

# Stripe price IDs (one per paid plan)
STRIPE_PRICE_STARTER=price_xxx       # €39/mo "Starter" plan
STRIPE_PRICE_PRO=price_xxx           # €89/mo "Pro" plan

# Used to build success/cancel/portal redirect URLs
APP_URL=https://your-domain.com
# or, if you only set the public variant:
# NEXT_PUBLIC_APP_URL=https://your-domain.com
```

In production the app will refuse to use a `localhost` `APP_URL` to avoid
sending users to unreachable URLs.

---

## 2. Create the Stripe products

In your Stripe Dashboard (Test mode is fine for development):

1. **Products → Add product** for each plan:
   - "Starter" with a recurring price of **€39 / month**.
   - "Pro" with a recurring price of **€89 / month**.
2. Copy each generated `price_…` ID into the matching env variable.

---

## 3. Configure the webhook

1. In the Stripe Dashboard go to **Developers → Webhooks → Add endpoint**.
2. URL: `https://your-domain.com/api/billing/webhook`
3. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the **Signing secret** (`whsec_…`) into `STRIPE_WEBHOOK_SECRET`.

For local development you can forward webhooks with the Stripe CLI:

```bash
stripe login
stripe listen --forward-to http://localhost:3000/api/billing/webhook
```

The CLI prints a temporary `whsec_…` secret. Put that in your local `.env`
while developing.

---

## 4. Database: canonical Stripe customer on `User`

Billing links the signed-in **`User.id`** to Stripe using a single column:

- `User.stripeCustomerId` — must equal the Stripe Customer id (`cus_…`) for that user.

Apply the schema (adds the column):

```bash
npx prisma db push
# or: npx prisma migrate dev
```

**Existing installs** that only stored `providerCustomerId` on `Subscription`:
backfill once so portal/webhooks match, e.g. in Prisma Studio set each user’s
`stripeCustomerId` to their latest Stripe `cus_…` from `Subscription`, or run a
one-off SQL/script for your DB.

---

## 5. How the flow works (ID-driven)

| Identifier | Role |
| ---------- | ---- |
| `User.id` | App user; stored in Checkout `metadata.appUserId`, `subscription_data.metadata`, and `client_reference_id`. |
| `User.stripeCustomerId` | One `cus_…` per user; portal and webhooks require it to match the event’s customer. |
| `Subscription.providerSubscriptionId` | Exact `sub_…`; webhook updates **only** the row with this id (no “latest null sub” guessing). |

| Endpoint                        | Purpose                                                                 |
| ------------------------------- | ----------------------------------------------------------------------- |
| `POST /api/billing/checkout`    | Creates a Stripe Checkout Session (free plan is activated locally).     |
| `POST /api/billing/portal`      | Opens the Billing Portal for `User.stripeCustomerId` only.              |
| `POST /api/billing/webhook`     | Verifies signature; syncs `Subscription` by `sub_…` + user/customer checks. |
| `GET  /api/billing/subscription`| Returns the current user's active subscription (read-only).             |
| `POST /api/billing/subscription`| Only handles the free plan; paid changes must go through Stripe.        |

Checkout also uses:

- **Idempotency**: Stripe Customer create uses `fa-customer-create-{userId}` so retries cannot spawn duplicate customers; each Checkout Session uses a fresh `fa-checkout-{userId}-{plan}-{uuid}` key.

The **frontend** keeps using the same routes:

- The `/billing` page calls `POST /api/billing/checkout` for upgrades and
  `POST /api/billing/portal` for managing renewals/payment methods.
- The `/billing/checkout` route is a thin redirect page — it asks the API for
  a Stripe Checkout URL and forwards the browser to it.

---

## 6. Testing

1. Start the app and the Stripe CLI (`stripe listen …`).
2. Click **Upgrade to Pro** on `/billing`. You should be redirected to
   `checkout.stripe.com`.
3. Use the test card `4242 4242 4242 4242` with any future expiry and any CVV.
4. After completing checkout, Stripe will call the webhook and the
   `Subscription` table will be updated. The user will land back on
   `/billing?success=1` with the new plan visible.
5. Click **Manage renewal settings** to verify the Billing Portal opens.

---

## 7. Notes

- `Subscription` still stores `providerCustomerId` / `providerSubscriptionId` on each row for traceability; the **authoritative** customer ↔ user link is `User.stripeCustomerId`.
- The webhook refuses updates if `User.stripeCustomerId` ≠ event `customer`, or if a `sub_…` row exists for a **different** `userId` than the metadata / customer owner (prevents cross-user writes).
- The webhook is the source of truth for paid plan state after checkout.
- The free plan never touches Stripe and is activated synchronously by
  `POST /api/billing/checkout`.
