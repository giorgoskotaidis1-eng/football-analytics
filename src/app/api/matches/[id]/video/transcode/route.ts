import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transcodeToMP4, checkFFmpegAvailable } from "@/lib/video-transcode";
import { join, relative } from "path";
import { existsSync } from "fs";
import { unlink } from "fs/promises";

export const runtime = "nodejs";
export const maxDuration = 600; // 10 minutes for transcoding

/**
 * Transcode video to MP4 with H.264 codec
 * POST /api/matches/[id]/video/transcode
 * 
 * Body: { videoPath: string }
 */
export async function POST(
  request: NextRequest,
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
    const body = await request.json();
    const { videoPath } = body;

    if (!videoPath) {
      return NextResponse.json({ ok: false, message: "Video path required" }, { status: 400 });
    }

    // Check if FFmpeg is available
    const ffmpegAvailable = await checkFFmpegAvailable();
    if (!ffmpegAvailable) {
      return NextResponse.json({
        ok: false,
        message: "FFmpeg is not installed on the server. Please install FFmpeg to enable video transcoding.",
      }, { status: 503 });
    }

    // Validate input path (security: ensure it's within uploads directory)
    const uploadsDir = join(process.cwd(), "uploads", "videos");
    const fullInputPath = join(process.cwd(), videoPath);
    
    if (!fullInputPath.startsWith(uploadsDir)) {
      return NextResponse.json({ ok: false, message: "Invalid video path" }, { status: 400 });
    }

    if (!existsSync(fullInputPath)) {
      return NextResponse.json({ ok: false, message: "Video file not found" }, { status: 404 });
    }

    // Generate output path (same directory, with _converted suffix)
    const pathParts = fullInputPath.split(".");
    const extension = pathParts.pop();
    const basePath = pathParts.join(".");
    const outputPath = `${basePath}_converted.${extension || "mp4"}`;

    console.log(`[transcode] Starting transcoding: ${fullInputPath} -> ${outputPath}`);

    // Transcode video
    await transcodeToMP4(fullInputPath, outputPath, (progress) => {
      console.log(`[transcode] Progress: ${progress}%`);
    });

    // Update match videoPath to point to converted video
    // Use path.relative to get proper relative path (works on both Windows and Unix)
    const relativeOutputPath = relative(process.cwd(), outputPath).replace(/\\/g, "/"); // Normalize path separators to forward slashes
    console.log(`[transcode] Saving relative path to database: ${relativeOutputPath}`);
    await prisma.match.update({
      where: { id: matchId },
      data: { videoPath: relativeOutputPath },
    });

    console.log(`[transcode] Transcoding completed: ${outputPath}`);

    // After transcoding, automatically trigger video analysis to create real events
    const eventCount = await prisma.matchEvent.count({
      where: { matchId },
    });

    if (eventCount === 0) {
      console.log(`[transcode] No events found for match ${matchId}. Triggering automatic video analysis...`);
      
      try {
        // Import and call the analyze endpoint handler directly
        const { POST: analyzePOST } = await import("@/app/api/matches/[id]/video/analyze/route");
        
        // Determine leftSideTeam (default to "home" if match has homeTeamId)
        const leftSideTeam = match.homeTeamId ? "home" : "away";
        
        // Use absolute path for analysis (the analyze endpoint expects file paths)
        const absoluteVideoPath = join(process.cwd(), relativeOutputPath);
        
        // Create a mock request for the analyze endpoint
        const analyzeRequest = new NextRequest(
          new URL(`/api/matches/${matchId}/video/analyze`, request.url),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              videoPath: absoluteVideoPath, // Use absolute path for analysis
              leftSideTeam,
              teamLeftId: match.homeTeamId,
              teamRightId: match.awayTeamId,
              attackDirection: "left-to-right",
              normalize: true,
            }),
          }
        );

        // Call analyze endpoint asynchronously (don't block transcoding response)
        // This will create real events from video analysis
        analyzePOST(analyzeRequest, { params: Promise.resolve({ id: matchId.toString() }) })
          .then((response) => {
            console.log(`[transcode] Video analysis completed with status: ${response.status}`);
            return response.json();
          })
          .then((data) => {
            if (data.ok) {
              console.log(`[transcode] Video analysis successful. Created ${data.analysis?.eventsDetected || 0} events.`);
            } else {
              console.warn(`[transcode] Video analysis returned error: ${data.message}`);
            }
          })
          .catch((error) => {
            console.error(`[transcode] Video analysis failed:`, error);
            // Don't fail transcoding if analysis fails - user can trigger it manually later
          });
        
        console.log(`[transcode] Video analysis triggered in background. Events will be created automatically.`);
      } catch (analyzeError) {
        console.error("[transcode] Failed to trigger video analysis:", analyzeError);
        // Don't fail the transcoding if analysis trigger fails
      }
    } else {
      console.log(`[transcode] Match ${matchId} already has ${eventCount} events. Skipping automatic analysis.`);
    }

    return NextResponse.json({
      ok: true,
      message: "Video transcoded successfully. Video analysis is running in the background to create events.",
      videoPath: relativeOutputPath,
      analysisTriggered: eventCount === 0,
    });
  } catch (error: any) {
    console.error("[transcode] Error:", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Failed to transcode video" },
      { status: 500 }
    );
  }
}
