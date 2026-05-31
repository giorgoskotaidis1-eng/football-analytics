import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const AddCardSchema = z.object({
  cardholderName: z.string().min(2).max(120),
  cardNumber: z.string().regex(/^[\d\s]+$/),
  expMonth: z.string().regex(/^(0[1-9]|1[0-2])$/),
  expYear: z.string().regex(/^\d{2}$/),
  cvv: z.string().regex(/^\d{3,4}$/),
  billingEmail: z.string().email().max(200),
  setDefault: z.boolean().optional(),
});

function detectBrand(digits: string): string {
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^6(?:011|5)/.test(digits)) return "discover";
  return "unknown";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const methods = await prisma.paymentMethod.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      brand: true,
      last4: true,
      expMonth: true,
      expYear: true,
      cardholderName: true,
      billingEmail: true,
      isDefault: true,
      provider: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, methods });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const parsed = AddCardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_INPUT",
        message: parsed.error.issues[0]?.message ?? "Invalid card details.",
      },
      { status: 400 }
    );
  }

  const digits = parsed.data.cardNumber.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) {
    return NextResponse.json(
      { ok: false, error: "INVALID_INPUT", message: "Card number must be 13–19 digits." },
      { status: 400 }
    );
  }

  const expMonthNum = Number(parsed.data.expMonth);
  const expYearNum = 2000 + Number(parsed.data.expYear);
  const now = new Date();
  const expiryDate = new Date(expYearNum, expMonthNum, 0, 23, 59, 59);
  if (expiryDate < now) {
    return NextResponse.json(
      { ok: false, error: "EXPIRED_CARD", message: "Card has expired." },
      { status: 400 }
    );
  }

  const existingCount = await prisma.paymentMethod.count({ where: { userId: user.id } });
  const shouldBeDefault = parsed.data.setDefault ?? existingCount === 0;

  if (shouldBeDefault) {
    await prisma.paymentMethod.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const created = await prisma.paymentMethod.create({
    data: {
      userId: user.id,
      brand: detectBrand(digits),
      last4: digits.slice(-4),
      expMonth: expMonthNum,
      expYear: expYearNum,
      cardholderName: parsed.data.cardholderName,
      billingEmail: parsed.data.billingEmail,
      isDefault: shouldBeDefault,
      provider: "internal",
    },
    select: {
      id: true,
      brand: true,
      last4: true,
      expMonth: true,
      expYear: true,
      cardholderName: true,
      billingEmail: true,
      isDefault: true,
      provider: true,
    },
  });

  return NextResponse.json({ ok: true, method: created });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get("id");
  const id = idParam ? Number(idParam) : Number.NaN;
  if (!Number.isFinite(id)) {
    return NextResponse.json(
      { ok: false, error: "INVALID_INPUT", message: "Missing payment method id." },
      { status: 400 }
    );
  }

  const method = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!method || method.userId !== user.id) {
    return NextResponse.json(
      { ok: false, error: "NOT_FOUND", message: "Payment method not found." },
      { status: 404 }
    );
  }

  await prisma.paymentMethod.delete({ where: { id } });

  if (method.isDefault) {
    const next = await prisma.paymentMethod.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    if (next) {
      await prisma.paymentMethod.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }

  return NextResponse.json({ ok: true });
}
