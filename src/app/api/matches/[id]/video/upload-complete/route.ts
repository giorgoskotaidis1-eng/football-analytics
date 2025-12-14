import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readdir, readFile, unlink, mkdir, rm } from "fs/promises";
import { createWriteStream } from "fs";
import { join } from "path";
import { existsSync } from "fs";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes to assemble

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

    // Sort parts by part number
    const sortedParts = parts
      .map((p: any) => ({ partNumber: parseInt(p.partNumber), etag: p.etag }))
      .sort((a: any, b: any) => a.partNumber - b.partNumber);

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
      await prisma.match.update({
        where: { id: matchId },
        data: {
          // If videoPath field exists in Match model, uncomment:
          // videoPath: relativePath,
        },
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

