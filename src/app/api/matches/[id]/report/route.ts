import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const isPrintMode = request.nextUrl.searchParams.get("print") === "1";
    const autoPrint = request.nextUrl.searchParams.get("autoprint") === "1";
    const { id } = await params;
    const matchId = /^\d+$/.test(id)
      ? Number(id)
      : (await prisma.match.findUnique({ where: { slug: id }, select: { id: true } }))?.id;
    if (!matchId) {
      return NextResponse.json({ ok: false, message: "Invalid match ID" }, { status: 400 });
    }

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
        lineups: {
          include: {
            team: { select: { id: true, name: true } },
          },
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

    const getTeamName = (team: { name: string } | null, teamName: string | null | undefined): string => {
      if (team?.name) return team.name;
      if (teamName) return teamName;
      return "Unknown";
    };

    const homeTeamName = getTeamName(match.homeTeam, (match as any).homeTeamName);
    const awayTeamName = getTeamName(match.awayTeam, (match as any).awayTeamName);

    const events = match.events;
    const parseMetadata = (metadata: string | null): Record<string, any> => {
      if (!metadata) return {};
      try {
        return JSON.parse(metadata) as Record<string, any>;
      } catch {
        return {};
      }
    };
    const getOutcome = (event: any): string | null => {
      const meta = parseMetadata(event.metadata);
      return (meta.outcome as string) || null;
    };
    const asNum = (v: unknown): number | null => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);
    const byTeam = (team: "home" | "away") => events.filter((e) => e.team === team);
    const homeEvents = byTeam("home");
    const awayEvents = byTeam("away");
    const homeShots = homeEvents.filter((e) => e.type === "shot");
    const awayShots = awayEvents.filter((e) => e.type === "shot");
    const passesHome = homeEvents.filter((e) => e.type === "pass");
    const passesAway = awayEvents.filter((e) => e.type === "pass");
    const carriesHome = homeEvents.filter((e) => e.type === "carry" || e.type === "dribble");
    const carriesAway = awayEvents.filter((e) => e.type === "carry" || e.type === "dribble");

    const homeShotsOnTarget = homeShots.filter((e) => {
      const outcome = getOutcome(e);
      return outcome === "on_target" || outcome === "saved" || outcome === "goal";
    });
    const awayShotsOnTarget = awayShots.filter((e) => {
      const outcome = getOutcome(e);
      return outcome === "on_target" || outcome === "saved" || outcome === "goal";
    });
    const homeGoals = homeShots.filter((e) => getOutcome(e) === "goal");
    const awayGoals = awayShots.filter((e) => getOutcome(e) === "goal");

    // Match Line Up
    const lineupPositions = match.lineups.flatMap((lineup) => {
      try {
        const parsed = JSON.parse(lineup.positions) as Array<{ playerId: number; x?: number; y?: number }>;
        return parsed.map((p) => ({ ...p, teamId: lineup.teamId, formation: lineup.formation }));
      } catch {
        return [];
      }
    });
    const lineupPlayerIds = Array.from(new Set(lineupPositions.map((p) => p.playerId).filter(Boolean)));
    const lineupPlayers = lineupPlayerIds.length
      ? await prisma.player.findMany({
          where: { id: { in: lineupPlayerIds } },
          select: { id: true, name: true, number: true, position: true, teamId: true },
        })
      : [];
    const lineupPlayerMap = new Map(lineupPlayers.map((p) => [p.id, p]));

    const lineupForTeam = (teamId: number | null | undefined) => {
      if (!teamId) return { formation: "N/A", players: [] as Array<string> };
      const lineup = match.lineups.find((l) => l.teamId === teamId);
      if (!lineup) return { formation: "N/A", players: [] as Array<string> };
      let positions: Array<{ playerId: number }> = [];
      try {
        positions = JSON.parse(lineup.positions);
      } catch {
        positions = [];
      }
      const players = positions
        .slice(0, 11)
        .map((slot) => {
          const p = lineupPlayerMap.get(slot.playerId);
          if (!p) return `#${slot.playerId}`;
          const no = p.number != null ? `#${p.number}` : "#-";
          return `${no} ${p.name}`;
        });
      return { formation: lineup.formation, players };
    };

    // Network Analysis
    const buildNetwork = (team: "home" | "away") => {
      const links = new Map<string, { from: number; to: number; count: number }>();
      const teamPasses = events.filter((e) => e.type === "pass" && e.team === team);
      for (const e of teamPasses) {
        if (!e.playerId) continue;
        const md = parseMetadata(e.metadata);
        const receiver = asNum(md.toPlayerId ?? md.receiverId);
        if (!receiver || receiver === e.playerId) continue;
        const key = `${e.playerId}->${receiver}`;
        const curr = links.get(key) || { from: e.playerId, to: receiver, count: 0 };
        curr.count += 1;
        links.set(key, curr);
      }
      return Array.from(links.values()).sort((a, b) => b.count - a.count).slice(0, 6);
    };
    const homeLinks = buildNetwork("home");
    const awayLinks = buildNetwork("away");

    // Sense + Distribution + Activity + Vector + Dynamics
    const zones = {
      left: (x: number) => x < 33.34,
      center: (x: number) => x >= 33.34 && x < 66.67,
      right: (x: number) => x >= 66.67,
      defensiveThird: (y: number) => y >= 66.67,
      middleThird: (y: number) => y >= 33.34 && y < 66.67,
      attackingThird: (y: number) => y < 33.34,
    };
    const zoneCount = (teamEvents: typeof events, key: "left" | "center" | "right") =>
      teamEvents.filter((e) => e.x != null && zones[key](Number(e.x))).length;
    const thirdCount = (teamEvents: typeof events, key: "defensiveThird" | "middleThird" | "attackingThird") =>
      teamEvents.filter((e) => e.y != null && zones[key](Number(e.y))).length;

    const passSuccess = (teamPasses: typeof passesHome) => {
      const successful = teamPasses.filter((p) => parseMetadata(p.metadata).successful !== false).length;
      return { successful, total: teamPasses.length, rate: pct(successful, teamPasses.length) };
    };
    const homePass = passSuccess(passesHome);
    const awayPass = passSuccess(passesAway);

    const progressivePasses = (teamPasses: typeof passesHome) =>
      teamPasses.filter((p) => {
        const md = parseMetadata(p.metadata);
        const toY = asNum(md.toY ?? md.endY);
        if (toY == null || p.y == null) return false;
        return Math.abs(toY - Number(p.y)) >= 15;
      }).length;

    const vectorStats = (teamEvents: typeof events) => {
      const vectors = teamEvents
        .map((e) => {
          const md = parseMetadata(e.metadata);
          const ex = asNum(md.toX ?? md.endX);
          const ey = asNum(md.toY ?? md.endY);
          if (e.x == null || e.y == null || ex == null || ey == null) return null;
          const dx = ex - Number(e.x);
          const dy = ey - Number(e.y);
          const distNorm = Math.sqrt(dx * dx + dy * dy);
          // Convert normalized pitch movement (0-100) to approximate meters (105x68 pitch).
          const distMeters = Math.sqrt(Math.pow((dx / 100) * 105, 2) + Math.pow((dy / 100) * 68, 2));
          return { distNorm, distMeters };
        })
        .filter((d): d is { distNorm: number; distMeters: number } => d != null);
      const avgNorm = vectors.length ? vectors.reduce((s, d) => s + d.distNorm, 0) / vectors.length : 0;
      const avgMeters = vectors.length ? vectors.reduce((s, d) => s + d.distMeters, 0) / vectors.length : 0;
      const totalMeters = vectors.reduce((s, d) => s + d.distMeters, 0);
      return { count: vectors.length, avgLen: avgNorm, avgMeters, totalMeters, totalKm: totalMeters / 1000 };
    };
    const homeVectors = vectorStats(homeEvents);
    const awayVectors = vectorStats(awayEvents);
    const dynamics = Array.from({ length: 6 }).map((_, idx) => {
      const start = idx * 15;
      const end = start + 15;
      const bucket = events.filter((e) => (e.minute ?? 0) >= start && (e.minute ?? 0) < end);
      return {
        label: `${start}-${end}'`,
        home: bucket.filter((e) => e.team === "home").length,
        away: bucket.filter((e) => e.team === "away").length,
      };
    });

    const shotOutcomes = (shots: typeof homeShots) => {
      const goals = shots.filter((s) => getOutcome(s) === "goal").length;
      const onTarget = shots.filter((s) => ["goal", "on_target", "saved"].includes((getOutcome(s) || "").toLowerCase())).length;
      const blocked = shots.filter((s) => (getOutcome(s) || "").toLowerCase() === "blocked").length;
      const wide = shots.filter((s) => ["off_target", "wide"].includes((getOutcome(s) || "").toLowerCase())).length;
      const xg = shots.reduce((s, e) => s + (e.xg || 0), 0);
      return { goals, onTarget, blocked, wide, xg, total: shots.length };
    };
    const homeShotA = shotOutcomes(homeShots);
    const awayShotA = shotOutcomes(awayShots);

    const playerTouches = (team: "home" | "away") => {
      const countByPlayer = new Map<number, number>();
      for (const e of events) {
        if (e.team !== team || !e.playerId) continue;
        countByPlayer.set(e.playerId, (countByPlayer.get(e.playerId) || 0) + 1);
      }
      return Array.from(countByPlayer.entries())
        .map(([pid, count]) => ({ pid, count, p: lineupPlayerMap.get(pid) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    };
    const topHomeTouches = playerTouches("home");
    const topAwayTouches = playerTouches("away");

    const analytics = {
      xgHome: homeShots.reduce((sum, e) => sum + (e.xg || 0), 0),
      xgAway: awayShots.reduce((sum, e) => sum + (e.xg || 0), 0),
      possHome: (homeEvents.length / (events.length || 1)) * 100,
      possAway: (awayEvents.length / (events.length || 1)) * 100,
      homeShots: homeShots.length,
      awayShots: awayShots.length,
      homeOnTarget: homeShotsOnTarget.length,
      awayOnTarget: awayShotsOnTarget.length,
      homeGoals: homeGoals.length,
      awayGoals: awayGoals.length,
    };

    const homeLineup = lineupForTeam(match.homeTeamId);
    const awayLineup = lineupForTeam(match.awayTeamId);
    const leftHome = zoneCount(homeEvents, "left");
    const centerHome = zoneCount(homeEvents, "center");
    const rightHome = zoneCount(homeEvents, "right");
    const leftAway = zoneCount(awayEvents, "left");
    const centerAway = zoneCount(awayEvents, "center");
    const rightAway = zoneCount(awayEvents, "right");
    const strongerLaneHome = leftHome >= centerHome && leftHome >= rightHome ? "Left" : centerHome >= rightHome ? "Center" : "Right";
    const strongerLaneAway = leftAway >= centerAway && leftAway >= rightAway ? "Left" : centerAway >= rightAway ? "Center" : "Right";

    const attackingThirdHome = thirdCount(homeEvents, "attackingThird");
    const middleThirdHome = thirdCount(homeEvents, "middleThird");
    const defensiveThirdHome = thirdCount(homeEvents, "defensiveThird");
    const attackingThirdAway = thirdCount(awayEvents, "attackingThird");
    const middleThirdAway = thirdCount(awayEvents, "middleThird");
    const defensiveThirdAway = thirdCount(awayEvents, "defensiveThird");

    const maxXg = Math.max(analytics.xgHome, analytics.xgAway, 0.01);
    const maxShots = Math.max(analytics.homeShots, analytics.awayShots, 1);
    const maxMomentum = Math.max(...dynamics.map((d) => Math.max(d.home, d.away)), 1);
    const shotMax = Math.max(homeShotA.total, awayShotA.total, 1);
    const momentumRows = dynamics
      .map((d) => {
        const hw = (d.home / maxMomentum) * 100;
        const aw = (d.away / maxMomentum) * 100;
        return `<tr>
          <td>${d.label}</td>
          <td><div class="bar-track"><div class="bar bar-home" style="width:${hw.toFixed(1)}%"></div></div><span class="bar-val">${d.home}</span></td>
          <td><div class="bar-track"><div class="bar bar-away" style="width:${aw.toFixed(1)}%"></div></div><span class="bar-val">${d.away}</span></td>
        </tr>`;
      })
      .join("");

    const pitchWidth = 920;
    const pitchHeight = 520;
    const px = (x: number) => Math.max(10, Math.min(pitchWidth - 10, (x / 100) * pitchWidth));
    const py = (y: number) => Math.max(10, Math.min(pitchHeight - 10, (y / 100) * pitchHeight));

    const renderPitchBase = () => {
      const pitchFill = isPrintMode ? "#f8fafc" : "#071224";
      const pitchStroke = isPrintMode ? "rgba(15,23,42,0.26)" : "rgba(255,255,255,0.18)";
      return `
      <rect width="${pitchWidth}" height="${pitchHeight}" fill="${pitchFill}" rx="10" />
      <rect x="8" y="8" width="${pitchWidth - 16}" height="${pitchHeight - 16}" fill="none" stroke="${pitchStroke}" stroke-width="2" rx="10" />
      <line x1="${pitchWidth / 2}" y1="8" x2="${pitchWidth / 2}" y2="${pitchHeight - 8}" stroke="${pitchStroke}" stroke-width="2" />
      <circle cx="${pitchWidth / 2}" cy="${pitchHeight / 2}" r="66" fill="none" stroke="${pitchStroke}" stroke-width="2" />
      <rect x="8" y="${pitchHeight * 0.3}" width="${pitchWidth * 0.1}" height="${pitchHeight * 0.4}" fill="none" stroke="${pitchStroke}" stroke-width="2" />
      <rect x="${pitchWidth - 8 - pitchWidth * 0.1}" y="${pitchHeight * 0.3}" width="${pitchWidth * 0.1}" height="${pitchHeight * 0.4}" fill="none" stroke="${pitchStroke}" stroke-width="2" />
    `;
    };

    const buildPassNetworkSvg = (team: "home" | "away", color: string) => {
      const teamEvents = events.filter((e) => e.team === team);
      const teamPasses = teamEvents.filter((e) => e.type === "pass");
      const pos = new Map<number, { x: number; y: number; c: number }>();
      const links = new Map<string, { from: number; to: number; n: number }>();
      for (const ev of teamEvents) {
        if (ev.playerId && ev.x != null && ev.y != null) {
          const p = pos.get(ev.playerId) || { x: 0, y: 0, c: 0 };
          p.x += Number(ev.x);
          p.y += Number(ev.y);
          p.c += 1;
          pos.set(ev.playerId, p);
        }
      }

      const inferReceiverByEndpoint = (fromId: number, toX: number, toY: number): number | null => {
        let bestId: number | null = null;
        let best = Number.POSITIVE_INFINITY;
        for (const [pid, p] of pos.entries()) {
          if (pid === fromId || p.c <= 0) continue;
          const cx = p.x / p.c;
          const cy = p.y / p.c;
          const d = Math.hypot(cx - toX, cy - toY);
          if (d < best) {
            best = d;
            bestId = pid;
          }
        }
        return bestId;
      };

      for (const ev of teamPasses) {
        if (ev.playerId) {
          const md = parseMetadata(ev.metadata);
          let to = asNum(md.toPlayerId ?? md.receiverId);
          if (!to) {
            const ex = asNum(md.toX ?? md.endX);
            const ey = asNum(md.toY ?? md.endY);
            if (ex != null && ey != null) {
              to = inferReceiverByEndpoint(ev.playerId, ex, ey);
            }
          }
          if (to && to !== ev.playerId) {
            const k = `${ev.playerId}-${to}`;
            const l = links.get(k) || { from: ev.playerId, to, n: 0 };
            l.n += 1;
            links.set(k, l);
          }
        }
      }
      let nodes = Array.from(pos.entries()).map(([id, p]) => ({
        id,
        x: p.x / Math.max(1, p.c),
        y: p.y / Math.max(1, p.c),
      }));
      // Prevent visual overlap for very small networks (e.g. only 2 players)
      if (nodes.length === 2) {
        const cx = (nodes[0].x + nodes[1].x) / 2;
        const cy = (nodes[0].y + nodes[1].y) / 2;
        nodes = [
          { ...nodes[0], x: Math.max(5, cx - 6), y: cy - 1.5 },
          { ...nodes[1], x: Math.min(95, cx + 6), y: cy + 1.5 },
        ];
      }
      const edges = Array.from(links.values()).sort((a, b) => b.n - a.n).slice(0, 20);
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      const fallbackFlows = teamPasses
        .map((ev) => {
          if (ev.x == null || ev.y == null) return null;
          const md = parseMetadata(ev.metadata);
          const ex = asNum(md.toX ?? md.endX);
          const ey = asNum(md.toY ?? md.endY);
          if (ex == null || ey == null) return null;
          return { x1: Number(ev.x), y1: Number(ev.y), x2: ex, y2: ey };
        })
        .filter((f): f is { x1: number; y1: number; x2: number; y2: number } => !!f)
        .slice(0, 80);
      const edgeSvg = edges
        .map((e) => {
          const a = nodeMap.get(e.from);
          const b = nodeMap.get(e.to);
          if (!a || !b) return "";
          const sw = Math.min(4.2, 1 + e.n * 0.45);
          const ax = px(a.x);
          const ay = py(a.y);
          const bx = px(b.x);
          const by = py(b.y);
          const mx = (ax + bx) / 2;
          const my = (ay + by) / 2 - 10;
          return `<path d="M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}" stroke="${color}" stroke-opacity="0.62" stroke-width="${sw}" fill="none" />`;
        })
        .join("");
      const nodeSvg = nodes
        .map((n) => {
          const p = lineupPlayerMap.get(n.id);
          const label = p?.number != null ? String(p.number) : String(n.id);
          return `<g>
            <circle cx="${px(n.x)}" cy="${py(n.y)}" r="16" fill="${color}" fill-opacity="0.92" stroke="white" stroke-opacity="0.75" stroke-width="2" />
            <text x="${px(n.x)}" y="${py(n.y) + 5}" font-size="12" fill="white" text-anchor="middle" font-weight="700">${label}</text>
          </g>`;
        })
        .join("");
      const fallbackSvg = "";
      return `<svg viewBox="0 0 ${pitchWidth} ${pitchHeight}" width="100%" height="100%">
        ${renderPitchBase()}${edgeSvg}${fallbackSvg}${nodeSvg}
      </svg>`;
    };

    const buildShotMapSvg = () => {
      const points = events
        .filter((e) => e.type === "shot" && e.x != null && e.y != null)
        .slice(0, 140)
        .map((e) => {
          const outcome = (getOutcome(e) || "").toLowerCase();
          const isGoal = outcome === "goal";
          const fill = isGoal ? "#fbbf24" : e.team === "home" ? "#3b82f6" : "#ef4444";
          const r = isGoal ? 8 : 6;
          return `<circle cx="${px(Number(e.x))}" cy="${py(Number(e.y))}" r="${r}" fill="${fill}" fill-opacity="0.85" stroke="white" stroke-opacity="0.55" />`;
        })
        .join("");
      return `<svg viewBox="0 0 ${pitchWidth} ${pitchHeight}" width="100%" height="100%">${renderPitchBase()}${points}</svg>`;
    };

    const buildVectorFieldSvg = () => {
      const vectors = events
        .map((e) => {
          const md = parseMetadata(e.metadata);
          const ex = asNum(md.toX ?? md.endX);
          const ey = asNum(md.toY ?? md.endY);
          if (e.x == null || e.y == null || ex == null || ey == null) return null;
          return { x1: Number(e.x), y1: Number(e.y), x2: ex, y2: ey, t: e.team };
        })
        .filter((v): v is { x1: number; y1: number; x2: number; y2: number; t: string } => !!v)
        .slice(0, 220);
      const lines = vectors
        .map((v) => {
          const col = v.t === "home" ? "#3b82f6" : "#22c55e";
          const x1 = px(v.x1);
          const y1 = py(v.y1);
          const x2 = px(v.x2);
          const y2 = py(v.y2);
          const marker = v.t === "home" ? "v-arrow-home" : "v-arrow-away";
          return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-opacity="0.55" stroke-width="1.4" marker-end="url(#${marker})" />`;
        })
        .join("");
      return `<svg viewBox="0 0 ${pitchWidth} ${pitchHeight}" width="100%" height="100%">
        <defs>
          <marker id="v-arrow-home" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L8,4 L0,8 z" fill="#3b82f6" />
          </marker>
          <marker id="v-arrow-away" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L8,4 L0,8 z" fill="#22c55e" />
          </marker>
        </defs>
        ${renderPitchBase()}${lines}
      </svg>`;
    };

    const passNetworkHomeSvg = buildPassNetworkSvg("home", "#3b82f6");
    const passNetworkAwaySvg = buildPassNetworkSvg("away", "#ef4444");
    const shotMapSvg = buildShotMapSvg();
    const vectorFieldSvg = buildVectorFieldSvg();
    const topHomeLink = homeLinks[0] || null;
    const topAwayLink = awayLinks[0] || null;
    const dominantWindow = dynamics
      .map((d) => ({ ...d, diff: Math.abs(d.home - d.away) }))
      .sort((a, b) => b.diff - a.diff)[0];
    const passNetworkHomeComment = homeLinks.length
      ? `Primary link: ${(lineupPlayerMap.get(topHomeLink!.from)?.name || `#${topHomeLink!.from}`)} -> ${(lineupPlayerMap.get(topHomeLink!.to)?.name || `#${topHomeLink!.to}`)} (${topHomeLink!.count} passes). Passing efficiency: ${homePass.rate.toFixed(1)}% with ${passesHome.length} total passes.`
      : `No reliable passer-receiver chain was detected for ${homeTeamName}. This usually means missing receiver IDs in event metadata.`;
    const passNetworkAwayComment = awayLinks.length
      ? `Primary link: ${(lineupPlayerMap.get(topAwayLink!.from)?.name || `#${topAwayLink!.from}`)} -> ${(lineupPlayerMap.get(topAwayLink!.to)?.name || `#${topAwayLink!.to}`)} (${topAwayLink!.count} passes). Passing efficiency: ${awayPass.rate.toFixed(1)}% with ${passesAway.length} total passes.`
      : `No reliable passer-receiver chain was detected for ${awayTeamName}. This usually means missing receiver IDs in event metadata.`;
    const shotMapComment = `${homeTeamName}: ${homeShotA.total} shots (${homeShotA.onTarget} on target, ${homeShotA.goals} goals, xG ${homeShotA.xg.toFixed(2)}). ${awayTeamName}: ${awayShotA.total} shots (${awayShotA.onTarget} on target, ${awayShotA.goals} goals, xG ${awayShotA.xg.toFixed(2)}).`;
    const vectorComment = `${homeTeamName}: ~${homeVectors.totalKm.toFixed(2)} km cumulative directional movement from tracked actions (avg ${homeVectors.avgMeters.toFixed(1)} m/action). ${awayTeamName}: ~${awayVectors.totalKm.toFixed(2)} km (avg ${awayVectors.avgMeters.toFixed(1)} m/action).`;
    const dynamicsComment = dominantWindow
      ? `Largest momentum swing appears in ${dominantWindow.label} (${homeTeamName} ${dominantWindow.home} vs ${awayTeamName} ${dominantWindow.away}).`
      : "No clear momentum window detected.";

    const reportHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Comprehensive Match Report - ${homeTeamName} vs ${awayTeamName}</title>
  <style>
    :root {
      --bg: ${isPrintMode ? "#ffffff" : "#0a0f1a"};
      --panel: ${isPrintMode ? "#ffffff" : "#0f172a"};
      --panel-soft: ${isPrintMode ? "#f8fafc" : "#111b2f"};
      --line: ${isPrintMode ? "#dbe2ea" : "#1f2a44"};
      --muted: ${isPrintMode ? "#475569" : "#94a3b8"};
      --text: ${isPrintMode ? "#0f172a" : "#e2e8f0"};
      --accent: #22c55e;
      --home: #3b82f6;
      --away: #ef4444;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      padding: 18px;
      background: ${isPrintMode ? "var(--bg)" : "radial-gradient(circle at top, #111827 0%, var(--bg) 65%)"};
      color: var(--text);
    }
    .header {
      margin-bottom: 22px;
      padding: 16px 20px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 6px;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 12px;
      align-items: center;
    }
    .brand {
      font-size: 34px;
      font-weight: 700;
      color: #e2e8f0;
      letter-spacing: 0.2px;
    }
    .brand-accent {
      color: #22c55e;
      font-weight: 500;
    }
    .match-title {
      font-size: 26px;
      font-weight: 500;
      color: #f8fafc;
      margin-bottom: 4px;
    }
    .match-info {
      color: var(--muted);
      font-size: 13px;
    }
    .score {
      display: inline-block;
      font-size: 44px;
      font-weight: 300;
      color: #e2e8f0;
      margin: 8px 0 4px;
    }
    .section {
      margin: 18px 0;
      padding: 16px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 6px;
    }
    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 16px;
      border-bottom: 1px solid #1f2a44;
      padding-bottom: 8px;
      text-transform: uppercase;
    }
    .section-subtitle {
      font-size: 13px;
      color: #9db3cf;
      margin: 2px 0 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
      overflow: hidden;
      border-radius: 4px;
      border: 1px solid var(--line);
    }
    th, td {
      padding: 9px 8px;
      text-align: left;
      border-bottom: 1px solid var(--line);
      font-size: 12px;
    }
    th {
      background: ${isPrintMode ? "#f8fafc" : "#0b1326"};
      color: #cbd5e1;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .03em;
    }
    .stat-box {
      padding: 12px;
      background: ${isPrintMode ? "#f8fafc" : "#0d1628"};
      border-radius: 4px;
      border: 1px solid var(--line);
    }
    .stat-label {
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    .stat-value {
      font-size: 22px;
      font-weight: 500;
      color: ${isPrintMode ? "#0f172a" : "#f8fafc"};
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(160px, 1fr));
      gap: 10px;
    }
    .split {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 8px;
      align-items: center;
    }
    .home {
      color: #bfdbfe;
      font-weight: 600;
    }
    .away {
      color: #fecaca;
      font-weight: 600;
      text-align: right;
    }
    .dash {
      color: var(--muted);
      text-align: center;
    }
    .event-minute {
      font-weight: 700;
      color: #86efac;
    }
    .key-list {
      display: grid;
      gap: 8px;
    }
    .key-item {
      padding: 10px 12px;
      border-radius: 4px;
      border: 1px solid var(--line);
      background: var(--panel-soft);
      font-size: 13px;
    }
    ul {
      margin: 8px 0 0 20px;
      padding: 0;
    }
    li {
      margin: 4px 0;
      color: #dbeafe;
      font-size: 13px;
    }
    .bar-track {
      display: inline-block;
      width: calc(100% - 42px);
      height: 12px;
      background: ${isPrintMode ? "#f8fafc" : "#0b1326"};
      border: 1px solid var(--line);
      border-radius: 2px;
      vertical-align: middle;
      margin-right: 6px;
    }
    .bar {
      height: 100%;
      border-radius: 2px;
    }
    .bar-home { background: var(--home); }
    .bar-away { background: var(--away); }
    .bar-val {
      font-size: 11px;
      color: #cbd5e1;
      white-space: nowrap;
      vertical-align: middle;
    }
    .cmp-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .graph-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .graph-card {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: ${isPrintMode ? "#ffffff" : "#0b1326"};
      padding: 10px;
    }
    .graph-title {
      margin: 0 0 8px;
      font-size: 13px;
      color: #cbd5e1;
      font-weight: 700;
    }
    .graph-analysis {
      margin-top: 8px;
      font-size: 12px;
      line-height: 1.45;
      color: #b6c6dd;
      border-top: 1px solid #1f2a44;
      padding-top: 8px;
    }
    @media print {
      @page { size: A4 portrait; margin: 10mm; }
      body { padding: 0; }
      .section, .graph-card, .stat-box {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Football <span class="brand-accent">Analytics</span></div>
      <div class="match-title">${homeTeamName} vs ${awayTeamName}</div>
      <div class="match-info">
        ${new Date(match.date).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} • ${match.competition}
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;">Match Report</div>
      <div style="font-size:30px;font-weight:500;">${homeTeamName}</div>
    </div>
  </div>
  ${match.scoreHome !== null && match.scoreAway !== null ? `
  <div class="section">
    <div class="score">${match.scoreHome} - ${match.scoreAway}</div>
  </div>` : ""}

  <div class="section">
    <div class="section-title">Summary</div>
    <div class="section-subtitle">Core output from match-level analytics and events</div>
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">xG</div>
        <div class="split"><span class="home">${analytics.xgHome.toFixed(2)}</span><span class="dash">-</span><span class="away">${analytics.xgAway.toFixed(2)}</span></div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Possession</div>
        <div class="split"><span class="home">${analytics.possHome.toFixed(1)}%</span><span class="dash">-</span><span class="away">${analytics.possAway.toFixed(1)}%</span></div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Total Shots</div>
        <div class="split"><span class="home">${analytics.homeShots}</span><span class="dash">-</span><span class="away">${analytics.awayShots}</span></div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Shots on Target</div>
        <div class="split"><span class="home">${analytics.homeOnTarget}</span><span class="dash">-</span><span class="away">${analytics.awayOnTarget}</span></div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Goals</div>
        <div class="split"><span class="home">${analytics.homeGoals}</span><span class="dash">-</span><span class="away">${analytics.awayGoals}</span></div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Total Events</div>
        <div class="stat-value">${events.length}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Comparative Charts</div>
    <div class="section-subtitle">Compact comparison visuals generated directly from match data</div>
    <div class="cmp-grid">
      <div class="stat-box">
        <div class="stat-label">xG / shots comparison</div>
        <table>
          <tbody>
            <tr><td>${homeTeamName} xG</td><td><div class="bar-track"><div class="bar bar-home" style="width:${((analytics.xgHome / maxXg) * 100).toFixed(1)}%"></div></div><span class="bar-val">${analytics.xgHome.toFixed(2)}</span></td></tr>
            <tr><td>${awayTeamName} xG</td><td><div class="bar-track"><div class="bar bar-away" style="width:${((analytics.xgAway / maxXg) * 100).toFixed(1)}%"></div></div><span class="bar-val">${analytics.xgAway.toFixed(2)}</span></td></tr>
            <tr><td>${homeTeamName} Shots</td><td><div class="bar-track"><div class="bar bar-home" style="width:${((analytics.homeShots / maxShots) * 100).toFixed(1)}%"></div></div><span class="bar-val">${analytics.homeShots}</span></td></tr>
            <tr><td>${awayTeamName} Shots</td><td><div class="bar-track"><div class="bar bar-away" style="width:${((analytics.awayShots / maxShots) * 100).toFixed(1)}%"></div></div><span class="bar-val">${analytics.awayShots}</span></td></tr>
          </tbody>
        </table>
      </div>
      <div class="stat-box">
        <div class="stat-label">shot outcome profile</div>
        <table>
          <tbody>
            <tr><td>${homeTeamName} On Target</td><td><div class="bar-track"><div class="bar bar-home" style="width:${((homeShotA.onTarget / shotMax) * 100).toFixed(1)}%"></div></div><span class="bar-val">${homeShotA.onTarget}</span></td></tr>
            <tr><td>${awayTeamName} On Target</td><td><div class="bar-track"><div class="bar bar-away" style="width:${((awayShotA.onTarget / shotMax) * 100).toFixed(1)}%"></div></div><span class="bar-val">${awayShotA.onTarget}</span></td></tr>
            <tr><td>${homeTeamName} Goals</td><td><div class="bar-track"><div class="bar bar-home" style="width:${((homeShotA.goals / shotMax) * 100).toFixed(1)}%"></div></div><span class="bar-val">${homeShotA.goals}</span></td></tr>
            <tr><td>${awayTeamName} Goals</td><td><div class="bar-track"><div class="bar bar-away" style="width:${((awayShotA.goals / shotMax) * 100).toFixed(1)}%"></div></div><span class="bar-val">${awayShotA.goals}</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Embedded Graphs</div>
    <div class="section-subtitle">Charts rendered inside the report (not only numeric stats)</div>
    <div class="graph-grid">
      <div class="graph-card">
        <p class="graph-title">${homeTeamName} - Pass Network</p>
        ${passNetworkHomeSvg}
        <div class="graph-analysis">${passNetworkHomeComment}</div>
      </div>
      <div class="graph-card">
        <p class="graph-title">${awayTeamName} - Pass Network</p>
        ${passNetworkAwaySvg}
        <div class="graph-analysis">${passNetworkAwayComment}</div>
      </div>
      <div class="graph-card">
        <p class="graph-title">Shot Map</p>
        ${shotMapSvg}
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;font-size:11px;color:#cbd5e1">
          <span><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#fbbf24;margin-right:6px"></span>Goal</span>
          <span><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#3b82f6;margin-right:6px"></span>Home Shot</span>
          <span><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#ef4444;margin-right:6px"></span>Away Shot</span>
        </div>
        <div class="graph-analysis">${shotMapComment}</div>
      </div>
      <div class="graph-card">
        <p class="graph-title">Vector Field</p>
        ${vectorFieldSvg}
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;font-size:11px;color:#cbd5e1">
          <span><span style="display:inline-block;width:12px;height:2px;background:#3b82f6;margin-right:6px;vertical-align:middle"></span>Home Direction</span>
          <span><span style="display:inline-block;width:12px;height:2px;background:#22c55e;margin-right:6px;vertical-align:middle"></span>Away Direction</span>
        </div>
        <div class="graph-analysis">${vectorComment}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Match Line Up</div>
    <div class="section-subtitle">Formations and selected XI</div>
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">${homeTeamName} Formation</div>
        <div class="stat-value" style="font-size:20px">${homeLineup.formation}</div>
        <ul>${homeLineup.players.map((p) => `<li>${p}</li>`).join("") || "<li>No lineup submitted</li>"}</ul>
      </div>
      <div class="stat-box">
        <div class="stat-label">${awayTeamName} Formation</div>
        <div class="stat-value" style="font-size:20px">${awayLineup.formation}</div>
        <ul>${awayLineup.players.map((p) => `<li>${p}</li>`).join("") || "<li>No lineup submitted</li>"}</ul>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Network Analysis</div>
    <div class="section-subtitle">Top pass links and passing efficiency</div>
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">${homeTeamName} pass success</div>
        <div class="stat-value">${homePass.rate.toFixed(1)}%</div>
        <ul>
          ${homeLinks.map((l) => `<li>${(lineupPlayerMap.get(l.from)?.name || `#${l.from}`)} → ${(lineupPlayerMap.get(l.to)?.name || `#${l.to}`)}: ${l.count}</li>`).join("") || "<li>No pass links detected</li>"}
        </ul>
      </div>
      <div class="stat-box">
        <div class="stat-label">${awayTeamName} pass success</div>
        <div class="stat-value">${awayPass.rate.toFixed(1)}%</div>
        <ul>
          ${awayLinks.map((l) => `<li>${(lineupPlayerMap.get(l.from)?.name || `#${l.from}`)} → ${(lineupPlayerMap.get(l.to)?.name || `#${l.to}`)}: ${l.count}</li>`).join("") || "<li>No pass links detected</li>"}
        </ul>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Sense Matrix</div>
    <div class="section-subtitle">Passing and carrying intent profile</div>
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-label">Progressive Passes</div><div class="split"><span class="home">${progressivePasses(passesHome)}</span><span class="dash">-</span><span class="away">${progressivePasses(passesAway)}</span></div></div>
      <div class="stat-box"><div class="stat-label">Carries / Dribbles</div><div class="split"><span class="home">${carriesHome.length}</span><span class="dash">-</span><span class="away">${carriesAway.length}</span></div></div>
      <div class="stat-box"><div class="stat-label">Total Passes</div><div class="split"><span class="home">${passesHome.length}</span><span class="dash">-</span><span class="away">${passesAway.length}</span></div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Distribution Map</div>
    <div class="section-subtitle">Horizontal lane usage</div>
    <table>
      <thead><tr><th>Team</th><th>Left Lane</th><th>Center Lane</th><th>Right Lane</th></tr></thead>
      <tbody>
        <tr><td>${homeTeamName}</td><td>${leftHome} (${pct(leftHome, homeEvents.length).toFixed(1)}%)</td><td>${centerHome} (${pct(centerHome, homeEvents.length).toFixed(1)}%)</td><td>${rightHome} (${pct(rightHome, homeEvents.length).toFixed(1)}%)</td></tr>
        <tr><td>${awayTeamName}</td><td>${leftAway} (${pct(leftAway, awayEvents.length).toFixed(1)}%)</td><td>${centerAway} (${pct(centerAway, awayEvents.length).toFixed(1)}%)</td><td>${rightAway} (${pct(rightAway, awayEvents.length).toFixed(1)}%)</td></tr>
      </tbody>
    </table>
    <div class="graph-analysis">${homeTeamName} focuses more on the ${strongerLaneHome.toLowerCase()} lane, while ${awayTeamName} is strongest on the ${strongerLaneAway.toLowerCase()} lane.</div>
  </div>

  <div class="section">
    <div class="section-title">Activity Field</div>
    <div class="section-subtitle">Third occupancy and top active players</div>
    <table>
      <thead><tr><th>Team</th><th>Attacking Third</th><th>Middle Third</th><th>Defensive Third</th></tr></thead>
      <tbody>
        <tr><td>${homeTeamName}</td><td>${attackingThirdHome}</td><td>${middleThirdHome}</td><td>${defensiveThirdHome}</td></tr>
        <tr><td>${awayTeamName}</td><td>${attackingThirdAway}</td><td>${middleThirdAway}</td><td>${defensiveThirdAway}</td></tr>
      </tbody>
    </table>
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-label">Top active (${homeTeamName})</div><ul>${topHomeTouches.map((r) => `<li>${r.p?.name || `#${r.pid}`}: ${r.count}</li>`).join("") || "<li>No data</li>"}</ul></div>
      <div class="stat-box"><div class="stat-label">Top active (${awayTeamName})</div><ul>${topAwayTouches.map((r) => `<li>${r.p?.name || `#${r.pid}`}: ${r.count}</li>`).join("") || "<li>No data</li>"}</ul></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Vector Field</div>
    <div class="section-subtitle">Motion vectors from pass/carry endpoints</div>
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-label">${homeTeamName}</div><div class="stat-value">${homeVectors.count}</div><div class="stat-label">Avg length: ${homeVectors.avgLen.toFixed(2)}</div></div>
      <div class="stat-box"><div class="stat-label">${awayTeamName}</div><div class="stat-value">${awayVectors.count}</div><div class="stat-label">Avg length: ${awayVectors.avgLen.toFixed(2)}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Match Dynamics</div>
    <div class="section-subtitle">15-minute momentum windows</div>
    <table>
      <thead><tr><th>Window</th><th>${homeTeamName}</th><th>${awayTeamName}</th></tr></thead>
      <tbody>${momentumRows}</tbody>
    </table>
    <div class="graph-analysis">${dynamicsComment}</div>
  </div>

  <div class="section">
    <div class="section-title">Shot Analytics</div>
    <div class="section-subtitle">Outcome quality profile</div>
    <table>
      <thead><tr><th>Team</th><th>Total</th><th>On Target</th><th>Goals</th><th>Blocked</th><th>Wide</th><th>xG</th></tr></thead>
      <tbody>
        <tr><td>${homeTeamName}</td><td>${homeShotA.total}</td><td>${homeShotA.onTarget}</td><td>${homeShotA.goals}</td><td>${homeShotA.blocked}</td><td>${homeShotA.wide}</td><td>${homeShotA.xg.toFixed(2)}</td></tr>
        <tr><td>${awayTeamName}</td><td>${awayShotA.total}</td><td>${awayShotA.onTarget}</td><td>${awayShotA.goals}</td><td>${awayShotA.blocked}</td><td>${awayShotA.wide}</td><td>${awayShotA.xg.toFixed(2)}</td></tr>
      </tbody>
    </table>
  </div>

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
                ${getOutcome(event) ? ` • ${getOutcome(event)}` : ""}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    ` : "<p>No events recorded for this match.</p>"}
  </div>

  <div class="section">
    <div class="section-title">Key Moments</div>
    <div class="key-list">
    ${match.events
      .filter((e) => e.type === "shot" && (getOutcome(e) === "goal" || (e.xg && e.xg > 0.3)))
      .map((event) => `
        <div class="key-item">
          <span class="event-minute">${event.minute || "N/A"}'</span> - 
          ${getOutcome(event) === "goal" ? "⚽ GOAL!" : "🎯 Big Chance"} - 
          ${event.player?.name || "Unknown"} 
          ${event.xg ? `(xG: ${event.xg.toFixed(2)})` : ""}
        </div>
      `).join("") || "<p>No key moments recorded.</p>"}
    </div>
  </div>

  <div style="margin-top: 40px; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
    Generated by Football Analytics Platform (Comprehensive Match Report)<br>
    ${new Date().toLocaleString()}
  </div>
</body>
${autoPrint ? `<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),300));</script>` : ""}
</html>
    `;

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

