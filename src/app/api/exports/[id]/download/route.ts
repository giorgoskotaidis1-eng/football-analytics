import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePositiveInt(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function mimeFor(format: string, downloadKey: string): string {
  if (format === "csv") return "text/csv";
  if (format === "json") return "application/json";
  if (format === "pdf") return "application/pdf";
  if (downloadKey.endsWith(".csv")) return "text/csv";
  if (downloadKey.endsWith(".json")) return "application/json";
  if (downloadKey.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const exportId = parsePositiveInt(id);
  if (!exportId) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const record = await prisma.dataExport.findFirst({
    where: { id: exportId, userId: user.id },
  });
  if (!record) {
    return NextResponse.json({ ok: false, message: "Export not found." }, { status: 404 });
  }
  if (!record.downloadKey) {
    return NextResponse.json(
      { ok: false, message: "Export file is not available." },
      { status: 404 }
    );
  }

  const absolutePath = join(process.cwd(), "public", "exports", record.downloadKey);
  if (!existsSync(absolutePath)) {
    return NextResponse.json(
      { ok: false, message: "Export file is missing on disk." },
      { status: 410 }
    );
  }

  const data = await readFile(absolutePath);
  return new NextResponse(data, {
    status: 200,
    headers: {
      "Content-Type": mimeFor(record.format, record.downloadKey),
      "Content-Disposition": `attachment; filename="${record.downloadKey}"`,
      "Content-Length": String(data.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
