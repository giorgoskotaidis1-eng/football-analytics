import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { spawn } from "child_process";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max for video processing

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

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ ok: false, message: "Invalid form data" }, { status: 400 });
    }

    const videoFile = formData.get("video") as File | null;
    const videoUrl = formData.get("videoUrl") as string | null;
    const modelPath = formData.get("modelPath") as string | null;

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

    // Run Python analysis script
    const pythonCommand = process.platform === "win32" ? "python" : "python3";
    const args = [pythonScriptPath, videoPath];
    if (modelPath) {
      args.push(modelPath);
    }

    console.log(`[ai/analyze-video] Running: ${pythonCommand} ${args.join(" ")}`);

    return new Promise<NextResponse>((resolve) => {
      const pythonProcess = spawn(pythonCommand, args, {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
      });

      let stdout = "";
      let stderr = "";

      pythonProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        stderr += data.toString();
        // Log progress messages
        const message = data.toString().trim();
        if (message.includes("[FootballAI]")) {
          console.log(`[ai/analyze-video] ${message}`);
        }
      });

      pythonProcess.on("close", async (code) => {
        // Clean up uploaded file if it was a file upload
        if (videoFile && existsSync(videoPath)) {
          try {
            await unlink(videoPath);
            console.log(`[ai/analyze-video] Cleaned up temporary file: ${videoPath}`);
          } catch (error) {
            console.error(`[ai/analyze-video] Failed to cleanup file:`, error);
          }
        }

        if (code !== 0) {
          console.error(`[ai/analyze-video] Python process exited with code ${code}`);
          console.error(`[ai/analyze-video] stderr: ${stderr}`);
          resolve(
            NextResponse.json(
              {
                ok: false,
                message: "Video analysis failed",
                error: stderr || "Unknown error",
              },
              { status: 500 }
            )
          );
          return;
        }

        try {
          // Parse JSON output from Python script
          const result = JSON.parse(stdout);
          
          resolve(
            NextResponse.json({
              ok: true,
              analysis: result,
            })
          );
        } catch (parseError) {
          console.error(`[ai/analyze-video] Failed to parse Python output:`, parseError);
          console.error(`[ai/analyze-video] stdout:`, stdout);
          resolve(
            NextResponse.json(
              {
                ok: false,
                message: "Failed to parse analysis results",
                error: stdout || stderr,
              },
              { status: 500 }
            )
          );
        }
      });

      pythonProcess.on("error", (error) => {
        console.error(`[ai/analyze-video] Failed to start Python process:`, error);
        resolve(
          NextResponse.json(
            {
              ok: false,
              message: "Failed to start analysis process",
              error: error.message,
            },
            { status: 500 }
          )
        );
      });

      // Set timeout (5 minutes)
      setTimeout(() => {
        if (!pythonProcess.killed) {
          pythonProcess.kill();
          resolve(
            NextResponse.json(
              {
                ok: false,
                message: "Analysis timeout (exceeded 5 minutes)",
              },
              { status: 408 }
            )
          );
        }
      }, 300000); // 5 minutes
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

