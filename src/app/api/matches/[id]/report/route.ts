import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";

export const runtime = "nodejs";

// Generate PDF Match Report
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const matchId = parseInt(id);
    
    if (isNaN(matchId)) {
      return NextResponse.json({ ok: false, message: "Invalid match ID" }, { status: 400 });
    }

    // Fetch match with all related data
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        slug: true,
        competition: true,
        venue: true,
        date: true,
        scoreHome: true,
        scoreAway: true,
        xgHome: true,
        xgAway: true,
        shotsHome: true,
        shotsAway: true,
        homeTeamId: true,
        awayTeamId: true,
        homeTeamName: true,
        awayTeamName: true,
        homeTeam: {
          select: { id: true, name: true },
        },
        awayTeam: {
          select: { id: true, name: true },
        },
        events: {
          include: { player: true },
          orderBy: { minute: "asc" },
        },
      },
    });

    if (!match) {
      return NextResponse.json({ ok: false, message: "Match not found" }, { status: 404 });
    }

    // Helper function to get team name
    const getTeamName = (team: { name: string } | null, teamName: string | null | undefined): string => {
      if (team?.name) return team.name;
      if (teamName) return teamName;
      return "Unknown";
    };

    const homeTeamName = getTeamName(match.homeTeam, (match as any).homeTeamName);
    const awayTeamName = getTeamName(match.awayTeam, (match as any).awayTeamName);

    // Fetch analytics directly from database
    const events = match.events;
    const analytics = {
      xg: {
        home: events.filter(e => e.team === "home" && e.type === "shot").reduce((sum, e) => sum + (e.xg || 0), 0),
        away: events.filter(e => e.team === "away" && e.type === "shot").reduce((sum, e) => sum + (e.xg || 0), 0),
      },
      possession: {
        home: events.filter(e => e.team === "home").length / (events.length || 1) * 100,
        away: events.filter(e => e.team === "away").length / (events.length || 1) * 100,
      },
      shots: {
        home: {
          total: events.filter(e => e.team === "home" && e.type === "shot").length,
          onTarget: events.filter(e => e.team === "home" && e.type === "shot" && e.outcome === "on_target").length,
          goals: events.filter(e => e.team === "home" && e.type === "shot" && e.outcome === "goal").length,
        },
        away: {
          total: events.filter(e => e.team === "away" && e.type === "shot").length,
          onTarget: events.filter(e => e.team === "away" && e.type === "shot" && e.outcome === "on_target").length,
          goals: events.filter(e => e.team === "away" && e.type === "shot" && e.outcome === "goal").length,
        },
      },
    };

    // Generate HTML report
    const reportHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Match Report - ${homeTeamName} vs ${awayTeamName}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      background: #0f172a;
      color: #e2e8f0;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding: 20px;
      background: #1e293b;
      border-radius: 8px;
    }
    .match-title {
      font-size: 24px;
      font-weight: bold;
      color: #10b981;
      margin-bottom: 10px;
    }
    .match-info {
      color: #94a3b8;
      font-size: 14px;
    }
    .score {
      font-size: 32px;
      font-weight: bold;
      color: #10b981;
      margin: 20px 0;
    }
    .section {
      margin: 30px 0;
      padding: 20px;
      background: #1e293b;
      border-radius: 8px;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #10b981;
      margin-bottom: 15px;
      border-bottom: 2px solid #10b981;
      padding-bottom: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #334155;
    }
    th {
      background: #0f172a;
      color: #10b981;
      font-weight: bold;
    }
    .stat-box {
      display: inline-block;
      padding: 15px;
      margin: 10px;
      background: #0f172a;
      border-radius: 6px;
      border: 1px solid #334155;
      min-width: 150px;
    }
    .stat-label {
      font-size: 12px;
      color: #94a3b8;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 20px;
      font-weight: bold;
      color: #10b981;
    }
    .event-item {
      padding: 8px;
      margin: 5px 0;
      background: #0f172a;
      border-left: 3px solid #10b981;
      border-radius: 4px;
    }
    .event-minute {
      font-weight: bold;
      color: #10b981;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="match-title">${homeTeamName} vs ${awayTeamName}</div>
    <div class="match-info">
      ${new Date(match.date).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} • ${match.competition}
    </div>
    ${match.scoreHome !== null && match.scoreAway !== null ? `
      <div class="score">${match.scoreHome} - ${match.scoreAway}</div>
    ` : ""}
  </div>

  ${analytics ? `
  <div class="section">
    <div class="section-title">Match Statistics</div>
    <div style="display: flex; flex-wrap: wrap; justify-content: center;">
      <div class="stat-box">
        <div class="stat-label">xG</div>
        <div class="stat-value">${analytics.xg?.home?.toFixed(2) || "0.00"} - ${analytics.xg?.away?.toFixed(2) || "0.00"}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Possession</div>
        <div class="stat-value">${analytics.possession?.home?.toFixed(1) || "0"}% - ${analytics.possession?.away?.toFixed(1) || "0"}%</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Total Shots</div>
        <div class="stat-value">${analytics.shots?.home?.total || 0} - ${analytics.shots?.away?.total || 0}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Shots on Target</div>
        <div class="stat-value">${analytics.shots?.home?.onTarget || 0} - ${analytics.shots?.away?.onTarget || 0}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Goals</div>
        <div class="stat-value">${analytics.shots?.home?.goals || 0} - ${analytics.shots?.away?.goals || 0}</div>
      </div>
    </div>
  </div>
  ` : ""}

  <div class="section">
    <div class="section-title">Match Events</div>
    ${match.events.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Minute</th>
            <th>Type</th>
            <th>Player</th>
            <th>Team</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${match.events.map((event) => `
            <tr>
              <td class="event-minute">${event.minute || "N/A"}'</td>
              <td>${event.type}</td>
              <td>${event.player?.name || "N/A"}</td>
              <td>${event.team === "home" ? homeTeamName : awayTeamName}</td>
              <td>
                ${event.xg ? `xG: ${event.xg.toFixed(2)}` : ""}
                ${event.outcome ? ` • ${event.outcome}` : ""}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    ` : "<p>No events recorded for this match.</p>"}
  </div>

  <div class="section">
    <div class="section-title">Key Moments</div>
    ${match.events
      .filter((e) => e.type === "shot" && (e.outcome === "goal" || (e.xg && e.xg > 0.3)))
      .map((event) => `
        <div class="event-item">
          <span class="event-minute">${event.minute || "N/A"}'</span> - 
          ${event.outcome === "goal" ? "⚽ GOAL!" : "🎯 Big Chance"} - 
          ${event.player?.name || "Unknown"} 
          ${event.xg ? `(xG: ${event.xg.toFixed(2)})` : ""}
        </div>
      `).join("") || "<p>No key moments recorded.</p>"}
  </div>

  <div style="margin-top: 40px; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
    Generated by Football Analytics Platform<br>
    ${new Date().toLocaleString()}
  </div>
</body>
</html>
    `;

    // Save HTML report
    const reportsDir = join(process.cwd(), "public", "reports");
    if (!existsSync(reportsDir)) {
      await mkdir(reportsDir, { recursive: true });
    }

    const filename = `match-report-${matchId}-${Date.now()}.html`;
    const filepath = join(reportsDir, filename);
    await writeFile(filepath, reportHTML, "utf-8");

    const downloadUrl = `/reports/${filename}`;

    return NextResponse.json({
      ok: true,
      downloadUrl,
      filename,
      message: "Match report generated successfully",
    });
  } catch (error) {
    console.error("[matches.report] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to generate report" },
      { status: 500 }
    );
  }
}

