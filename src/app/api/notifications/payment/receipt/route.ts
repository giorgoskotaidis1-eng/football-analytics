import { NextResponse } from "next/server";
import { sendPaymentReceiptEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    userId?: number;
    email?: string;
    amount?: number;
    currency?: string;
    invoiceId?: string;
  } | null;

  if (!body?.email || body.amount === undefined || !body.invoiceId) {
    return NextResponse.json({ ok: false, message: "Missing required fields" }, { status: 400 });
  }

  // Get user info if userId provided
  let userName: string | undefined;
  if (body.userId) {
    const user = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { name: true },
    });
    userName = user?.name || undefined;
  }

  const result = await sendPaymentReceiptEmail(
    body.email,
    body.amount,
    body.currency || "EUR",
    body.invoiceId,
    userName
  );

  if (!result.success) {
    console.error("[payment.receipt] Failed to send:", result.error);
  }

  return NextResponse.json({ ok: true, message: "Receipt email sent" });
}
