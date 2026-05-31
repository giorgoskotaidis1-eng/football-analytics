import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readdir, readFile, unlink, mkdir, rm } from "fs/promises";
import { createWriteStream } from "fs";
import { join } from "path";
import { existsSync } from "fs";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes to assemble

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
 * Complete multipart upload
 * Assembles all parts into final file without buffering entire file in memory
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const matchId = await resolveMatchId(id);

  // Verify match exists
  const match = matchId ? await prisma.match.findUnique({ where: { id: matchId } }) : null;
  if (!match) {
    return NextResponse.json({ ok: false, message: "Match not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { uploadId, fileName, parts, customStoragePath } = body;

    if (!uploadId || !fileName || !parts || !Array.isArray(parts)) {
      return NextResponse.json({ ok: false, message: "Invalid completion parameters" }, { status: 400 });
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

    // Verify all parts are uploaded
    const partsDir = join(baseDir, "parts", uploadId);
    if (!existsSync(partsDir)) {
      return NextResponse.json({ ok: false, message: "Upload not found" }, { status: 404 });
    }

    // Validate client part list and enforce full integrity from disk.
    const parsedPartNumbers = parts
      .map((p: any) => parseInt(p?.partNumber, 10))
      .filter((n: number) => Number.isInteger(n) && n > 0);
    const uniqueRequestedPartNumbers = Array.from(new Set(parsedPartNumbers)).sort((a, b) => a - b);
    if (uniqueRequestedPartNumbers.length === 0) {
      return NextResponse.json({ ok: false, message: "No valid parts provided" }, { status: 400 });
    }

    // Ground truth from disk: only assemble if every uploaded part is declared and contiguous.
    const diskFiles = await readdir(partsDir);
    const uploadedPartNumbers = diskFiles
      .filter((f) => f.startsWith("part-"))
      .map((f) => parseInt(f.replace("part-", ""), 10))
      .filter((n) => Number.isInteger(n) && n > 0)
      .sort((a, b) => a - b);

    if (uploadedPartNumbers.length === 0) {
      return NextResponse.json({ ok: false, message: "No uploaded parts found" }, { status: 400 });
    }

    const expectedContiguous = Array.from(
      { length: uploadedPartNumbers[uploadedPartNumbers.length - 1] },
      (_, i) => i + 1
    );
    const contiguousOk =
      uploadedPartNumbers.length === expectedContiguous.length &&
      uploadedPartNumbers.every((n, i) => n === expectedContiguous[i]);
    if (!contiguousOk) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Upload is incomplete or corrupted (missing part numbers). Please resume upload and retry.",
        },
        { status: 400 }
      );
    }

    const requestMatchesDisk =
      uniqueRequestedPartNumbers.length === uploadedPartNumbers.length &&
      uniqueRequestedPartNumbers.every((n, i) => n === uploadedPartNumbers[i]);
    if (!requestMatchesDisk) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Part manifest mismatch. Please refresh and retry upload completion.",
        },
        { status: 400 }
      );
    }

    const sortedParts = uniqueRequestedPartNumbers.map((partNumber) => ({ partNumber }));

    // Create final video directory
    const videosDir = baseDir;
    if (!existsSync(videosDir)) {
      await mkdir(videosDir, { recursive: true });
    }

    // Generate final filename
    const timestamp = Date.now();
    const extension = fileName.split(".").pop() || "mp4";
    const finalFilename = `video-${timestamp}.${extension}`;
    const finalPath = join(videosDir, finalFilename);

    // Assemble parts using streams (memory-efficient)
    // Read parts in order and append to final file
    const writeStream = createWriteStream(finalPath);
    
    try {
      for (const part of sortedParts) {
        const partPath = join(partsDir, `part-${part.partNumber}`);
        
        if (!existsSync(partPath)) {
          writeStream.close();
          return NextResponse.json(
            { ok: false, message: `Part ${part.partNumber} not found` },
            { status: 400 }
          );
        }

        // Read part and append to final file
        const partData = await readFile(partPath);
        await new Promise<void>((resolve, reject) => {
          writeStream.write(partData, (err: Error | null) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      // Close write stream
      await new Promise<void>((resolve, reject) => {
        writeStream.end((err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (streamError) {
      writeStream.close();
      throw streamError;
    }

    // Clean up temporary parts
    try {
      for (const part of sortedParts) {
        const partPath = join(partsDir, `part-${part.partNumber}`);
        if (existsSync(partPath)) {
          await unlink(partPath);
        }
      }
      // Remove parts directory if empty
      const remainingFiles = await readdir(partsDir);
      if (remainingFiles.length === 0) {
        await rm(partsDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.warn("[upload-complete] Cleanup warning:", cleanupError);
      // Don't fail if cleanup fails
    }

    // Return final video path
    // If custom path, return absolute path; otherwise return relative path
    const relativePath = customStoragePath 
      ? finalPath // Absolute path for custom storage
      : `uploads/videos/match-${matchId}/${finalFilename}`; // Relative path for default storage

    // Update match with video path (if videoPath field exists in schema)
    // Note: If videoPath doesn't exist in schema, you may need to add it or store in metadata
    try {
      const pathForDb = relativePath.replace(/\\/g, "/");
      await prisma.match.update({
        where: { id: matchId },
        data: { videoPath: pathForDb },
      });
    } catch (updateError) {
      console.warn("[upload-complete] Could not update match videoPath:", updateError);
      // Continue even if update fails
    }

    return NextResponse.json({
      ok: true,
      videoPath: relativePath,
      fileName: finalFilename,
      message: "Upload completed successfully",
    });
  } catch (error) {
    console.error("[upload-complete] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to complete upload" },
      { status: 500 }
    );
  }
}

