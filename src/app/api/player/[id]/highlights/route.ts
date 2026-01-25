import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const playerId = parseInt(id);

    if (isNaN(playerId)) {
      return NextResponse.json({ ok: false, message: "Invalid player ID" }, { status: 400 });
    }

    // Get significant events (shots, goals, assists, tackles)
    const events = await prisma.matchEvent.findMany({
      where: {
        playerId,
        type: { in: ["shot", "tackle", "pass"] },
      },
      include: {
        match: {
          select: { id: true, date: true, competition: true, videoPath: true },
        },
      },
      orderBy: { minute: "asc" },
    });

    const autoHighlights = events
      .filter((e) => {
        // Only include significant events
        if (e.type === "shot") return true;
        if (e.type === "tackle") return true;
        if (e.type === "pass") {
          try {
            const metadata = e.metadata ? JSON.parse(e.metadata) : {};
            return metadata.assist === true || metadata.isAssist === true;
          } catch {
            return false;
          }
        }
        return false;
      })
      .map((event) => {
        let description = "";
        let outcome = "";
        
        try {
          const metadata = event.metadata ? JSON.parse(event.metadata) : {};
          
          if (event.type === "shot") {
            const outcomeStr = String(metadata.outcome || "").toLowerCase();
            if (outcomeStr === "goal") {
              description = `Γκολ ${event.minute || 0}'`;
              outcome = "Goal";
            } else if (outcomeStr === "saved" || outcomeStr === "ongoal") {
              description = `Σουτ στο τέρμα ${event.minute || 0}'`;
              outcome = "OnGoal";
            } else {
              description = `Σουτ ${event.minute || 0}'`;
              outcome = "Wide";
            }
          } else if (event.type === "tackle") {
            description = `Tackle ${event.minute || 0}'`;
            outcome = "Tackle";
          } else if (event.type === "pass") {
            description = `Assist ${event.minute || 0}'`;
            outcome = "Assist";
          }
        } catch {
          description = `${event.type} ${event.minute || 0}'`;
          outcome = event.type;
        }

        return {
          id: String(event.id),
          description,
          timestamp: (event.minute || 0) * 60,
          outcome,
          x: event.x || 0,
          y: event.y || 0,
          videoUrl: event.match.videoPath
            ? `/api/matches/${event.match.id}/video?t=${(event.minute || 0) * 60}`
            : undefined,
          matchId: event.match.id,
          matchDate: event.match.date.toISOString(),
          competition: event.match.competition,
        };
      });

    // Get manually curated highlights (from admin)
    let manualHighlights: Array<{
      id: string;
      description: string;
      timestamp: number;
      outcome: string;
      x: number;
      y: number;
      videoUrl?: string;
      matchId?: number;
      matchDate?: string;
      competition?: string;
      includeHeatmap?: boolean;
    }> = [];

    try {
      // Table may not exist yet – ignore errors here
      const rows = await prisma.$queryRawUnsafe<
        Array<{
          id: number;
          playerId: number;
          matchId: number;
          timestamp: number;
          description: string;
          outcome: string | null;
          includeHeatmap: number | null;
        }>
      >(
        `
        SELECT id, playerId, matchId, timestamp, description, outcome, includeHeatmap
        FROM PlayerHighlight
        WHERE playerId = ?
        ORDER BY createdAt DESC
      `,
        playerId,
      );

      manualHighlights =
        rows?.map((row) => ({
          id: `manual-${row.id}`,
          description: row.description,
          timestamp: row.timestamp ?? 0,
          outcome: row.outcome || "Highlight",
          x: 0,
          y: 0,
          videoUrl: `/api/matches/${row.matchId}/video?t=${row.timestamp ?? 0}`,
          matchId: row.matchId,
          matchDate: undefined,
          competition: undefined,
          includeHeatmap: row.includeHeatmap === 1,
        })) ?? [];
    } catch (err) {
      // If the table doesn't exist yet, just skip manual highlights
      console.warn("[player-highlights] Manual highlights table missing or query failed:", err);
    }

    const highlights = [...manualHighlights, ...autoHighlights];

    return NextResponse.json({
      ok: true,
      highlights,
    });
  } catch (error) {
    console.error("[player-highlights] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to fetch highlights" },
      { status: 500 }
    );
  }
}

