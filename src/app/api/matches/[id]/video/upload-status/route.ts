import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const runtime = "nodejs";
export const maxDuration = 30;

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
  const matchId = parseInt(id);

  if (isNaN(matchId)) {
    return NextResponse.json({ ok: false, message: "Invalid match ID" }, { status: 400 });
  }

  try {
    const uploadId = request.nextUrl.searchParams.get("uploadId");

    if (!uploadId) {
      return NextResponse.json({ ok: false, message: "Upload ID required" }, { status: 400 });
    }

    const partsDir = join(process.cwd(), "uploads", "videos", `match-${matchId}`, "parts", uploadId);

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




