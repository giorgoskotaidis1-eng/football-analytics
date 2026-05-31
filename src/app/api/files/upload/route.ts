import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const runtime = "nodejs";

const ALLOWED_CATEGORIES = new Set(["report", "schedule", "data", "other"]);

function normalizeCategory(raw: string | null | undefined): string {
  if (!raw) return "other";
  const v = raw.trim().toLowerCase();
  return ALLOWED_CATEGORIES.has(v) ? v : "other";
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/csv",
  "application/json",
];

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const fileType = (formData.get("type") as string) || "other";
    const fileName = (formData.get("name") as string) || null;

    if (!file) {
      return NextResponse.json({ ok: false, message: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { ok: false, message: "Invalid file type. Only PDF, DOCX, XLSX, CSV, and JSON are allowed." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, message: "File too large. Maximum size is 50MB." },
        { status: 400 }
      );
    }

    // Create per-user uploads directory if it doesn't exist
    const userDir = join(process.cwd(), "public", "uploads", "files", String(user.id));
    if (!existsSync(userDir)) {
      await mkdir(userDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "file";
    const baseName = (fileName || file.name.replace(/\.[^/.]+$/, "")).replace(/[^a-zA-Z0-9_-]+/g, "-");
    const filename = `${baseName}-${timestamp}.${extension}`;
    const filepath = join(userDir, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Persist metadata to DB
    const storageKey = `files/${user.id}/${filename}`;
    const publicUrl = `/uploads/${storageKey}`;
    const category = normalizeCategory(fileType);

    const record = await prisma.uploadedFile.create({
      data: {
        userId: user.id,
        name: baseName || file.name,
        originalName: file.name,
        storageKey,
        mimeType: file.type,
        size: file.size,
        category,
      },
    });

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      filename,
      file: {
        id: record.id,
        name: record.name,
        originalName: record.originalName,
        mimeType: record.mimeType,
        size: record.size,
        category: record.category,
        storageKey: record.storageKey,
        url: publicUrl,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error("[files.upload] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to upload file" },
      { status: 500 }
    );
  }
}

