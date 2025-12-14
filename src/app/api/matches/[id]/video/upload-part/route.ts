import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes per part

/**
 * Upload a single part of multipart upload
 * Stores part temporarily until all parts are uploaded
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const matchId = parseInt(id);

  if (isNaN(matchId)) {
    return NextResponse.json({ ok: false, message: "Invalid match ID" }, { status: 400 });
  }

  // Verify match exists
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return NextResponse.json({ ok: false, message: "Match not found" }, { status: 404 });
  }

  try {
    const uploadId = request.nextUrl.searchParams.get("uploadId");
    const partNumber = parseInt(request.nextUrl.searchParams.get("partNumber") || "0");
    const customStoragePath = request.nextUrl.searchParams.get("customStoragePath");

    if (!uploadId || isNaN(partNumber) || partNumber < 1) {
      return NextResponse.json({ ok: false, message: "Invalid upload parameters" }, { status: 400 });
    }

    // Get part data from request body
    const formData = await request.formData();
    const partData = formData.get("part") as File | null;

    if (!partData) {
      return NextResponse.json({ ok: false, message: "Part data required" }, { status: 400 });
    }

    // Determine storage directory (custom path or default)
    let baseDir: string;
    if (customStoragePath) {
      // Use custom path (e.g., external drive)
      baseDir = customStoragePath;
    } else {
      // Use default path
      baseDir = join(process.cwd(), "uploads", "videos", `match-${matchId}`);
    }

    // Create temporary directory for parts
    const partsDir = join(baseDir, "parts", uploadId);
    if (!existsSync(partsDir)) {
      await mkdir(partsDir, { recursive: true });
    }

    // Save part to temporary file
    const partPath = join(partsDir, `part-${partNumber}`);
    const bytes = await partData.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(partPath, buffer);

    // Calculate ETag (simple hash for now, in production use MD5)
    const etag = `"${Buffer.from(partPath).toString("base64").slice(0, 16)}"`;

    return NextResponse.json({
      ok: true,
      partNumber,
      etag,
      size: buffer.length,
    });
  } catch (error) {
    console.error("[upload-part] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to upload part" },
      { status: 500 }
    );
  }
}




