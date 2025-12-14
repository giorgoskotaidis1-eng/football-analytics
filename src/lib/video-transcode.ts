import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { join } from "path";

// Try to import ffmpeg-static (server-side only)
let ffmpegStaticPath: string | null = null;
try {
  if (typeof window === "undefined") {
    // Server-side only
    const ffmpegStatic = require("ffmpeg-static");
    ffmpegStaticPath = ffmpegStatic || null;
  }
} catch {
  // ffmpeg-static not available, will use system FFmpeg
}

const execAsync = promisify(exec);

/**
 * Get FFmpeg executable path (server-side only)
 * Priority: ffmpeg-static > process.env.FFMPEG_PATH > system PATH > common paths
 */
function getFFmpegPath(): string | null {
  // Server-side only check
  if (typeof window !== "undefined") {
    console.error("[video-transcode] getFFmpegPath called on client - this should never happen!");
    return null;
  }

  // Priority 1: ffmpeg-static
  if (ffmpegStaticPath && existsSync(ffmpegStaticPath)) {
    return ffmpegStaticPath;
  }

  // Priority 2: Environment variable
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  // Priority 3: System PATH (will be checked in checkFFmpegAvailable)
  // Priority 4: Common Windows paths
  const commonPaths = [
    "C:\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\Users\\troll\\Downloads\\ffmpeg-2025-12-04-git-d6458f6a8b-full_build\\bin\\ffmpeg.exe",
    "C:\\Users\\troll\\Downloads\\ffmpeg-2025-12-04-git-d6458f6a8b-full_build\\ffmpeg-tools-2025-01-01-git-d3aa99a4f4\\bin\\ffmpeg.exe",
    "C:\\Users\\troll\\Downloads\\ffmpeg-8.0.1\\ffmpeg-8.0.1\\ffmpeg.exe",
    "C:\\Users\\troll\\Downloads\\ffmpeg-8.0.1\\bin\\ffmpeg.exe",
  ];

  for (const path of commonPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

/**
 * Check if FFmpeg is available on the system (server-side only)
 */
export async function checkFFmpegAvailable(): Promise<boolean> {
  // Server-side only
  if (typeof window !== "undefined") {
    console.error("[video-transcode] checkFFmpegAvailable called on client - this should never happen!");
    return false;
  }

  try {
    const ffmpegPath = getFFmpegPath();
    
    if (ffmpegPath) {
      // Test the specific path
      await execAsync(`"${ffmpegPath}" -version`);
      return true;
    }

    // Try system PATH as fallback
    try {
      await execAsync("ffmpeg -version");
      return true;
    } catch {
      // FFmpeg not found
      const errorMsg = `FFmpeg binary not found at ${process.env.FFMPEG_PATH || "PATH"}. ` +
        `ffmpeg-static: ${ffmpegStaticPath ? "available" : "not installed"}. ` +
        `Please install ffmpeg-static (npm i ffmpeg-static) or set FFMPEG_PATH environment variable.`;
      console.error("[video-transcode]", errorMsg);
      return false;
    }
  } catch (error: any) {
    const errorMsg = `FFmpeg binary not found at ${process.env.FFMPEG_PATH || "PATH"}. ` +
      `Error: ${error.message}`;
    console.error("[video-transcode]", errorMsg);
    return false;
  }
}

/**
 * Transcode video to MP4 with H.264 codec
 * @param inputPath - Path to input video file
 * @param outputPath - Path to output video file (will be created)
 * @param onProgress - Optional callback for progress updates (0-100)
 */
export async function transcodeToMP4(
  inputPath: string,
  outputPath: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  // Server-side only
  if (typeof window !== "undefined") {
    throw new Error("transcodeToMP4 can only be called server-side");
  }

  // Check if FFmpeg is available
  const ffmpegAvailable = await checkFFmpegAvailable();
  if (!ffmpegAvailable) {
    const errorMsg = `FFmpeg binary not found at ${process.env.FFMPEG_PATH || "PATH"}. ` +
      `Please install ffmpeg-static (npm i ffmpeg-static) or set FFMPEG_PATH environment variable.`;
    throw new Error(errorMsg);
  }

  // Check if input file exists
  if (!existsSync(inputPath)) {
    throw new Error(`Input video file not found: ${inputPath}`);
  }

  // Get FFmpeg executable path
  const ffmpegPath = getFFmpegPath();
  const ffmpegCmd = ffmpegPath ? `"${ffmpegPath}"` : "ffmpeg";

  // FFmpeg command to transcode to MP4 with H.264 (optimized for web streaming + speed)
  // -c:v libx264: Use H.264 video codec
  // -preset fast: Faster encoding while maintaining good quality (faster than medium, better than ultrafast)
  // -crf 23: Good quality/speed balance (slightly faster than 22, still excellent quality)
  // -pix_fmt yuv420p: Pixel format for maximum browser compatibility (REQUIRED for web playback)
  // -tune fastdecode: Optimize for fast decoding
  // -threads 0: Auto-detect optimal thread count for CPU
  // -c:a aac: Use AAC audio codec
  // -b:a 128k: Good audio bitrate for quality
  // -movflags +faststart: Enable fast start for web playback (metadata at beginning of file) - REQUIRED
  // -y: Overwrite output file if exists
  // -loglevel error: Minimal logging for maximum performance
  // Note: pix_fmt yuv420p and movflags +faststart are CRITICAL for browser compatibility
  const command = `${ffmpegCmd} -i "${inputPath}" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -tune fastdecode -threads 0 -c:a aac -b:a 128k -movflags +faststart -loglevel error -y "${outputPath}"`;

  return new Promise((resolve, reject) => {
    const process = exec(command, (error, stdout, stderr) => {
      if (error) {
        // FFmpeg writes to stderr even on success, so check exit code
        if (error.code !== 0) {
          reject(new Error(`FFmpeg transcoding failed: ${error.message}\n${stderr}`));
          return;
        }
      }
      resolve();
    });

    // Parse progress from stderr (FFmpeg outputs progress there)
    if (onProgress && process.stderr) {
      let duration = 0;
      process.stderr.on("data", (data: Buffer) => {
        const output = data.toString();
        
        // Extract duration
        const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
        if (durationMatch && duration === 0) {
          const hours = parseInt(durationMatch[1]);
          const minutes = parseInt(durationMatch[2]);
          const seconds = parseInt(durationMatch[3]);
          const centiseconds = parseInt(durationMatch[4]);
          duration = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
        }
        
        // Extract current time
        const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
        if (timeMatch && duration > 0) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const seconds = parseInt(timeMatch[3]);
          const centiseconds = parseInt(timeMatch[4]);
          const currentTime = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
          
          const progress = Math.min(100, Math.round((currentTime / duration) * 100));
          onProgress(progress);
        }
      });
    }
  });
}

/**
 * Get video metadata (duration, codec, etc.) using FFprobe
 */
export async function getVideoMetadata(videoPath: string): Promise<{
  duration: number;
  codec: string;
  width: number;
  height: number;
  bitrate: number;
}> {
  const ffprobeAvailable = await checkFFmpegAvailable(); // FFprobe comes with FFmpeg
  if (!ffprobeAvailable) {
    throw new Error("FFmpeg/FFprobe is not installed");
  }

  if (!existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
  
  try {
    const { stdout } = await execAsync(command);
    const metadata = JSON.parse(stdout);
    
    const videoStream = metadata.streams?.find((s: any) => s.codec_type === "video");
    const format = metadata.format;
    
    return {
      duration: parseFloat(format?.duration || "0"),
      codec: videoStream?.codec_name || "unknown",
      width: videoStream?.width || 0,
      height: videoStream?.height || 0,
      bitrate: parseInt(format?.bit_rate || "0"),
    };
  } catch (error: any) {
    throw new Error(`Failed to get video metadata: ${error.message}`);
  }
}

