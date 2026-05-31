import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const runtime = "nodejs";
export const maxDuration = 30;

async function resolveMatchId(idParam: string): Promise<number | null> {
  if (/^\d+$/.test(idParam)) {
    return parseInt(idParam, 10);
  }

  const match = await prisma.match.findUnique({
    where: { slug: idParam },
    select: { id: true },
  });
  return match?.id ?? null;
}

/**
 * Get upload status (for resumable uploads)
 * Returns which parts have been uploaded
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const matchId = await resolveMatchId(id);
  if (!matchId) {
    return NextResponse.json({ ok: false, message: "Invalid match reference" }, { status: 400 });
  }

  try {
    const uploadId = request.nextUrl.searchParams.get("uploadId");
    const customStoragePath = request.nextUrl.searchParams.get("customStoragePath");

    if (!uploadId) {
      return NextResponse.json({ ok: false, message: "Upload ID required" }, { status: 400 });
    }

    const baseDir = customStoragePath
      ? customStoragePath
      : join(process.cwd(), "uploads", "videos", `match-${matchId}`);
    const partsDir = join(baseDir, "parts", uploadId);

    if (!existsSync(partsDir)) {
      return NextResponse.json({
        ok: true,
        uploadId,
        uploadedParts: [],
        totalParts: 0,
      });
    }

    // List uploaded parts
    const files = await readdir(partsDir);
    const uploadedParts = files
      .filter((f) => f.startsWith("part-"))
      .map((f) => parseInt(f.replace("part-", "")))
      .sort((a, b) => a - b);

    return NextResponse.json({
      ok: true,
      uploadId,
      uploadedParts,
      totalParts: uploadedParts.length,
    });
  } catch (error) {
    console.error("[upload-status] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to get upload status" },
      { status: 500 }
    );
  }
}




