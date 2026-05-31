import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePositiveInt(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function serializeExport(record: {
  id: number;
  source: string;
  format: string;
  scopeLabel: string;
  status: string;
  downloadKey: string | null;
  fileSize: number | null;
  createdAt: Date;
  completedAt: Date | null;
}) {
  return {
    id: record.id,
    source: record.source,
    format: record.format,
    scopeLabel: record.scopeLabel,
    status: record.status,
    downloadKey: record.downloadKey,
    downloadUrl: record.downloadKey ? `/exports/${record.downloadKey}` : null,
    fileSize: record.fileSize,
    createdAt: record.createdAt,
    completedAt: record.completedAt,
  };
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const source = url.searchParams.get("source");
  const format = url.searchParams.get("format");

  const where: Record<string, unknown> = { userId: user.id };
  if (source && source !== "all") where.source = source;
  if (format && format !== "all") where.format = format;

  const records = await prisma.dataExport.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    ok: true,
    exports: records.map(serializeExport),
  });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = parsePositiveInt(url.searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const existing = await prisma.dataExport.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Export not found." }, { status: 404 });
  }

  if (existing.downloadKey) {
    const absolutePath = join(process.cwd(), "public", "exports", existing.downloadKey);
    try {
      await unlink(absolutePath);
    } catch {
      // best-effort
    }
  }

  await prisma.dataExport.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
