import { NextResponse } from "next/server";

// Skeleton webhook endpoint – does not verify signatures or touch the database yet.
// Your payment provider integration can parse the event and update user subscriptions here.
export async function POST(request: Request) {
  const rawBody = await request.text().catch(() => "");

  // For now, just acknowledge receipt so you can see requests when testing.
  return NextResponse.json({ received: true, length: rawBody.length });
}
