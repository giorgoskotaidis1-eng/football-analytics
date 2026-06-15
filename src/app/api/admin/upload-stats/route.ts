import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// Upload player statistics via CSV
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin/coach
    const isAdmin = user.role === "Head coach" || user.role === "Head analyst" || user.role === "Admin";
    if (!isAdmin) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ ok: false, message: "No file provided" }, { status: 400 });
    }

    // Read file content
    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({ ok: false, message: "CSV file is empty or invalid" }, { status: 400 });
    }

    // Parse CSV header
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const playerIdIndex = header.findIndex((h) => h.includes("player") && h.includes("id"));
    const goalsIndex = header.findIndex((h) => h.includes("goal"));
    const assistsIndex = header.findIndex((h) => h.includes("assist"));
    const xgIndex = header.findIndex((h) => h.toLowerCase() === "xg");
    const xagIndex = header.findIndex((h) => h.toLowerCase() === "xag");
    const shotsPer90Index = header.findIndex((h) => h.toLowerCase().includes("shots") && h.includes("90"));
    const keyPassesPer90Index = header.findIndex((h) => h.toLowerCase().includes("key") && h.includes("pass"));
    const pressuresPer90Index = header.findIndex((h) => h.toLowerCase().includes("pressure"));
    const progressivePassesPer90Index = header.findIndex((h) => h.toLowerCase().includes("progressive"));
    const carriesIndex = header.findIndex((h) => h.toLowerCase().includes("carries"));
    const defensiveDuelsIndex = header.findIndex((h) => h.toLowerCase().includes("defensive") && h.includes("duel"));

    if (playerIdIndex === -1) {
      return NextResponse.json({ ok: false, message: "CSV must contain 'Player ID' column" }, { status: 400 });
    }

    let updated = 0;
    const errors: string[] = [];

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const playerId = parseInt(values[playerIdIndex]);

      if (isNaN(playerId)) {
        errors.push(`Row ${i + 1}: Invalid player ID`);
        continue;
      }

      // Verify player exists
      const player = await prisma.player.findUnique({
        where: { id: playerId },
      });

      if (!player) {
        errors.push(`Row ${i + 1}: Player ${playerId} not found`);
        continue;
      }

      // Parse values
      const goals = goalsIndex !== -1 ? parseFloat(values[goalsIndex]) || 0 : null;
      const assists = assistsIndex !== -1 ? parseFloat(values[assistsIndex]) || 0 : null;
      const xg = xgIndex !== -1 ? parseFloat(values[xgIndex]) || 0 : null;
      const xag = xagIndex !== -1 ? parseFloat(values[xagIndex]) || 0 : null;
      const shotsPer90 = shotsPer90Index !== -1 ? parseFloat(values[shotsPer90Index]) || 0 : null;
      const keyPassesPer90 = keyPassesPer90Index !== -1 ? parseFloat(values[keyPassesPer90Index]) || 0 : null;
      const pressuresPer90 = pressuresPer90Index !== -1 ? parseFloat(values[pressuresPer90Index]) || 0 : null;
      const progressivePassesPer90 = progressivePassesPer90Index !== -1 ? parseFloat(values[progressivePassesPer90Index]) || 0 : null;
      const carriesIntoFinalThirdPer90 = carriesIndex !== -1 ? parseFloat(values[carriesIndex]) || 0 : null;
      const defensiveDuelsWonPer90 = defensiveDuelsIndex !== -1 ? parseFloat(values[defensiveDuelsIndex]) || 0 : null;

      // Update player stats (only overwrite values provided by CSV columns)
      try {
        const data: {
          goals?: number;
          assists?: number;
          xg?: number;
          xag?: number;
          shotsPer90?: number;
          keyPassesPer90?: number;
          pressuresPer90?: number;
          progressivePassesPer90?: number;
          carriesIntoFinalThirdPer90?: number;
          defensiveDuelsWonPer90?: number;
          updatedAt: Date;
        } = {
          updatedAt: new Date(),
        };

        if (goals !== null) data.goals = goals;
        if (assists !== null) data.assists = assists;
        if (xg !== null) data.xg = xg;
        if (xag !== null) data.xag = xag;
        if (shotsPer90 !== null) data.shotsPer90 = shotsPer90;
        if (keyPassesPer90 !== null) data.keyPassesPer90 = keyPassesPer90;
        if (pressuresPer90 !== null) data.pressuresPer90 = pressuresPer90;
        if (progressivePassesPer90 !== null) data.progressivePassesPer90 = progressivePassesPer90;
        if (carriesIntoFinalThirdPer90 !== null) data.carriesIntoFinalThirdPer90 = carriesIntoFinalThirdPer90;
        if (defensiveDuelsWonPer90 !== null) data.defensiveDuelsWonPer90 = defensiveDuelsWonPer90;

        await prisma.player.update({
          where: { id: playerId },
          data,
        });
        updated++;
      } catch (error) {
        errors.push(`Row ${i + 1}: Failed to update player ${playerId}`);
      }
    }

    return NextResponse.json({
      ok: true,
      updated,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully updated ${updated} players${errors.length > 0 ? ` (${errors.length} errors)` : ""}`,
    });
  } catch (error) {
    console.error("[admin/upload-stats] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to upload statistics" },
      { status: 500 }
    );
  }
}





