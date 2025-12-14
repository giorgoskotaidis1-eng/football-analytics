import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// Checkout endpoint – ready for payment provider integration (e.g. Stripe)
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as { plan?: string } | null;
    const plan = body?.plan ?? "pro_monthly";

    // Redirect to checkout page for payment
    const checkoutUrl = `/billing/checkout?plan=${encodeURIComponent(plan)}`;

    return NextResponse.json({ ok: true, url: checkoutUrl });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Checkout error" }, { status: 500 });
  }
}
