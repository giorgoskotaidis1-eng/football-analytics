import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { convertDetectedEventsToMatchEvents } from "@/lib/video-analysis";
import { calculateXG } from "@/lib/analytics";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

/** Store path the same way Spotlight/API video route expect: project-relative `uploads/...` or absolute http(s). */
function toStoredVideoPath(raw: string): string | null {
  if (!raw?.trim()) return null;
  const v = raw.trim();
  if (/^https?:\/\//i.test(v)) return v;
  const cwd = process.cwd();
  const normalized = path.normalize(v);
  const absolute =
    path.isAbsolute(normalized) || /^[A-Za-z]:/.test(v)
      ? normalized
      : path.join(cwd, v.replace(/\//g, path.sep));
  let rel = path.relative(cwd, absolute).replace(/\\/g, "/");
  if (rel.startsWith("..")) {
    return absolute.replace(/\\/g, "/");
  }
  if (!rel.startsWith("uploads/") && rel.startsWith("videos/")) {
    rel = `uploads/${rel}`;
  }
  return rel;
}

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max for video analysis

// Cache invalidation helper (shared with analytics/events routes)
declare global {
  // eslint-disable-next-line no-var
  var analyticsCache: Map<string, { data: any; timestamp: number; eventCount: number }> | undefined;
}

function invalidateAnalyticsCache(matchId: number) {
  if (typeof global !== "undefined" && global.analyticsCache) {
    global.analyticsCache.delete(`analytics-${matchId}`);
  }
}

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
 * Video Analysis API
 * 
 * This endpoint:
 * 1. Receives video file or URL
 * 2. Processes video with AI/ML
 * 3. Detects events (shots, passes, touches)
 * 4. Saves events to database
 * 5. Returns analysis results
 * 
 * Integration points:
 * - OpenCV for frame processing
 * - YOLO for object detection
 * - Cloud services (AWS, Google)
 * - Custom ML models
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Check if request was aborted
  if (request.signal?.aborted) {
    return NextResponse.json({ ok: false, message: "Request cancelled" }, { status: 499 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const matchId = await resolveMatchId(id);
  if (!matchId) {
    return NextResponse.json({ ok: false, message: "Invalid match ID" }, { status: 400 });
  }

  // Verify match exists
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return NextResponse.json({ ok: false, message: "Match not found" }, { status: 404 });
  }

  // Parse request body (can be FormData or JSON)
  let requestBody: any = {};
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      requestBody = await request.json();
    } else {
      const formData = await request.formData().catch(() => null);
      if (formData) {
        requestBody = {
          videoUrl: formData.get("videoUrl") as string | null,
          video: formData.get("video") as File | null,
          provider: formData.get("provider") as string || "opencv",
          leftSideTeam: formData.get("leftSideTeam") as string,
          teamLeftId: formData.get("teamLeftId") ? parseInt(formData.get("teamLeftId") as string) : null,
          teamRightId: formData.get("teamRightId") ? parseInt(formData.get("teamRightId") as string) : null,
          attackDirection: formData.get("attackDirection") as string || "left-to-right",
          normalize: formData.get("normalize") === "true" || formData.get("normalize") === true,
        };
      }
    }
  } catch (e) {
    console.error("[video-analyze] Failed to parse request body:", e);
  }

  const videoFile = requestBody.video || null;
  const videoUrl = requestBody.videoUrl || null;
  const videoPathFromBody = requestBody.videoPath || null; // Support videoPath from transcoding
  const provider = requestBody.provider || "opencv";
  const leftSideTeam = requestBody.leftSideTeam || null;
  const teamLeftId = requestBody.teamLeftId || null;
  const teamRightId = requestBody.teamRightId || null;
  const attackDirection = requestBody.attackDirection || "left-to-right";
  const normalize = requestBody.normalize !== false; // Default to true
  const replaceExisting = requestBody.replaceExisting !== false; // Default true: replace old analysis results

  // VALIDATION: Team side selection is mandatory
  if (!leftSideTeam || (leftSideTeam !== "home" && leftSideTeam !== "away")) {
    return NextResponse.json({ ok: false, message: "Team side selection is required (leftSideTeam must be 'home' or 'away')" }, { status: 400 });
  }

  // NOTE: Team IDs are ONLY used for Spotlight player highlighting, NOT for analysis
  // Analysis always uses position-based team assignment (y < 50 = home, y >= 50 = away)
  // This is independent of team IDs - analysis will work even without teams assigned
  let finalTeamLeftId = teamLeftId;
  let finalTeamRightId = teamRightId;
  
  if (!teamLeftId || !teamRightId) {
    // Fallback: use match.homeTeamId and match.awayTeamId (only for Spotlight, not for analysis)
    const fallbackTeamLeftId = leftSideTeam === "home" ? match.homeTeamId : match.awayTeamId;
    const fallbackTeamRightId = leftSideTeam === "home" ? match.awayTeamId : match.homeTeamId;
    
    // Only log warning if fallback values are also null (match has no teams assigned)
    // This is just for Spotlight - analysis will work fine without teams
    if (!fallbackTeamLeftId || !fallbackTeamRightId) {
      console.log(`[video-analyze] Team IDs not provided and match has no teams assigned. This only affects Spotlight player highlighting. Analysis will proceed normally with position-based team assignment.`);
    } else {
      // Use fallback values silently (this is expected behavior)
      finalTeamLeftId = fallbackTeamLeftId;
      finalTeamRightId = fallbackTeamRightId;
    }
  }

  // Check for video input - support videoFile, videoUrl, or videoPath
  if (!videoFile && !videoUrl && !videoPathFromBody) {
    return NextResponse.json({ ok: false, message: "Video file, URL, or path required" }, { status: 400 });
  }

  // Check abort signal periodically
  const checkAbort = () => {
    if (request.signal?.aborted) {
      throw new Error("Request cancelled");
    }
  };

  try {
    // IMPORTANT: To avoid showing "previous analyses", we replace existing events by default.
    // This matches the expected UX: each analysis run should reflect the current video, not accumulate old data.
    if (replaceExisting) {
      console.log(`[video-analyze] replaceExisting=true → deleting existing events for match ${matchId}...`);
      await prisma.matchEvent.deleteMany({ where: { matchId } });
      // Reset aggregate match stats so stale values from previous analyses are not shown.
      await prisma.match.update({
        where: { id: matchId },
        data: {
          shotsHome: 0,
          shotsAway: 0,
          xgHome: 0,
          xgAway: 0,
        },
      });
      invalidateAnalyticsCache(matchId);
    }

    let videoPath: string | null = null;
    
    // Save video file if uploaded (non-blocking)
    if (videoFile) {
      checkAbort();
      videoPath = await saveVideoFile(videoFile, matchId);
      checkAbort();
      if (!videoPath) {
        return NextResponse.json({ ok: false, message: "Failed to save video file" }, { status: 500 });
      }
      console.log(`[video-analyze] Video saved to: ${videoPath}`);
    } else if (videoPathFromBody) {
      // Support videoPath from transcoding (absolute or relative path)
      videoPath = videoPathFromBody;
      console.log(`[video-analyze] Using video path from request: ${videoPath}`);
    } else if (videoUrl) {
      videoPath = videoUrl;
      console.log(`[video-analyze] Using video URL: ${videoPath}`);
    } else {
      return NextResponse.json({ ok: false, message: "Video file, URL, or path required" }, { status: 400 });
    }

    // Same video file the AI analyzes → persist on Match immediately so Spotlight stays in sync (before / even if AI fails).
    const storedVideoPath = toStoredVideoPath(videoPath);
    if (storedVideoPath) {
      try {
        await prisma.match.update({
          where: { id: matchId },
          data: { videoPath: storedVideoPath },
        });
        console.log(`[video-analyze] Match ${matchId} videoPath set for Spotlight: ${storedVideoPath}`);
      } catch (persistErr) {
        console.warn("[video-analyze] Could not persist videoPath:", persistErr);
      }
    }

    // Call Python AI analysis endpoint directly (internal call)
    // This uses the actual YOLO analysis from football_ai/analysis.py
    let analysisResponse = null;
    
    try {
      checkAbort();
      console.log(`[video-analyze] Starting AI analysis for video: ${videoPath}`);
      
      // Import and call the analyze-video handler directly
      // This avoids HTTP fetch issues (CORS, auth, etc.)
      const { POST: analyzeVideoPOST } = await import("@/app/api/ai/analyze-video/route");
      
      checkAbort();
      
      // Build a proper JSON request for the AI endpoint.
      // Previous URL-encoded payload could be parsed as invalid form data in some runtimes.
      const analyzePayload: Record<string, any> = {};
      if (videoPath && !videoPath.startsWith("http")) {
        analyzePayload.videoUrl = videoPath;
        console.log(`[video-analyze] Passing video path to analysis: ${videoPath}`);
      } else if (videoUrl) {
        analyzePayload.videoUrl = videoUrl;
        console.log(`[video-analyze] Passing video URL to analysis: ${videoUrl}`);
      }
      
      // Create NextRequest with form data and signal
      const analyzeRequest = new NextRequest(
        new URL("/api/ai/analyze-video", request.url),
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            // Copy cookies for authentication
            cookie: request.headers.get("cookie") || "",
          },
          body: JSON.stringify(analyzePayload),
          signal: request.signal, // Pass abort signal
        }
      );
      
      // Call the analyze-video endpoint handler directly
      // Use Promise.race with timeout to prevent blocking
      const analysisPromise = analyzeVideoPOST(analyzeRequest);
      const timeoutPromise = new Promise<NextResponse>((resolve) => {
        setTimeout(() => {
          resolve(NextResponse.json({ ok: false, message: "Analysis timeout" }, { status: 504 }));
        }, 240000); // 4 minutes timeout
      });
      
      analysisResponse = await Promise.race([analysisPromise, timeoutPromise]);
      checkAbort();
      
      console.log(`[video-analyze] Analysis response received, status: ${analysisResponse.status}`);
      
      // Log response for debugging (non-blocking)
      if (analysisResponse.ok) {
        analysisResponse.clone().json().then((responseData) => {
          console.log(`[video-analyze] Analysis response data:`, JSON.stringify(responseData, null, 2));
        }).catch(() => {});
      }
      
    } catch (err: any) {
      // If request was aborted, return early
      if (err.message === "Request cancelled" || request.signal?.aborted) {
        return NextResponse.json({ ok: false, message: "Request cancelled" }, { status: 499 });
      }
      
      // If Python endpoint fails, log error but continue
      console.error("[video-analyze] Python analysis error:", err);
      if (err instanceof Error) {
        console.error("[video-analyze] Error message:", err.message);
        console.error("[video-analyze] Error stack:", err.stack);
      }
      analysisResponse = null;
    }

    // Try to get analysis from Python endpoint if available
    let analysisResult = null;
    
    if (analysisResponse && analysisResponse.ok) {
      try {
        const analysisData = await analysisResponse.json();
        console.log(`[video-analyze] Python response: ok=${analysisData.ok}, hasAnalysis=${!!analysisData.analysis}, eventsCount=${analysisData.analysis?.events?.length || 0}`);
        
        if (analysisData.ok && analysisData.analysis) {
          // Convert Python analysis format to our format
          // Determine team based on pitch position:
          // - Home team attacks from y=0 to y=50 (left side)
          // - Away team attacks from y=50 to y=100 (right side)
          // For shots: if y < 50, it's home team shooting, if y > 50, it's away team
          // For other events: use ball position or event position
          analysisResult = {
            videoId: `match-${matchId}`,
            matchId,
            duration: analysisData.analysis.duration || 0,
            fps: analysisData.analysis.fps || 30,
            totalFrames: analysisData.analysis.total_frames || 0,
            events: (analysisData.analysis.events || []).map((e: any) => {
              // Determine team from position
              let team: "home" | "away" = "home";
              
              if (e.team) {
                // If Python script already assigned team, use it
                team = e.team === "away" ? "away" : "home";
              } else if (e.position) {
                // Determine team from pitch position
                const y = e.position.y || 50;
                // Home team attacks from y=0 to y=50 (left side, attacking goal at y=0)
                // Away team attacks from y=50 to y=100 (right side, attacking goal at y=100)
                
                if (e.type === "shot") {
                  // For shots: if shot is close to goal (y < 20 or y > 80), determine team
                  // Shots near y=0 are home team, shots near y=100 are away team
                  if (y < 20) {
                    team = "home"; // Home team shooting at goal (y=0)
                  } else if (y > 80) {
                    team = "away"; // Away team shooting at goal (y=100)
                  } else {
                    // For shots in middle, use y < 50 for home, y > 50 for away
                    team = y < 50 ? "home" : "away";
                  }
                } else if (e.type === "pass" || e.type === "touch") {
                  // For passes/touches: determine from position
                  // If event is in attacking half, it's that team
                  team = y < 50 ? "home" : "away";
                } else {
                  // For other events (tackles, interceptions, etc.), use position
                  team = y < 50 ? "home" : "away";
                }
              }
              
              return {
                type: e.type,
                timestamp: e.timestamp || 0,
                frame: e.frame || 0,
                team,
                playerId: e.playerId,
                pitchPosition: e.position ? { x: e.position.x, y: e.position.y } : undefined,
                confidence: e.confidence || 0.5,
                metadata: e.metadata || {},
              };
            }),
            playerTracking: [],
            ballTracking: [],
            processedAt: new Date().toISOString(),
          };
          console.log(`[video-analyze] Created analysisResult with ${analysisResult.events?.length || 0} events`);
        } else {
          console.warn(`[video-analyze] Python response ok but no analysis data. analysisData:`, JSON.stringify(analysisData, null, 2));
        }
      } catch (parseError) {
        console.error("[video-analyze] Failed to parse analysis response:", parseError);
        if (parseError instanceof Error) {
          console.error("[video-analyze] Parse error details:", parseError.message, parseError.stack);
        }
      }
    }
    
    // If no analysis result, return empty analysis (no synthetic/demo events)
    if (!analysisResult) {
      console.warn(`[video-analyze] No analysis result. Analysis response status: ${analysisResponse?.status}`);
      console.warn(`[video-analyze] Analysis response ok: ${analysisResponse?.ok}`);
      
      console.warn(`[video-analyze] Python analysis failed or returned no results.`);
      
      // Try to get error message from response (for logging only)
      if (analysisResponse && !analysisResponse.ok) {
        try {
          const errorData = await analysisResponse.json();
          console.error(`[video-analyze] Analysis error:`, errorData);
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      return NextResponse.json({
        ok: true,
        message: "Video uploaded successfully, but no events were detected. You can add events manually.",
        analysis: {
          eventsDetected: 0,
          shots: { home: 0, away: 0 },
          xg: { home: 0, away: 0 },
          duration: 0,
          totalFrames: 0,
        },
        videoPath: videoPath.startsWith("http") ? videoPath : `/uploads/videos/match-${matchId}/${videoPath.split("/").pop()}`,
      });
    }
    
    // Log analysis result for debugging
    console.log(`[video-analyze] Analysis result:`, {
      eventsCount: analysisResult.events?.length || 0,
      duration: analysisResult.duration,
      totalFrames: analysisResult.totalFrames,
      finalTeamLeftId,
      finalTeamRightId,
      leftSideTeam,
    });

    // Convert detected events to MatchEvent format
    console.log(`[video-analyze] Converting ${analysisResult.events?.length || 0} events to MatchEvent format`);
    
    if (!analysisResult.events || analysisResult.events.length === 0) {
      console.warn(`[video-analyze] No events detected in analysis result.`);
      return NextResponse.json({
        ok: true,
        message: "Video analyzed successfully, but no events were detected. The video may not contain clear football action or the AI model needs improvement.",
        analysis: {
          eventsDetected: 0,
          shots: { home: 0, away: 0 },
          xg: { home: 0, away: 0 },
          duration: analysisResult.duration,
          totalFrames: analysisResult.totalFrames,
        },
      });
    }
    
    let eventsToCreate = convertDetectedEventsToMatchEvents(analysisResult.events, matchId);
    console.log(`[video-analyze] Converted to ${eventsToCreate.length} MatchEvents`);

    // Normalize and map events based on team side selection
    // IMPORTANT: Team assignment is ALWAYS position-based (y < 50 = home, y >= 50 = away)
    // Team IDs are ONLY used for Spotlight player highlighting, NOT for analysis
    // This ensures analysis always works, even without team IDs

    // Calculate xG for shots and ensure team assignment is correct
    eventsToCreate = eventsToCreate.map((eventData) => {
      // Normalize coordinates to 0..1 if needed
      let normalizedX = eventData.x;
      let normalizedY = eventData.y;
      
      if (normalize && eventData.x !== null && eventData.y !== null) {
        // If coordinates are in pixels, normalize to 0-100 (or 0-1)
        // Assuming video analysis returns pixel coordinates, we need to normalize
        // For now, assume they're already in 0-100 range, but we can adjust if needed
        normalizedX = Math.max(0, Math.min(100, Number(eventData.x)));
        normalizedY = Math.max(0, Math.min(100, Number(eventData.y)));
      }

      // Determine team based on position and leftSideTeam setting
      // Left side = y < 50 (or normalized y < 0.5), Right side = y >= 50
      // But we need to check the actual teamId from the event if available
      let team: "home" | "away";
      let playerId: number | null = eventData.playerId || null;
      
      // Try to get teamId from event metadata first
      let eventTeamId: number | null = null;
      try {
        if (eventData.metadata) {
          const metadata = typeof eventData.metadata === "string" 
            ? JSON.parse(eventData.metadata) 
            : eventData.metadata;
          eventTeamId = metadata.teamId || metadata.team_id || null;
        }
      } catch (e) {
        // Invalid metadata, ignore
      }

      // ALWAYS use position-based mapping for team assignment (independent of team IDs)
      // Team IDs are ONLY used for Spotlight player highlighting, NOT for analysis
      // Position-based: y < 50 = left side, y >= 50 = right side
      // This ensures analysis always works, even without team IDs
      // Default to "home" if y is null (shouldn't happen, but safety check)
      const isLeftSide = normalizedY !== null && normalizedY < 50;
      team = normalizedY !== null 
        ? (leftSideTeam === "home" 
          ? (isLeftSide ? "home" : "away")
          : (isLeftSide ? "away" : "home"))
        : "home"; // Default fallback if y is null

      // Apply coordinate flip if needed based on attack direction
      // Our canvas expects: home attacks right (x: 0->100), away attacks left (x: 100->0)
      // If attackDirection is "left-to-right", left side attacks right (no flip needed for left team)
      // If attackDirection is "right-to-left", right side attacks left (flip needed)
      // For now, we assume left-to-right, so left team attacks right (normal)
      // Away team (right side) needs flip: x := 100 - x, y := 100 - y
      if (normalize && normalizedX !== null && normalizedY !== null && team === "away") {
        // Flip coordinates for away team to show their attacking perspective
        normalizedX = 100 - normalizedX;
        normalizedY = 100 - normalizedY;
      }

      // Calculate xG for shots
      if (eventData.type === "shot" && normalizedX !== null && normalizedY !== null) {
        const xg = calculateXG({
          x: normalizedX,
          y: normalizedY,
          shotType: "open_play", // Default for AI-detected shots
          bodyPart: "foot", // Default
        });
        
        return { 
          ...eventData, 
          x: normalizedX,
          y: normalizedY,
          xg, 
          team,
          playerId,
        };
      }
      
      return { 
        ...eventData, 
        x: normalizedX,
        y: normalizedY,
        team,
        playerId,
      };
    });

    // Remove AI jitter duplicates / low quality detections before saving.
    eventsToCreate = sanitizeEventsForStorage(eventsToCreate);
    console.log(`[video-analyze] Sanitized events for storage: ${eventsToCreate.length}`);

    // Save events to database
    console.log(`[video-analyze] Creating ${eventsToCreate.length} events in database...`);
    const createdEvents = await Promise.all(
      eventsToCreate.map((eventData) =>
        prisma.matchEvent.create({
          data: eventData,
        }).catch((err) => {
          console.error(`[video-analyze] Failed to create event:`, err);
          console.error(`[video-analyze] Event data:`, JSON.stringify(eventData, null, 2));
          return null;
        })
      )
    ).then(results => results.filter(r => r !== null));
    
    console.log(`[video-analyze] Successfully created ${createdEvents.length} events out of ${eventsToCreate.length} attempted.`);
    
    if (createdEvents.length === 0) {
      console.error(`[video-analyze] WARNING: No events were created! Check logs above for errors.`);
      console.error(`[video-analyze] eventsToCreate sample:`, eventsToCreate.slice(0, 2));
    }

    // Update match statistics
    const homeShots = createdEvents.filter((e) => e.type === "shot" && e.team === "home").length;
    const awayShots = createdEvents.filter((e) => e.type === "shot" && e.team === "away").length;
    const homeXG = createdEvents
      .filter((e) => e.type === "shot" && e.team === "home")
      .reduce((sum, e) => sum + (e.xg || 0), 0);
    const awayXG = createdEvents
      .filter((e) => e.type === "shot" && e.team === "away")
      .reduce((sum, e) => sum + (e.xg || 0), 0);
    
    console.log(`[video-analyze] Statistics: homeShots=${homeShots}, awayShots=${awayShots}, homeXG=${homeXG}, awayXG=${awayXG}`);

    await prisma.match.update({
      where: { id: matchId },
      data: {
        shotsHome: homeShots,
        shotsAway: awayShots,
        xgHome: homeXG,
        xgAway: awayXG,
        ...(storedVideoPath ? { videoPath: storedVideoPath } : {}),
      },
    });

    // Auto-update player stats for all players with events in this match
    const uniquePlayerIds = new Set(
      createdEvents
        .map((e) => e.playerId)
        .filter((id): id is number => id !== null && id !== undefined)
    );
    
    if (uniquePlayerIds.size > 0) {
      console.log(`[video-analyze] Updating stats for ${uniquePlayerIds.size} players...`);
      const { updatePlayerStatsFromEvents } = await import("@/lib/player-stats-calculator");
      await Promise.allSettled(
        Array.from(uniquePlayerIds).map((playerId) =>
          updatePlayerStatsFromEvents(playerId).catch((err) => {
            console.error(`[video-analyze] Failed to update stats for player ${playerId}:`, err);
          })
        )
      );
      console.log(`[video-analyze] Player stats updated successfully.`);
    }

    return NextResponse.json({
      ok: true,
      analysis: {
        eventsDetected: createdEvents.length,
        shots: { home: homeShots, away: awayShots },
        xg: { home: homeXG, away: awayXG },
        duration: analysisResult.duration,
        totalFrames: analysisResult.totalFrames,
      },
    });
  } catch (error) {
    console.error("[video-analyze] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Video analysis failed",
      },
      { status: 500 }
    );
  }
}

const MAX_VIDEO_SIZE = 10 * 1024 * 1024 * 1024; // 10GB

/**
 * Generate fallback demo events when AI analysis fails or detects nothing
 * This is similar to how professional apps handle edge cases
 */
export function generateFallbackEvents(matchId: number, leftSideTeam: string): Array<{
  matchId: number;
  type: string;
  team: string;
  x?: number;
  y?: number;
  minute?: number;
  metadata?: string;
  xg?: number;
}> {
  // Disabled intentionally: do not create synthetic/demo events.
  // If AI fails, callers should return 0 detected events instead of fake stats.
  return [];
}

type StorableEvent = {
  matchId: number;
  type: string;
  team: string;
  playerId?: number | null;
  x?: number | null;
  y?: number | null;
  minute?: number | null;
  metadata?: string;
  xg?: number;
};

function readConfidence(metadata?: string): number {
  if (!metadata) return 0.5;
  try {
    const m = JSON.parse(metadata);
    const c = Number(m?.confidence);
    return Number.isFinite(c) ? c : 0.5;
  } catch {
    return 0.5;
  }
}

function sanitizeEventsForStorage(events: StorableEvent[]): StorableEvent[] {
  if (!events.length) return events;

  const dedupShots = new Map<string, StorableEvent>();
  const nonShots: StorableEvent[] = [];

  for (const ev of events) {
    if (ev.type !== "shot") {
      nonShots.push(ev);
      continue;
    }
    if (ev.x == null || ev.y == null) continue;
    const x = Number(ev.x);
    const y = Number(ev.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    const conf = readConfidence(ev.metadata);
    if (conf < 0.45) continue;

    const minuteBucket = Math.max(0, Math.floor(Number(ev.minute ?? 0)));
    const cellX = Math.floor(Math.max(0, Math.min(99.999, x)) / 5); // 5x5 grid in 0..100 coords
    const cellY = Math.floor(Math.max(0, Math.min(99.999, y)) / 5);
    const key = `${ev.team}|${minuteBucket}|${cellX}|${cellY}`;

    const existing = dedupShots.get(key);
    if (!existing || readConfidence(existing.metadata) < conf) {
      dedupShots.set(key, ev);
    }
  }

  const keptShots = Array.from(dedupShots.values());
  const byTeam = { home: [] as StorableEvent[], away: [] as StorableEvent[] };
  for (const s of keptShots) {
    if (s.team === "away") byTeam.away.push(s);
    else byTeam.home.push(s);
  }
  byTeam.home.sort((a, b) => readConfidence(b.metadata) - readConfidence(a.metadata));
  byTeam.away.sort((a, b) => readConfidence(b.metadata) - readConfidence(a.metadata));

  const cappedShots = [...byTeam.home.slice(0, 45), ...byTeam.away.slice(0, 45)];
  return [...nonShots, ...cappedShots];
}

async function saveVideoFile(file: File, matchId: number): Promise<string | null> {
  try {
    // Check file size
    if (file.size > MAX_VIDEO_SIZE) {
      throw new Error(`File too large. Maximum size is 10GB.`);
    }

    // Validate video format
    const validTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
    const validExtensions = [".mp4", ".webm", ".mov", ".avi"];
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      throw new Error(`Unsupported video format: ${file.type || fileExtension}. Please use MP4 (H.264), WebM, or MOV.`);
    }

    // Warn if not MP4 (best compatibility)
    if (file.type !== "video/mp4" && !file.name.toLowerCase().endsWith(".mp4")) {
      console.warn(`[saveVideoFile] Video format ${file.type || fileExtension} may not be fully supported. MP4 (H.264) is recommended.`);
    }

    // Create uploads directory
    const uploadsDir = path.join(process.cwd(), "uploads", "videos", `match-${matchId}`);
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename (preserve extension for proper Content-Type detection)
    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "mp4";
    const filename = `video-${timestamp}.${extension}`;
    const filepath = path.join(uploadsDir, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    console.log(`[saveVideoFile] Video saved: ${filename}, type: ${file.type}, size: ${file.size} bytes`);

    // Return relative path for analysis
    return filepath;
  } catch (error) {
    console.error("[saveVideoFile] Error:", error);
    throw error;
  }
}
