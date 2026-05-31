import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { spawn } from "child_process";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max for video processing

async function runPythonAnalysisWithFallback(
  scriptPath: string,
  videoPath: string,
  modelPath: string | null,
): Promise<{ ok: true; stdout: string } | { ok: false; error: string }> {
  const args = [scriptPath, videoPath, ...(modelPath ? [modelPath] : [])];
  const candidates =
    process.platform === "win32"
      ? [
          { cmd: "py", args: ["-3", ...args] },
          { cmd: "python", args },
          { cmd: "python3", args },
        ]
      : [
          { cmd: "python3", args },
          { cmd: "python", args },
        ];

  for (const candidate of candidates) {
    const result = await new Promise<{
      code: number | null;
      stdout: string;
      stderr: string;
      spawnError?: string;
    }>((resolve) => {
      const pythonProcess = spawn(candidate.cmd, candidate.args, {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
      });
      let stdout = "";
      let stderr = "";
      pythonProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      pythonProcess.stderr.on("data", (data) => {
        const chunk = data.toString();
        stderr += chunk;
        const message = chunk.trim();
        if (message.includes("[FootballAI]")) {
          console.log(`[ai/analyze-video] ${message}`);
        }
      });
      pythonProcess.on("error", (error) => {
        resolve({ code: null, stdout, stderr, spawnError: error.message });
      });
      pythonProcess.on("close", (code) => {
        resolve({ code, stdout, stderr });
      });
    });

    if (result.spawnError) {
      console.warn(`[ai/analyze-video] Failed to spawn '${candidate.cmd}': ${result.spawnError}`);
      continue;
    }

    if (result.code === 0) {
      return { ok: true, stdout: result.stdout };
    }

    return {
      ok: false,
      error: result.stderr || `Python process exited with code ${result.code}`,
    };
  }

  return {
    ok: false,
    error: "Python executable not found. Install Python 3 and make sure 'py' or 'python' is available in PATH.",
  };
}

/**
 * AI Video Analysis API
 * 
 * Analyzes football match videos using YOLOv8
 * Detects players and ball frame-by-frame
 * 
 * POST /api/ai/analyze-video
 * Body: FormData with:
 *   - video: File (video file)
 *   - videoUrl: string (optional, URL to video)
 *   - modelPath: string (optional, path to custom YOLOv8 model)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";
    let videoFile: File | null = null;
    let videoUrl: string | null = null;
    let modelPath: string | null = null;

    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => null);
      if (body) {
        videoUrl = typeof body.videoUrl === "string" ? body.videoUrl : null;
        modelPath = typeof body.modelPath === "string" ? body.modelPath : null;
      }
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const bodyText = await request.text().catch(() => "");
      const params = new URLSearchParams(bodyText);
      videoUrl = params.get("videoUrl");
      modelPath = params.get("modelPath");
    } else {
      const formData = await request.formData().catch(() => null);
      if (formData) {
        videoFile = formData.get("video") as File | null;
        videoUrl = formData.get("videoUrl") as string | null;
        modelPath = formData.get("modelPath") as string | null;
      }
    }

    if (!videoFile && !videoUrl) {
      return NextResponse.json({ ok: false, message: "Invalid form data" }, { status: 400 });
    }

    if (!videoFile && !videoUrl) {
      return NextResponse.json(
        { ok: false, message: "Video file or URL is required" },
        { status: 400 }
      );
    }

    let videoPath: string;

    // Handle video file upload
    if (videoFile) {
      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), "uploads", "videos");
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      // Save uploaded file
      const bytes = await videoFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = `video-${Date.now()}-${videoFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      videoPath = join(uploadsDir, fileName);
      await writeFile(videoPath, buffer);

      console.log(`[ai/analyze-video] Saved video to: ${videoPath}`);
    } else if (videoUrl) {
      // For URL, we'd need to download it first
      // For now, assume it's a local path or accessible URL
      videoPath = videoUrl;
      console.log(`[ai/analyze-video] Using video URL: ${videoPath}`);
    } else {
      return NextResponse.json(
        { ok: false, message: "No video provided" },
        { status: 400 }
      );
    }

    // Check if Python script exists
    const pythonScriptPath = join(process.cwd(), "football_ai", "analysis.py");
    if (!existsSync(pythonScriptPath)) {
      console.error(`[ai/analyze-video] Python script not found at: ${pythonScriptPath}`);
      return NextResponse.json(
        {
          ok: false,
          message: "AI analysis module not found. Please ensure football_ai/analysis.py exists and run setup-python-ai.bat",
        },
        { status: 500 }
      );
    }

    // Check if video file exists (for local paths)
    if (!videoUrl?.startsWith("http") && !existsSync(videoPath)) {
      return NextResponse.json(
        {
          ok: false,
          message: `Video file not found: ${videoPath}`,
        },
        { status: 404 }
      );
    }

    console.log(`[ai/analyze-video] Running analysis script for video: ${videoPath}`);

    return new Promise<NextResponse>((resolve) => {
      runPythonAnalysisWithFallback(pythonScriptPath, videoPath, modelPath).then(async (runResult) => {
        // Clean up uploaded file if it was a file upload
        if (videoFile && existsSync(videoPath)) {
          try {
            await unlink(videoPath);
            console.log(`[ai/analyze-video] Cleaned up temporary file: ${videoPath}`);
          } catch (error) {
            console.error(`[ai/analyze-video] Failed to cleanup file:`, error);
          }
        }

        if (runResult.ok) {
          try {
            const result = JSON.parse(runResult.stdout);
            resolve(
              NextResponse.json({
                ok: true,
                analysis: result,
              })
            );
          } catch (parseError) {
            console.error(`[ai/analyze-video] Failed to parse Python output:`, parseError);
            console.error(`[ai/analyze-video] stdout:`, runResult.stdout);
            resolve(
              NextResponse.json(
                {
                  ok: false,
                  message: "Failed to parse analysis results",
                  error: runResult.stdout,
                },
                { status: 500 }
              )
            );
          }
          return;
        }

        const failureError = "error" in runResult ? runResult.error : "Unknown error";
        console.error(`[ai/analyze-video] Python analysis failed: ${failureError}`);
        resolve(
          NextResponse.json(
            {
              ok: false,
              message: "Video analysis failed",
              error: failureError || "Unknown error",
            },
            { status: 500 }
          )
        );
      });
    });
  } catch (error) {
    console.error("[ai/analyze-video] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

