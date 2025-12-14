import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Chunk size for range requests (4MB)
const CHUNK_SIZE = 4 * 1024 * 1024;

/**
 * Handle OPTIONS for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Range",
    },
  });
}

/**
 * Serve match video file
 * GET /api/matches/[id]/video?path=videos/match-9/video-123.mp4
 * 
 * Path is relative to uploads/ directory
 * Supports HTTP Range requests for video streaming
 * CORS enabled for video loading
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    // Get relative path from query param (relative to uploads/)
    // Expected format: videos/match-9/video-123.mp4
    const relPath = req.nextUrl.searchParams.get("path");
    console.log(`[video] Request: matchId=${matchId}, path=${relPath}`);

    if (!relPath) {
      console.error("[video] Missing path parameter");
      return new Response("Missing path parameter", { status: 400 });
    }

    // Decode URL-encoded path
    const decodedPath = decodeURIComponent(relPath);
    
    // Handle absolute paths (backward compatibility) - convert to relative
    let finalRelPath = decodedPath;
    if (decodedPath.match(/^[A-Za-z]:\\/) || decodedPath.startsWith("/")) {
      // Absolute path - extract relative part
      const uploadsDir = path.join(process.cwd(), "uploads");
      if (decodedPath.startsWith(uploadsDir)) {
        finalRelPath = path.relative(uploadsDir, decodedPath).replace(/\\/g, "/");
      } else {
        // Try to extract videos/match-X/... part
        const match = decodedPath.match(/uploads[\/\\]videos[\/\\]match-\d+[\/\\](.+)$/i);
        if (match) {
          finalRelPath = `videos/match-${matchId}/${match[1]}`;
        } else {
          return new Response("Invalid path format", { status: 400 });
        }
      }
    }

    // Base directory for uploads
    const baseDir = path.join(process.cwd(), "uploads");
    const full = path.normalize(path.join(baseDir, finalRelPath));

    // Security: ensure path is within baseDir (prevent path traversal)
    if (!full.startsWith(baseDir)) {
      console.error(`[video] Path traversal attempt: ${full}`);
      return new Response("Invalid path", { status: 400 });
    }

    if (!fs.existsSync(full)) {
      console.error(`[video] Video not found: ${full}`);
      return new Response("Video not found", { status: 404 });
    }

    const stat = fs.statSync(full);
    const fileSize = stat.size;
    console.log(`[video] File found: ${full}, size=${fileSize} bytes, ext=${path.extname(full)}`);

    if (fileSize === 0) {
      console.error(`[video] Video file is empty: ${full}`);
      return new Response("Video file is empty", { status: 500 });
    }

    // Determine content type from extension
    const ext = path.extname(full).toLowerCase();
    let contentType = "video/mp4"; // Default to mp4
    const mimeMap: Record<string, string> = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".ogg": "video/ogg",
      ".mov": "video/quicktime",
      ".avi": "video/x-msvideo",
      ".m3u8": "application/vnd.apple.mpegurl",
      ".mkv": "video/x-matroska",
      ".flv": "video/x-flv",
    };
    contentType = mimeMap[ext] || "video/mp4";

    const range = req.headers.get("range");
    console.log(`[video] Range request: ${range || "none"}, Content-Type: ${contentType}`);

    // Handle Range requests for video seeking
    if (range) {
      const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
      const start = parseInt(startStr, 10);
      
      if (isNaN(start) || start < 0 || start >= fileSize) {
        console.error(`[video] Invalid range start: ${startStr}`);
        return new Response("Invalid range", {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
            "Accept-Ranges": "bytes",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      // Calculate end: if not specified, use CHUNK_SIZE; otherwise use specified end
      const end = endStr
        ? parseInt(endStr, 10)
        : Math.min(start + CHUNK_SIZE - 1, fileSize - 1);

      if (isNaN(end) || start > end || end >= fileSize) {
        console.error(`[video] Invalid range end: ${endStr}, start=${start}, end=${end}, fileSize=${fileSize}`);
        return new Response("Invalid range", {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
            "Accept-Ranges": "bytes",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      const chunkSize = end - start + 1;
      console.log(`[video] Serving range: bytes ${start}-${end}/${fileSize} (chunk=${(chunkSize / 1024 / 1024).toFixed(2)}MB)`);
      const file = fs.createReadStream(full, { start, end });

      return new Response(file as any, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Range",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // Full file response (200 OK)
    console.log(`[video] Serving full file: ${fileSize} bytes`);
    const file = fs.createReadStream(full);
    return new Response(file as any, {
      status: 200,
      headers: {
        "Content-Length": fileSize.toString(),
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Range",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[video] Error serving video:", error);
    return new Response("Failed to serve video", { status: 500 });
  }
}
