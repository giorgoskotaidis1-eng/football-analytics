import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  calculateTotalXG,
  calculatePossession,
  generateHeatmap,
  calculateShotStats,
  calculatePPDA,
  calculateHighRegains,
  calculateProgressivePasses,
  calculateXA,
  calculateRealXA,
  calculatePassAccuracy,
  type ShotEvent,
  type PassEvent,
  type TouchEvent,
} from "@/lib/analytics";

export const runtime = "nodejs";

// Simple in-memory cache for analytics
// In production, use Redis or similar
declare global {
  var analyticsCache: Map<string, { data: any; timestamp: number; eventCount: number }> | undefined;
}

const analyticsCache = typeof global !== "undefined" 
  ? (global.analyticsCache ||= new Map<string, { data: any; timestamp: number; eventCount: number }>())
  : new Map<string, { data: any; timestamp: number; eventCount: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds cache

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const matchId = parseInt(id);

  if (isNaN(matchId)) {
    return NextResponse.json({ ok: false, message: "Invalid match ID" }, { status: 400 });
  }

  // Get match
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
    },
  });

  if (!match) {
    return NextResponse.json({ ok: false, message: "Match not found" }, { status: 404 });
  }

  // Check cache first
  const cacheKey = `analytics-${matchId}`;
  const cached = analyticsCache.get(cacheKey);
  
  // Get event count for cache invalidation
  const eventCount = await prisma.matchEvent.count({ where: { matchId } });
  
  // Return cached data if available and events haven't changed
  if (cached && Date.now() - cached.timestamp < CACHE_TTL && cached.eventCount === eventCount) {
    return NextResponse.json({
      ok: true,
      analytics: cached.data,
      cached: true,
    });
  }

  // Get all events for this match - only select needed fields for better performance
  const events = await prisma.matchEvent.findMany({
    where: { matchId },
    select: {
      id: true,
      type: true,
      team: true,
      x: true,
      y: true,
      minute: true,
      xg: true,
      metadata: true,
      player: {
        select: { id: true, name: true },
      },
    },
    orderBy: { minute: "asc" },
  });

  // Separate events by type and team
  const homeShots: ShotEvent[] = [];
  const awayShots: ShotEvent[] = [];
  const homePasses: PassEvent[] = [];
  const awayPasses: PassEvent[] = [];
  const homeTouches: TouchEvent[] = [];
  const awayTouches: TouchEvent[] = [];
  const homeDefensiveActions: Array<{ x: number; y: number; minute?: number }> = [];
  const awayDefensiveActions: Array<{ x: number; y: number; minute?: number }> = [];
  const homeRecoveries: Array<{ x: number; y: number; minute?: number }> = [];
  const awayRecoveries: Array<{ x: number; y: number; minute?: number }> = [];

  events.forEach((event) => {
    const eventData = {
      x: event.x || 0,
      y: event.y || 0,
      minute: event.minute || undefined,
    };

    if (event.type === "shot") {
      // Filter shots with valid coords (not null, not NaN, in 0-100 range)
      const x = Number(event.x);
      const y = Number(event.y);
      if (
        event.x === null ||
        event.y === null ||
        isNaN(x) ||
        isNaN(y) ||
        x < 0 ||
        x > 100 ||
        y < 0 ||
        y > 100
      ) {
        // Skip shots without valid coords
        return;
      }

      try {
        const metadata = event.metadata ? JSON.parse(event.metadata) : {};
        // Normalize outcome
        let outcome = "off_target";
        if (metadata && typeof metadata === "object" && metadata.outcome) {
          const metaOutcome = String(metadata.outcome).toLowerCase();
          if (metaOutcome === "goal") outcome = "goal";
          else if (metaOutcome === "saved") outcome = "saved";
          else if (metaOutcome === "blocked") outcome = "blocked";
          else outcome = "off_target";
        }

        const shot: ShotEvent = {
          x: Math.max(0, Math.min(100, x)),
          y: Math.max(0, Math.min(100, y)),
          minute: event.minute || undefined,
          xg: event.xg !== null && !isNaN(Number(event.xg)) ? Number(event.xg) : undefined,
          shotType: metadata.shotType,
          bodyPart: metadata.bodyPart,
          outcome,
        };

        if (event.team === "home") {
          homeShots.push(shot);
        } else if (event.team === "away") {
          awayShots.push(shot);
        }
      } catch {
        // Invalid JSON, skip this shot
      }
    } else if (event.type === "pass") {
      try {
        const metadata = event.metadata ? JSON.parse(event.metadata) : {};
        const pass: PassEvent = {
          ...eventData,
          successful: metadata.successful !== false,
          endX: metadata.endX !== null && metadata.endX !== undefined && !isNaN(Number(metadata.endX)) 
            ? Number(metadata.endX) 
            : undefined,
          endY: metadata.endY !== null && metadata.endY !== undefined && !isNaN(Number(metadata.endY)) 
            ? Number(metadata.endY) 
            : undefined,
          receiverId: metadata.receiverId !== null && metadata.receiverId !== undefined && !isNaN(Number(metadata.receiverId)) 
            ? Number(metadata.receiverId) 
            : undefined,
          playerId: event.player?.id || undefined,
          timestamp: metadata.timestamp !== null && metadata.timestamp !== undefined && !isNaN(Number(metadata.timestamp))
            ? Number(metadata.timestamp) 
            : (event.minute !== null && !isNaN(Number(event.minute)) ? Number(event.minute) * 60 : undefined),
          eventId: event.id,
          assistId: metadata.assistId !== null && metadata.assistId !== undefined && !isNaN(Number(metadata.assistId))
            ? Number(metadata.assistId)
            : undefined,
          possessionId: metadata.possessionId !== null && metadata.possessionId !== undefined
            ? String(metadata.possessionId)
            : undefined,
        };

        if (event.team === "home") {
          homePasses.push(pass);
        } else {
          awayPasses.push(pass);
        }
      } catch {
        // Invalid JSON, skip this pass
      }
    } else if (event.type === "touch") {
      if (event.team === "home") {
        homeTouches.push(eventData);
      } else {
        awayTouches.push(eventData);
      }
    } else if (event.type === "tackle" || event.type === "interception") {
      // Defensive actions
      if (event.team === "home") {
        homeDefensiveActions.push(eventData);
      } else {
        awayDefensiveActions.push(eventData);
      }
    } else if (event.type === "recovery") {
      // Ball recoveries
      if (event.team === "home") {
        homeRecoveries.push(eventData);
      } else {
        awayRecoveries.push(eventData);
      }
    }
  });

  // Calculate analytics
  const homeXG = calculateTotalXG(homeShots);
  const awayXG = calculateTotalXG(awayShots);

  const possession = calculatePossession(
    [...homePasses, ...homeTouches],
    [...awayPasses, ...awayTouches]
  );

  const homeShotStats = calculateShotStats(homeShots);
  const awayShotStats = calculateShotStats(awayShots);

  // Advanced metrics
  const homePPDA = calculatePPDA(awayPasses, homeDefensiveActions.length);
  const awayPPDA = calculatePPDA(homePasses, awayDefensiveActions.length);
  
  const homeHighRegains = calculateHighRegains(homeRecoveries, true);
  const awayHighRegains = calculateHighRegains(awayRecoveries, false);
  
  // Calculate real progressive passes (with endX/endY from metadata)
  const homeProgressivePasses = calculateProgressivePasses(homePasses, true);
  const awayProgressivePasses = calculateProgressivePasses(awayPasses, false);
  
  // Calculate real xA (pass → shot links)
  const homeXAResult = calculateRealXA(homePasses, homeShots, true);
  const awayXAResult = calculateRealXA(awayPasses, awayShots, false);
  const homeXA = homeXAResult.totalXA;
  const awayXA = awayXAResult.totalXA;
  
  const homePassAccuracy = calculatePassAccuracy(homePasses);
  const awayPassAccuracy = calculatePassAccuracy(awayPasses);

  // Generate heatmaps from ALL spatial events (touches, passes, pressures, carries)
  // Include all events with valid coords, not just passes/touches
  // Weight=1 for most events (keep homogeneity), small boost for pressures (1.1)
  const allHomeEvents = [
    ...homePasses.map(e => ({ x: e.x, y: e.y, weight: 1 })),
    ...homeTouches.map(e => ({ x: e.x, y: e.y, weight: 1 })),
    ...homeDefensiveActions.map(e => ({ x: e.x, y: e.y, weight: 1.1 })), // Pressures/tackles: slight boost
    ...homeRecoveries.map(e => ({ x: e.x, y: e.y, weight: 1 })), // Recoveries: weight=1
  ].filter(
    (e) => {
      // Validate: x,y must be in [0,1] or [0,100] normalized range
      const x = Number(e.x);
      const y = Number(e.y);
      return e.x !== null && e.y !== null && 
             !isNaN(x) && !isNaN(y) && 
             x >= 0 && x <= 100 && 
             y >= 0 && y <= 100;
    }
  );
  
  const allAwayEvents = [
    ...awayPasses.map(e => ({ x: e.x, y: e.y, weight: 1 })),
    ...awayTouches.map(e => ({ x: e.x, y: e.y, weight: 1 })),
    ...awayDefensiveActions.map(e => ({ x: e.x, y: e.y, weight: 1.1 })), // Pressures/tackles: slight boost
    ...awayRecoveries.map(e => ({ x: e.x, y: e.y, weight: 1 })), // Recoveries: weight=1
  ].filter(
    (e) => {
      const x = Number(e.x);
      const y = Number(e.y);
      return e.x !== null && e.y !== null && 
             !isNaN(x) && !isNaN(y) && 
             x >= 0 && x <= 100 && 
             y >= 0 && y <= 100;
    }
  );
  
  // Generate heatmaps with 80×52 grid (matching 105m×68m pitch ratio)
  const homeHeatmap = generateHeatmap(allHomeEvents, 80, 52);
  const awayHeatmap = generateHeatmap(allAwayEvents, 80, 52);

  // Shot map (just shots - separate overlay, already filtered for valid coords)
  // Convert shots to events format for generateHeatmap
  const homeShotEvents = homeShots
    .filter(s => {
      const x = Number(s.x);
      const y = Number(s.y);
      return s.x !== null && s.y !== null && 
             !isNaN(x) && !isNaN(y) && 
             x >= 0 && x <= 100 && 
             y >= 0 && y <= 100;
    })
    .map(s => ({ x: s.x, y: s.y, weight: 1 }));
  
  const awayShotEvents = awayShots
    .filter(s => {
      const x = Number(s.x);
      const y = Number(s.y);
      return s.x !== null && s.y !== null && 
             !isNaN(x) && !isNaN(y) && 
             x >= 0 && x <= 100 && 
             y >= 0 && y <= 100;
    })
    .map(s => ({ x: s.x, y: s.y, weight: 1 }));
  
  const homeShotMap = generateHeatmap(homeShotEvents, 80, 52);
  const awayShotMap = generateHeatmap(awayShotEvents, 80, 52);

  const analyticsData = {
    xg: {
      home: Math.round(homeXG * 100) / 100,
      away: Math.round(awayXG * 100) / 100,
    },
    possession: {
      home: possession.home,
      away: possession.away,
    },
    shots: {
      home: homeShotStats,
      away: awayShotStats,
    },
    heatmaps: {
      home: homeHeatmap || [],
      away: awayHeatmap || [],
    },
    shotMaps: {
      home: homeShotMap || [],
      away: awayShotMap || [],
    },
    events: {
      total: events.length,
      byType: {
        shots: events.filter(e => e.type === "shot").length,
        passes: events.filter(e => e.type === "pass").length,
        touches: events.filter(e => e.type === "touch").length,
      },
      passesHomeSuccess: homePasses.filter(p => p.successful !== false).length,
      passesAwaySuccess: awayPasses.filter(p => p.successful !== false).length,
      touchesHome: homeTouches.length,
      touchesAway: awayTouches.length,
    },
    // Advanced professional metrics
    ppda: {
      home: homePPDA,
      away: awayPPDA,
    },
    highRegains: {
      home: homeHighRegains,
      away: awayHighRegains,
    },
    progressivePasses: {
      home: homeProgressivePasses,
      away: awayProgressivePasses,
    },
    xa: {
      home: homeXA,
      away: awayXA,
    },
    passAccuracy: {
      home: homePassAccuracy,
      away: awayPassAccuracy,
    },
  };

  // Cache the result
  analyticsCache.set(cacheKey, {
    data: analyticsData,
    timestamp: Date.now(),
    eventCount,
  });

  // Clean up old cache entries (keep only last 50)
  if (analyticsCache.size > 50) {
    const entries = Array.from(analyticsCache.entries());
    entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
    analyticsCache.clear();
    entries.slice(0, 50).forEach(([key, value]) => {
      analyticsCache.set(key, value);
    });
  }

  return NextResponse.json({
    ok: true,
    analytics: analyticsData,
  });
}
