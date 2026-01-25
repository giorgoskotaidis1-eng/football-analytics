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

    const searchParams = request.nextUrl.searchParams;
    const eventType = searchParams.get("type") || "all"; // "all", "shot", "pass", "touch"

    // Get all events for this player
    const where: any = { playerId };
    if (eventType !== "all") {
      where.type = eventType;
    }

    const events = await prisma.matchEvent.findMany({
      where,
      select: {
        x: true,
        y: true,
        type: true,
      },
    });

    // Filter valid coordinates
    const validEvents = events.filter(
      (e) => e.x !== null && e.y !== null && !isNaN(Number(e.x)) && !isNaN(Number(e.y))
    );

    // Group by type for different heatmaps
    const heatmapData = {
      all: validEvents.map((e) => ({ x: e.x!, y: e.y! })),
      shots: validEvents.filter((e) => e.type === "shot").map((e) => ({ x: e.x!, y: e.y! })),
      passes: validEvents.filter((e) => e.type === "pass").map((e) => ({ x: e.x!, y: e.y! })),
      touches: validEvents.filter((e) => e.type === "touch").map((e) => ({ x: e.x!, y: e.y! })),
    };

    return NextResponse.json({
      ok: true,
      heatmap: heatmapData[eventType as keyof typeof heatmapData] || heatmapData.all,
      totalEvents: validEvents.length,
    });
  } catch (error) {
    console.error("[player-heatmap] Error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to fetch heatmap" },
      { status: 500 }
    );
  }
}





