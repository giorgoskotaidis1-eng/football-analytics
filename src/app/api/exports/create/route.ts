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

    let data: any[] = [];
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

        if (match) {
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
        }
      } else {
        // Export all matches
        const matches = await prisma.match.findMany({
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
      // Export aggregated statistics
      const [matches, players, teams] = await Promise.all([
        prisma.match.findMany({
          include: { homeTeam: true, awayTeam: true },
        }),
        prisma.player.findMany({
          include: { team: true },
        }),
        prisma.team.findMany(),
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
      // Generate PDF using jsPDF
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text(filename.replace(/-/g, " ").toUpperCase(), 14, 20);
      
      // Add date
      doc.setFontSize(10);
      doc.text(`Exported: ${new Date().toLocaleDateString("en-GB")}`, 14, 28);
      
      // Prepare table data
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        const rows = data.map((row) => headers.map((header) => {
          const value = row[header];
          return value === null || value === undefined ? "" : String(value);
        }));

        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: 35,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [15, 23, 42], textColor: 255 },
        });
      } else {
        doc.text("No data available", 14, 40);
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

    const downloadUrl = `/exports/${finalFilename}.${fileExtension}`;

    return NextResponse.json({
      ok: true,
      downloadUrl,
      filename: `${finalFilename}.${fileExtension}`,
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

