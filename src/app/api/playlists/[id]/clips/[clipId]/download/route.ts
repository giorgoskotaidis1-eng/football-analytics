import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveFfmpegExecutablePath(rawPath: string | null): string | null {
  const candidates = new Set<string>();
  const exeName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";

  if (rawPath) {
    candidates.add(rawPath);
    const normalizedRoot = rawPath.replace(/^[/\\]ROOT[/\\]/i, "");
    if (normalizedRoot !== rawPath) {
      candidates.add(path.resolve(process.cwd(), normalizedRoot));
    }
  }

  candidates.add(path.resolve(process.cwd(), "node_modules", "ffmpeg-static", exeName));

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // ignore candidate-level fs errors and continue trying fallbacks
    }
  }

  return null;
}

function parsePositiveInt(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function resolveLocalMatchVideoPath(matchVideoPath: string): string | null {
  const trimmed = matchVideoPath.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return null;

  // Absolute local path
  if (path.isAbsolute(trimmed) || /^[A-Za-z]:[\\/]/.test(trimmed)) {
    const abs = path.resolve(trimmed);
    return fs.existsSync(abs) ? abs : null;
  }

  // Relative path -> map under uploads/
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  const relative = trimmed.replace(/^uploads[\\/]/i, "").replace(/\\/g, "/");
  const full = path.resolve(path.join(uploadsDir, relative));
  const relToBase = path.relative(uploadsDir, full);
  if (relToBase.startsWith("..") || path.isAbsolute(relToBase)) {
    return null;
  }
  return fs.existsSync(full) ? full : null;
}

async function runFfmpegCut(inputPath: string, outputPath: string, startSec: number, endSec: number) {
  const ffmpegPathRaw =
    typeof ffmpegPath === "string"
      ? ffmpegPath
      : (ffmpegPath as unknown as { default?: string } | null)?.default ?? null;
  const resolvedFfmpegPath = resolveFfmpegExecutablePath(ffmpegPathRaw);

  if (!resolvedFfmpegPath) {
    throw new Error("FFMPEG_NOT_AVAILABLE");
  }

  const args = [
    "-y",
    "-ss",
    String(startSec),
    "-to",
    String(endSec),
    "-i",
    inputPath,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    outputPath,
  ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(resolvedFfmpegPath, args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFMPEG_FAILED:${code}:${stderr.slice(-1000)}`));
      }
    });
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; clipId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id, clipId } = await params;
  const playlistId = parsePositiveInt(id);
  const parsedClipId = parsePositiveInt(clipId);
  if (!playlistId || !parsedClipId) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const clip = await prisma.playlistClip.findFirst({
    where: {
      id: parsedClipId,
      playlistId,
      playlist: { userId: user.id },
    },
    include: {
      match: {
        select: {
          id: true,
          slug: true,
          videoPath: true,
        },
      },
      playlist: {
        select: { name: true },
      },
    },
  });

  if (!clip) {
    return NextResponse.json({ ok: false, message: "Clip not found." }, { status: 404 });
  }

  if (!clip.match.videoPath) {
    return NextResponse.json(
      { ok: false, message: "Match video is not available for this clip." },
      { status: 400 }
    );
  }

  const sourcePath = resolveLocalMatchVideoPath(clip.match.videoPath);
  if (!sourcePath) {
    return NextResponse.json(
      { ok: false, message: "Local match video file was not found." },
      { status: 404 }
    );
  }

  const startSec = Math.max(0, Math.floor(clip.startSec));
  const endSec = Math.max(startSec + 1, Math.floor(clip.endSec));
  const duration = endSec - startSec;
  if (duration > 60 * 20) {
    return NextResponse.json(
      { ok: false, message: "Clip duration is too long to download as a single segment." },
      { status: 400 }
    );
  }

  const tempName = `playlist-clip-${clip.id}-${Date.now()}.mp4`;
  const tempPath = path.join(os.tmpdir(), tempName);

  try {
    await runFfmpegCut(sourcePath, tempPath, startSec, endSec);
    const data = await fs.promises.readFile(tempPath);
    const safePlaylistName = clip.playlist.name.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 40);
    const filename = `${safePlaylistName || "playlist"}-clip-${clip.id}.mp4`;

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(data.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const rawError = error instanceof Error ? error.message : String(error);
    const message =
      rawError === "FFMPEG_NOT_AVAILABLE"
        ? "FFmpeg is not available on this server."
        : "Failed to build clip download.";
    console.error("[playlist.clip.download] failed", {
      playlistId,
      clipId: parsedClipId,
      sourcePath,
      tempPath,
      rawError,
    });
    return NextResponse.json({ ok: false, message }, { status: 500 });
  } finally {
    fs.promises.unlink(tempPath).catch(() => {});
  }
}
