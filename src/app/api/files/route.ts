import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_SORT_BY = new Set(["updatedAt", "name", "size"] as const);
type SortBy = "updatedAt" | "name" | "size";

function parsePositiveInt(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function serializeFile(record: {
  id: number;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: string;
  storageKey: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    name: record.name,
    originalName: record.originalName,
    mimeType: record.mimeType,
    size: record.size,
    category: record.category,
    storageKey: record.storageKey,
    url: `/uploads/${record.storageKey}`,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const sortByRaw = url.searchParams.get("sortBy");
  const sortBy: SortBy = ALLOWED_SORT_BY.has(sortByRaw as SortBy) ? (sortByRaw as SortBy) : "updatedAt";
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";

  const where: Record<string, unknown> = { userId: user.id };
  if (category && category !== "all") where.category = category;

  const orderBy =
    sortBy === "name"
      ? { name: "asc" as const }
      : sortBy === "size"
      ? { size: "desc" as const }
      : { updatedAt: "desc" as const };

  let files = await prisma.uploadedFile.findMany({
    where,
    orderBy,
    take: 200,
  });

  if (q) {
    files = files.filter((f) => {
      return (
        f.name.toLowerCase().includes(q) ||
        f.originalName.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
      );
    });
  }

  return NextResponse.json({
    ok: true,
    files: files.map(serializeFile),
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

  const existing = await prisma.uploadedFile.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "File not found." }, { status: 404 });
  }

  // Delete from disk first (best-effort), then DB.
  const absolutePath = join(process.cwd(), "public", "uploads", existing.storageKey);
  try {
    await unlink(absolutePath);
  } catch {
    // Ignore disk delete failures (file may have been removed manually).
  }

  await prisma.uploadedFile.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
