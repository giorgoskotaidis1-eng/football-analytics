import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Initialize multipart upload
 * Returns uploadId and pre-signed URLs for each part
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
    const body = await request.json();
    const { fileName, fileSize, chunkSize, customStoragePath } = body;

    if (!fileName || !fileSize || fileSize <= 0) {
      return NextResponse.json({ ok: false, message: "Invalid file parameters" }, { status: 400 });
    }

    // Validate file size (max 2GB)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (fileSize > maxSize) {
      return NextResponse.json({ ok: false, message: "File size exceeds 2GB limit" }, { status: 400 });
    }

    // Generate upload ID
    const uploadId = randomUUID();

    // Calculate number of parts
    const calculatedChunkSize = chunkSize || (fileSize < 100 * 1024 * 1024 ? 5 * 1024 * 1024 : 10 * 1024 * 1024);
    const numParts = Math.ceil(fileSize / calculatedChunkSize);

    // Generate pre-signed URLs for each part
    // For now, we'll use a simple approach with our API
    // In production, replace with actual S3/GCS/Azure pre-signed URLs
    const parts = Array.from({ length: numParts }, (_, i) => {
      const partNumber = i + 1;
      const start = i * calculatedChunkSize;
      const end = Math.min(start + calculatedChunkSize, fileSize);
      
      return {
        partNumber,
        start,
        end,
        uploadUrl: `/api/matches/${matchId}/video/upload-part?uploadId=${uploadId}&partNumber=${partNumber}`,
      };
    });

    // Store upload metadata (in production, use Redis or database)
    // For now, we'll return it in the response and client will store it

    return NextResponse.json({
      ok: true,
      uploadId,
      parts,
      chunkSize: calculatedChunkSize,
      fileName,
      fileSize,
      customStoragePath: customStoragePath || undefined,
    });
  } catch (error) {
    console.error("[upload-init] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to initialize upload" },
      { status: 500 }
    );
  }
}

