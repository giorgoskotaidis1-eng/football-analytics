import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_PRIORITIES = ["normal", "high", "critical"] as const;

const ticketSchema = z.object({
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(120),
  body: z.string().trim().min(10, "Please add more detail").max(4000),
  priority: z.enum(ALLOWED_PRIORITIES).default("normal"),
});

function serializeTicket(record: {
  id: number;
  subject: string;
  body: string;
  priority: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    subject: record.subject,
    body: record.body,
    priority: record.priority,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    ok: true,
    tickets: tickets.map(serializeTicket),
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = ticketSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message || "Invalid ticket payload";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }

  const created = await prisma.supportTicket.create({
    data: {
      userId: user.id,
      subject: parsed.data.subject,
      body: parsed.data.body,
      priority: parsed.data.priority,
    },
  });

  return NextResponse.json({ ok: true, ticket: serializeTicket(created) });
}
