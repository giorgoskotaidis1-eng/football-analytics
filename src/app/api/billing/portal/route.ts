import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// Customer portal endpoint – ready for payment provider integration (e.g. Stripe)
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    // TODO: Create billing portal session with payment provider (e.g. Stripe)
    // For now, redirect to billing page
    const portalUrl = "/billing?portal=1";
    return NextResponse.json({ ok: true, url: portalUrl });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Portal error" }, { status: 500 });
  }
}
