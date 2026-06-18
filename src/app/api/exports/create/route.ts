import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get("source") || "matches";
    const format = searchParams.get("format") || "csv";
    const matchId = searchParams.get("matchId");

    // Get user's team IDs to filter
    const userTeams = await prisma.userTeam.findMany({
      where: { userId: user.id, status: "active" },
      select: { teamId: true },
    });
    
    const createdTeams = await prisma.team.findMany({
      where: { createdById: user.id },
      select: { id: true },
    });
    
    const userTeamIds = [
      ...userTeams.map((ut) => ut.teamId),
      ...createdTeams.map((t) => t.id),
    ];

    if (userTeamIds.length === 0) {
      return NextResponse.json({ ok: false, message: "No teams found. Create a team first." }, { status: 400 });
    }

    let data: Array<Record<string, unknown>> = [];
    let filename = "";

    if (source === "matches") {
      if (matchId) {
        // Export single match events
        const match = await prisma.match.findUnique({
          where: { id: parseInt(matchId) },
          include: {
            homeTeam: true,
            awayTeam: true,
            events: {
              include: { player: true },
            },
          },
        });

        if (!match) {
          return NextResponse.json({ ok: false, message: "Match not found" }, { status: 404 });
        }

        // Verify user has access to this match
        const hasAccess = (match.homeTeamId && userTeamIds.includes(match.homeTeamId)) ||
                         (match.awayTeamId && userTeamIds.includes(match.awayTeamId));
        
        if (!hasAccess) {
          return NextResponse.json({ ok: false, message: "You don't have access to this match" }, { status: 403 });
        }

        data = match.events.map((event) => ({
          minute: event.minute,
          type: event.type,
          player: event.player?.name || "Unknown",
          team: event.team,
          x: event.x,
          y: event.y,
          xg: event.xg,
          metadata: event.metadata,
        }));
        filename = `match-${matchId}-events`;
      } else {
        // Export all matches from user's teams
        const matches = await prisma.match.findMany({
          where: {
            OR: [
              { homeTeamId: { in: userTeamIds } },
              { awayTeamId: { in: userTeamIds } },
            ],
          },
          include: {
            homeTeam: true,
            awayTeam: true,
          },
          orderBy: { date: "desc" },
        });
        data = matches.map((match) => ({
          id: match.id,
          date: new Date(match.date).toLocaleDateString("en-GB"),
          competition: match.competition,
          venue: match.venue || "",
          homeTeam: match.homeTeam?.name || "Unknown",
          awayTeam: match.awayTeam?.name || "Unknown",
          scoreHome: match.scoreHome ?? "",
          scoreAway: match.scoreAway ?? "",
          xgHome: match.xgHome ?? "",
          xgAway: match.xgAway ?? "",
        }));
        filename = "all-matches";
      }
    } else if (source === "players") {
      const players = await prisma.player.findMany({
        where: {
          teamId: { in: userTeamIds },
        },
        include: { team: true },
        orderBy: { name: "asc" },
      });
      data = players.map((player) => ({
        id: player.id,
        name: player.name,
        position: player.position,
        age: player.age ?? "",
        club: player.club || "",
        nationality: player.nationality || "",
        team: player.team?.name || "No team",
        goals: player.goals ?? 0,
        assists: player.assists ?? 0,
        xg: player.xg ?? 0,
        xag: player.xag ?? 0,
      }));
      filename = "all-players";
    } else if (source === "statistics") {
      // Export aggregated statistics - only from user's teams
      const [matches, players, teams] = await Promise.all([
        prisma.match.findMany({
          where: {
            OR: [
              { homeTeamId: { in: userTeamIds } },
              { awayTeamId: { in: userTeamIds } },
            ],
          },
          include: { homeTeam: true, awayTeam: true },
        }),
        prisma.player.findMany({
          where: {
            teamId: { in: userTeamIds },
          },
          include: { team: true },
        }),
        prisma.team.findMany({
          where: {
            id: { in: userTeamIds },
          },
        }),
      ]);

      // Calculate statistics
      const totalMatches = matches.length;
      const totalPlayers = players.length;
      const totalTeams = teams.length;
      const totalGoals = matches.reduce((sum, m) => sum + (m.scoreHome ?? 0) + (m.scoreAway ?? 0), 0);
      const totalXG = matches.reduce((sum, m) => sum + (m.xgHome ?? 0) + (m.xgAway ?? 0), 0);
      
      data = [
        { metric: "Total Matches", value: totalMatches },
        { metric: "Total Players", value: totalPlayers },
        { metric: "Total Teams", value: totalTeams },
        { metric: "Total Goals", value: totalGoals },
        { metric: "Total xG", value: totalXG.toFixed(2) },
        { metric: "Average Goals per Match", value: totalMatches > 0 ? (totalGoals / totalMatches).toFixed(2) : 0 },
        { metric: "Average xG per Match", value: totalMatches > 0 ? (totalXG / totalMatches).toFixed(2) : 0 },
      ];
      filename = "statistics-summary";
    } else if (source === "squad") {
      const players = await prisma.player.findMany({
        where: {
          teamId: { in: userTeamIds },
        },
        include: { team: true },
      });
      data = players.map((player) => ({
        name: player.name,
        position: player.position,
        age: player.age,
        club: player.club,
        nationality: player.nationality,
        team: player.team?.name || "No team",
      }));
      filename = "squad-metrics";
    }

    if (data.length === 0) {
      return NextResponse.json({ ok: false, message: "No data to export" }, { status: 400 });
    }

    // Create exports directory
    const exportsDir = join(process.cwd(), "public", "exports");
    if (!existsSync(exportsDir)) {
      await mkdir(exportsDir, { recursive: true });
    }

    let fileContent: string | Buffer;
    let fileExtension: string;
    const timestamp = Date.now();
    const finalFilename = `${filename}-${timestamp}`;

    if (format === "csv") {
      fileContent = Papa.unparse(data);
      fileExtension = "csv";
    } else if (format === "json") {
      fileContent = JSON.stringify(data, null, 2);
      fileExtension = "json";
    } else if (format === "pdf") {
      // Generate a polished landscape PDF
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 12;

      // ----- Header band -----
      const accentColor: [number, number, number] = [16, 185, 129]; // emerald
      const ink: [number, number, number] = [15, 23, 42]; // slate-900
      const muted: [number, number, number] = [100, 116, 139]; // slate-500

      doc.setFillColor(...accentColor);
      doc.rect(0, 0, pageWidth, 4, "F");

      doc.setFillColor(245, 247, 250);
      doc.rect(0, 4, pageWidth, 22, "F");

      // Brand mark
      doc.setFillColor(...accentColor);
      doc.circle(marginX + 4, 15, 4, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("S", marginX + 2.5, 16.5);

      // Title and meta
      const prettyTitle = filename.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      doc.setTextColor(...ink);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(prettyTitle, marginX + 14, 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...muted);
      const exportedAt = new Date();
      doc.text(
        `Exported ${exportedAt.toLocaleDateString("en-GB")} ${exportedAt.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })}  ·  ${data.length} row${data.length === 1 ? "" : "s"}  ·  Source: ${source}`,
        marginX + 14,
        20
      );

      // Right-aligned product label
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...ink);
      doc.text("Football Analytics", pageWidth - marginX, 14, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...muted);
      doc.text("Generated report", pageWidth - marginX, 19, { align: "right" });

      // Divider line under header
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginX, 28, pageWidth - marginX, 28);

      // ----- Table -----
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        const formatHeader = (h: string) =>
          h
            .replace(/([A-Z])/g, " $1")
            .replace(/[_-]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())
            .trim();

        const rows = data.map((row) =>
          headers.map((header) => {
            const value = row[header];
            if (value === null || value === undefined || value === "") return "—";
            if (typeof value === "number") {
              return Number.isInteger(value) ? value.toString() : value.toFixed(2);
            }
            return String(value);
          })
        );

        // Heuristic: numeric columns get right-aligned narrow widths
        const numericCols = new Set<number>();
        headers.forEach((h, idx) => {
          let isNumeric = true;
          for (let i = 0; i < Math.min(data.length, 20); i += 1) {
            const v = data[i][h];
            if (v === null || v === undefined || v === "") continue;
            if (typeof v !== "number" && Number.isNaN(Number(v))) {
              isNumeric = false;
              break;
            }
          }
          if (isNumeric) numericCols.add(idx);
        });

        const columnStyles: Record<number, { halign?: "left" | "center" | "right"; cellWidth?: number }> = {};
        headers.forEach((_, idx) => {
          if (numericCols.has(idx)) {
            columnStyles[idx] = { halign: "right", cellWidth: 18 };
          }
        });

        autoTable(doc, {
          head: [headers.map(formatHeader)],
          body: rows,
          startY: 32,
          margin: { left: marginX, right: marginX, bottom: 16 },
          theme: "grid",
          styles: {
            fontSize: 8,
            cellPadding: { top: 2.4, right: 3, bottom: 2.4, left: 3 },
            lineColor: [226, 232, 240],
            lineWidth: 0.1,
            textColor: ink,
            valign: "middle",
            overflow: "linebreak",
          },
          headStyles: {
            fillColor: ink,
            textColor: 255,
            fontStyle: "bold",
            fontSize: 8.5,
            halign: "left",
            cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
          columnStyles,
          didDrawPage: () => {
            // Footer with page number + brand
            const pageCount = doc.getNumberOfPages();
            const currentPage = doc.getCurrentPageInfo().pageNumber;
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(marginX, pageHeight - 10, pageWidth - marginX, pageHeight - 10);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(...muted);
            doc.text("Football Analytics  ·  Confidential", marginX, pageHeight - 5);
            doc.text(`Page ${currentPage} / ${pageCount}`, pageWidth - marginX, pageHeight - 5, {
              align: "right",
            });
          },
        });
      } else {
        doc.setFontSize(10);
        doc.setTextColor(...muted);
        doc.text("No data available for the selected scope.", marginX, 42);
      }

      // Convert PDF to buffer
      fileContent = Buffer.from(doc.output("arraybuffer"));
      fileExtension = "pdf";
    } else {
      return NextResponse.json({ ok: false, message: "Unsupported format" }, { status: 400 });
    }

    const filepath = join(exportsDir, `${finalFilename}.${fileExtension}`);

    if (format === "pdf") {
      await writeFile(filepath, fileContent);
    } else {
      await writeFile(filepath, fileContent, "utf-8");
    }

    const downloadKey = `${finalFilename}.${fileExtension}`;
    const downloadUrl = `/exports/${downloadKey}`;
    const fileSize =
      fileContent instanceof Buffer ? fileContent.length : Buffer.byteLength(fileContent);

    const scopeLabel = matchId
      ? `Match #${matchId} (${data.length} rows)`
      : `${source} (${data.length} rows)`;

    let createdRecord = null as null | { id: number; createdAt: Date };
    try {
      createdRecord = await prisma.dataExport.create({
        data: {
          userId: user.id,
          source,
          format,
          scopeLabel,
          status: "ready",
          downloadKey,
          fileSize,
          completedAt: new Date(),
        },
        select: { id: true, createdAt: true },
      });
    } catch (persistError) {
      console.warn("[exports.create] Failed to persist DataExport metadata:", persistError);
    }

    return NextResponse.json({
      ok: true,
      downloadUrl,
      filename: downloadKey,
      export: createdRecord
        ? {
            id: createdRecord.id,
            source,
            format,
            scopeLabel,
            status: "ready",
            downloadKey,
            fileSize,
            createdAt: createdRecord.createdAt,
          }
        : null,
      message: "Export created successfully",
    });
  } catch (error) {
    console.error("[exports.create] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to create export" },
      { status: 500 }
    );
  }
}

