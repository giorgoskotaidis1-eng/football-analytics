import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Generate AI Highlight - Analyzes match events and creates highlight moments
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Fetch match with events
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        slug: true,
        competition: true,
        date: true,
        scoreHome: true,
        scoreAway: true,
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

    // Analyze events to find highlight moments
    const highlights: Array<{
      minute: number;
      type: string;
      description: string;
      player?: string;
      team: string;
      xg?: number;
    }> = [];

    // Find goals
    const goals = match.events.filter(
      (e) => e.type === "shot" && e.outcome === "goal"
    );
    goals.forEach((goal) => {
      highlights.push({
        minute: goal.minute || 0,
        type: "goal",
        description: `Goal! ${goal.player?.name || "Unknown"} scores`,
        player: goal.player?.name,
        team: goal.team,
        xg: goal.xg || undefined,
      });
    });

    // Find high xG shots (missed opportunities)
    const highXGShots = match.events.filter(
      (e) => e.type === "shot" && e.xg && e.xg > 0.3 && e.outcome !== "goal"
    );
    highXGShots.forEach((shot) => {
      highlights.push({
        minute: shot.minute || 0,
        type: "chance",
        description: `Big chance! ${shot.player?.name || "Unknown"} (xG: ${shot.xg?.toFixed(2)})`,
        player: shot.player?.name,
        team: shot.team,
        xg: shot.xg || undefined,
      });
    });

    // Find key passes/assists
    const keyPasses = match.events.filter(
      (e) => e.type === "pass" && e.outcome === "successful"
    );
    // Group passes by minute and find assists (pass before goal)
    goals.forEach((goal) => {
      const assistPass = keyPasses.find(
        (p) => p.minute && goal.minute && p.minute <= goal.minute && p.minute >= goal.minute - 2 && p.team === goal.team
      );
      if (assistPass) {
        highlights.push({
          minute: assistPass.minute || 0,
          type: "assist",
          description: `Assist by ${assistPass.player?.name || "Unknown"}`,
          player: assistPass.player?.name,
          team: assistPass.team,
        });
      }
    });

    // Sort by minute
    highlights.sort((a, b) => a.minute - b.minute);

    // Generate highlight summary
    const summary = {
      match: `${homeTeamName} vs ${awayTeamName}`,
      date: match.date.toISOString(),
      score: match.scoreHome !== null && match.scoreAway !== null 
        ? `${match.scoreHome}-${match.scoreAway}` 
        : "TBD",
      highlights: highlights.slice(0, 10), // Top 10 highlights
      totalEvents: match.events.length,
      totalGoals: goals.length,
    };

    return NextResponse.json({
      ok: true,
      highlight: summary,
      message: "AI highlight generated successfully",
    });
  } catch (error) {
    console.error("[matches.highlight] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to generate highlight" },
      { status: 500 }
    );
  }
}


