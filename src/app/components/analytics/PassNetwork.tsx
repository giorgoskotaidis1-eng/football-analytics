"use client";

import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";

type TeamId = string;
type PlayerId = string;
type Half = "1H" | "2H" | "all";

interface PassEdge {
  from: PlayerId;
  to: PlayerId;
  count: number;
  attempted?: number;
  accuracy?: number;
  avgLengthM?: number;
}

interface PlayerNode {
  id: PlayerId;
  shirtNumber: number;
  name: string;
  position?: string;
  x?: number; // normalized 0..1
  y?: number; // normalized 0..1
}

interface PassNetwork {
  teamId: TeamId;
  nodes: PlayerNode[];
  edges: PassEdge[];
  totalPasses: number;
}

interface Filters {
  teamId: TeamId;
  playerIds?: PlayerId[];
  minCount?: number;
  half?: Half;
  direction?: "all" | "L2R" | "R2L";
}

interface PassNetworkProps {
  events: Array<{
    id: number;
    type: string;
    team: string;
    playerId: number | null;
    player: { id: number; name: string; number?: number | null } | null;
    x: number | null;
    y: number | null;
    minute: number | null;
    metadata: string | null;
  }>;
  players: Array<{
    id: number;
    name: string;
    number?: number | null;
    position?: string;
    teamId?: number | null;
  }>;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeTeamName: string;
  awayTeamName: string;
}

const HOME_COLOR = "#3a8bff";
const HOME_GRADIENT = "linear-gradient(135deg, #3a8bff 0%, #2563eb 100%)";
const AWAY_COLOR = "#f25c54";
const AWAY_GRADIENT = "linear-gradient(135deg, #f25c54 0%, #dc2626 100%)";
const SELECTED_COLOR = "#ffd166";
const SELECTED_GRADIENT = "linear-gradient(135deg, #ffd166 0%, #fbbf24 100%)";

// Default positions by position label
const DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  GK: { x: 0.08, y: 0.5 },
  LB: { x: 0.22, y: 0.25 },
  LCB: { x: 0.18, y: 0.4 },
  CB: { x: 0.18, y: 0.5 },
  RCB: { x: 0.26, y: 0.5 },
  RB: { x: 0.22, y: 0.75 },
  LDM: { x: 0.38, y: 0.4 },
  DM: { x: 0.38, y: 0.5 },
  RDM: { x: 0.38, y: 0.6 },
  LCM: { x: 0.48, y: 0.35 },
  CM: { x: 0.48, y: 0.5 },
  RCM: { x: 0.48, y: 0.65 },
  LAM: { x: 0.60, y: 0.4 },
  AM: { x: 0.60, y: 0.5 },
  RAM: { x: 0.60, y: 0.6 },
  LW: { x: 0.62, y: 0.22 },
  RW: { x: 0.62, y: 0.78 },
  LF: { x: 0.74, y: 0.4 },
  ST: { x: 0.74, y: 0.5 },
  RF: { x: 0.74, y: 0.6 },
};

function getDefaultPosition(position?: string): { x: number; y: number } {
  if (!position) return { x: 0.5, y: 0.5 };
  const pos = position.toUpperCase();
  // Common long-form labels
  if (pos.includes("GOALKEEPER")) return DEFAULT_POSITIONS.GK;
  if (pos.includes("DEFENDER") || pos.includes("CENTRE-BACK") || pos.includes("CENTER-BACK")) return DEFAULT_POSITIONS.CB;
  if (pos.includes("MIDFIELDER") || pos.includes("MIDFIELD")) return DEFAULT_POSITIONS.CM;
  if (pos.includes("FORWARD") || pos.includes("STRIKER") || pos.includes("ATTACKER")) return DEFAULT_POSITIONS.ST;
  if (pos.includes("WINGER")) return pos.includes("RIGHT") ? DEFAULT_POSITIONS.RW : DEFAULT_POSITIONS.LW;
  for (const [key, value] of Object.entries(DEFAULT_POSITIONS)) {
    if (pos.includes(key)) return value;
  }
  return { x: 0.5, y: 0.5 };
}

function getPositionBucket(position?: string): string {
  if (!position) return "CM";
  const pos = position.toUpperCase();
  if (pos.includes("GOALKEEPER") || pos.includes("GK")) return "GK";
  if (
    pos.includes("DEFENDER") ||
    pos.includes("BACK") ||
    pos.includes("CB") ||
    pos.includes("LB") ||
    pos.includes("RB")
  ) {
    return "CB";
  }
  if (
    pos.includes("MIDFIELDER") ||
    pos.includes("MIDFIELD") ||
    pos.includes("CM") ||
    pos.includes("DM") ||
    pos.includes("AM")
  ) {
    return "CM";
  }
  if (
    pos.includes("FORWARD") ||
    pos.includes("STRIKER") ||
    pos.includes("ATTACKER") ||
    pos.includes("ST") ||
    pos.includes("FW")
  ) {
    return "ST";
  }
  return "CM";
}

function getTacticalLane(position?: string): { bucket: "GK" | "DEF" | "MID" | "ATT"; laneX: number } {
  const bucket = getPositionBucket(position);
  if (bucket === "GK") return { bucket: "GK", laneX: 0.1 };
  if (bucket === "CB") return { bucket: "DEF", laneX: 0.28 };
  if (bucket === "ST") return { bucket: "ATT", laneX: 0.76 };
  return { bucket: "MID", laneX: 0.52 };
}

function buildPassNetwork(
  events: PassNetworkProps["events"],
  teamPlayers: PassNetworkProps["players"],
  team: "home" | "away",
  filters: Filters
): PassNetwork {
  // Filter passes
  let passes = events.filter(
    (e) =>
      e.type === "pass" &&
      e.team === team &&
      e.playerId !== null &&
      e.minute !== null
  );

  // Filter by half
  if (filters.half === "1H") {
    passes = passes.filter((e) => e.minute !== null && e.minute < 45);
  } else if (filters.half === "2H") {
    passes = passes.filter((e) => e.minute !== null && e.minute >= 45);
  }

  // Filter by direction (if available in metadata)
  if (filters.direction && filters.direction !== "all") {
    passes = passes.filter((e) => {
      if (!e.metadata) return false;
      try {
        const meta = JSON.parse(e.metadata);
        const dir = meta.direction || meta.attackDirection;
        if (filters.direction === "L2R") return dir === "left-to-right" || dir === "L2R";
        if (filters.direction === "R2L") return dir === "right-to-left" || dir === "R2L";
      } catch {
        return true; // Keep if can't parse
      }
      return true;
    });
  }

  // Build edges
  const edgeMap = new Map<string, PassEdge>();
  const playerPassCounts = new Map<PlayerId, { sent: number; received: number }>();
  const playerPositions = new Map<PlayerId, { x: number; y: number; count: number }>();

  const passRecords: Array<{
    fromId: PlayerId;
    toId: PlayerId | null;
    toX: number | null;
    toY: number | null;
  }> = [];

  passes.forEach((pass) => {
    if (!pass.playerId) return;

    const fromId = pass.playerId.toString();
    
    // Get receiver from metadata
    let toId: PlayerId | null = null;
    let toX: number | null = null;
    let toY: number | null = null;
    if (pass.metadata) {
      try {
        const meta = JSON.parse(pass.metadata);
        toId = meta.toId?.toString() || meta.toPlayerId?.toString() || meta.receiverId?.toString() || null;
        toX = meta.toX ?? meta.endX ?? null;
        toY = meta.toY ?? meta.endY ?? null;
      } catch {
        // Invalid JSON
      }
    }

    // Track passer position
    if (pass.x !== null && pass.y !== null) {
      const x = pass.x / 100; // Normalize to 0-1
      const y = pass.y / 100;
      const pos = playerPositions.get(fromId) || { x: 0, y: 0, count: 0 };
      playerPositions.set(fromId, {
        x: pos.x + x,
        y: pos.y + y,
        count: pos.count + 1,
      });
    }

    // Track receiver position from pass endpoint (helps avoid node stacking in center).
    if (toId && toX !== null && toY !== null && !Number.isNaN(Number(toX)) && !Number.isNaN(Number(toY))) {
      const rx = Number(toX) / 100;
      const ry = Number(toY) / 100;
      const pos = playerPositions.get(toId) || { x: 0, y: 0, count: 0 };
      playerPositions.set(toId, {
        x: pos.x + rx,
        y: pos.y + ry,
        count: pos.count + 1,
      });
    }

    // Track sent passes
    const stats = playerPassCounts.get(fromId) || { sent: 0, received: 0 };
    playerPassCounts.set(fromId, { ...stats, sent: stats.sent + 1 });

    passRecords.push({
      fromId,
      toId,
      toX: toX !== null && !Number.isNaN(Number(toX)) ? Number(toX) : null,
      toY: toY !== null && !Number.isNaN(Number(toY)) ? Number(toY) : null,
    });
  });

  // Normalize positions
  const normalizedPositions = new Map<PlayerId, { x: number; y: number }>();
  playerPositions.forEach((pos, playerId) => {
    if (pos.count > 0) {
      normalizedPositions.set(playerId, {
        x: pos.x / pos.count,
        y: pos.y / pos.count,
      });
    }
  });

  // Build fallback player position map from known/default positions for inference.
  const playerFallbackPos = new Map<PlayerId, { x: number; y: number }>();
  teamPlayers.forEach((p) => {
    const pid = p.id.toString();
    playerFallbackPos.set(pid, normalizedPositions.get(pid) || getDefaultPosition(p.position));
  });

  // Create edges in a second pass (after positions are available).
  passRecords.forEach((record) => {
    let toId = record.toId;

    // Infer receiver when explicit receiver id is missing, using nearest player to pass end coordinates.
    if (!toId && record.toX !== null && record.toY !== null) {
      const tx = record.toX / 100;
      const ty = record.toY / 100;
      let bestId: string | null = null;
      let bestDist = Infinity;

      playerFallbackPos.forEach((pos, pid) => {
        if (pid === record.fromId) return;
        const dx = pos.x - tx;
        const dy = pos.y - ty;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestDist) {
          bestDist = d;
          bestId = pid;
        }
      });

      // threshold in normalized pitch units (~18% of pitch)
      if (bestId && bestDist <= 0.18) {
        toId = bestId;
      }
    }

    if (toId && toId !== record.fromId) {
      const key = `${record.fromId}-${toId}`;
      const edge = edgeMap.get(key) || {
        from: record.fromId,
        to: toId,
        count: 0,
        attempted: 0,
      };
      edge.count += 1;
      edge.attempted = (edge.attempted || 0) + 1;
      edge.accuracy = edge.count / edge.attempted;
      edgeMap.set(key, edge);

      // Track received passes
      const receiverStats = playerPassCounts.get(toId) || { sent: 0, received: 0 };
      playerPassCounts.set(toId, { ...receiverStats, received: receiverStats.received + 1 });
    }
  });

  // Build nodes
  const nodeMap = new Map<PlayerId, PlayerNode>();
  const allowedPlayerIds = filters.playerIds?.length
    ? new Set(filters.playerIds)
    : null;
  const fallbackPositionUsage = new Map<string, number>();

  teamPlayers.forEach((p) => {
    if (allowedPlayerIds && !allowedPlayerIds.has(p.id.toString())) {
      return;
    }

    const playerId = p.id.toString();
    const learnedPos = normalizedPositions.get(playerId);
    let pos = learnedPos || getDefaultPosition(p.position);

    // If we don't have learned positions from events, spread players in the same role bucket
    // so they don't overlap in a single point (common in showcase/demo data).
    if (!learnedPos) {
      const bucket = getPositionBucket(p.position);
      const idx = fallbackPositionUsage.get(bucket) || 0;
      fallbackPositionUsage.set(bucket, idx + 1);
      if (idx > 0) {
        const laneOffset = Math.min(0.24, idx * 0.06);
        const sign = idx % 2 === 0 ? 1 : -1;
        pos = {
          x: Math.min(0.94, Math.max(0.06, pos.x)),
          y: Math.min(0.94, Math.max(0.06, pos.y + sign * laneOffset)),
        };
      }
    }
    
    nodeMap.set(playerId, {
      id: playerId,
      shirtNumber: p.number || 0,
      name: p.name,
      position: p.position,
      x: pos.x,
      y: pos.y,
    });
  });

  // Filter edges by minCount and allowed players
  const edges = Array.from(edgeMap.values()).filter((edge) => {
    if (filters.minCount && edge.count < filters.minCount) return false;
    if (allowedPlayerIds) {
      if (!allowedPlayerIds.has(edge.from) || !allowedPlayerIds.has(edge.to)) return false;
    }
    return true;
  });

  // Only keep nodes that have edges or are selected
  const nodesWithEdges = new Set<PlayerId>();
  edges.forEach((e) => {
    nodesWithEdges.add(e.from);
    nodesWithEdges.add(e.to);
  });

  const nodes = Array.from(nodeMap.values()).filter(
    (n) => nodesWithEdges.has(n.id) || (allowedPlayerIds && allowedPlayerIds.has(n.id))
  );

  return {
    teamId: team,
    nodes,
    edges,
    totalPasses: passes.length,
  };
}

function filterNetwork(net: PassNetwork, f: Filters): PassNetwork {
  const allowed = new Set(f.playerIds?.length ? f.playerIds : net.nodes.map((n) => n.id));
  const edges = net.edges.filter(
    (e) =>
      allowed.has(e.from) &&
      allowed.has(e.to) &&
      (f.minCount ? e.count >= f.minCount : true)
  );
  const nodes = net.nodes.filter((n) => allowed.has(n.id) || edges.some((e) => e.from === n.id || e.to === n.id));
  return {
    ...net,
    nodes,
    edges,
    totalPasses: edges.reduce((s, e) => s + e.count, 0),
  };
}

interface PassMapProps {
  network: PassNetwork;
  teamColor: string;
  selectedPlayerId: PlayerId | null;
  onPlayerSelect: (playerId: PlayerId | null) => void;
  width?: number;
  height?: number;
}

function PassMap({ network, teamColor, selectedPlayerId, onPlayerSelect, width = 900, height = 520 }: PassMapProps) {
  const [hoveredEdge, setHoveredEdge] = useState<PassEdge | null>(null);
  const [hoveredNode, setHoveredNode] = useState<PlayerNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const tooltipRafRef = useRef<number | null>(null);

  const visibleEdges = useMemo(() => {
    const MAX_EDGES = 160;
    let edges = network.edges;
    if (selectedPlayerId) {
      edges = edges.filter((e) => e.from === selectedPlayerId || e.to === selectedPlayerId);
    }
    if (edges.length <= MAX_EDGES) return edges;
    return [...edges].sort((a, b) => b.count - a.count).slice(0, MAX_EDGES);
  }, [network.edges, selectedPlayerId]);

  const maxCount = useMemo(() => Math.max(...visibleEdges.map((e) => e.count), 1), [visibleEdges]);
  const maxDegree = useMemo(() => {
    const degrees = new Map<PlayerId, number>();
    visibleEdges.forEach((e) => {
      degrees.set(e.from, (degrees.get(e.from) || 0) + e.count);
      degrees.set(e.to, (degrees.get(e.to) || 0) + e.count);
    });
    return Math.max(...Array.from(degrees.values()), 1);
  }, [visibleEdges]);

  const nodeById = useMemo(() => {
    const map = new Map<PlayerId, PlayerNode>();
    network.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [network.nodes]);

  const degreeByNode = useMemo(() => {
    const degrees = new Map<PlayerId, number>();
    visibleEdges.forEach((e) => {
      degrees.set(e.from, (degrees.get(e.from) || 0) + e.count);
      degrees.set(e.to, (degrees.get(e.to) || 0) + e.count);
    });
    return degrees;
  }, [visibleEdges]);
  const selectedNodeLockedCount = useMemo(() => {
    if (!selectedPlayerId) return 0;
    return network.nodes.filter((n) => n.id !== selectedPlayerId).length;
  }, [network.nodes, selectedPlayerId]);

  // Resolve node overlaps with a lightweight repulsion pass in screen-space.
  const adjustedNodePos = useMemo(() => {
    const laneGroups = new Map<"GK" | "DEF" | "MID" | "ATT", Array<{
      id: string;
      obsX: number;
      obsY: number;
      laneX: number;
    }>>();
    laneGroups.set("GK", []);
    laneGroups.set("DEF", []);
    laneGroups.set("MID", []);
    laneGroups.set("ATT", []);

    network.nodes.forEach((n) => {
      const obsX = typeof n.x === "number" ? n.x : 0.5;
      const obsY = typeof n.y === "number" ? n.y : 0.5;
      const lane = getTacticalLane(n.position);
      laneGroups.get(lane.bucket)!.push({
        id: n.id,
        obsX,
        obsY,
        laneX: lane.laneX,
      });
    });

    const pts: Array<{ id: string; x: number; y: number }> = [];
    const bucketOrder: Array<"GK" | "DEF" | "MID" | "ATT"> = ["GK", "DEF", "MID", "ATT"];
    bucketOrder.forEach((bucket) => {
      const group = laneGroups.get(bucket) || [];
      if (group.length === 0) return;
      const sorted = [...group].sort((a, b) => a.obsY - b.obsY);
      const yMin = 0.16;
      const yMax = 0.84;
      sorted.forEach((p, idx) => {
        const slotY =
          sorted.length === 1
            ? 0.5
            : yMin + ((yMax - yMin) * idx) / (sorted.length - 1);
        // Strongly anchor on tactical lanes while keeping some event influence.
        const x = p.laneX * 0.8 + p.obsX * 0.2;
        const y = slotY * 0.75 + p.obsY * 0.25;
        pts.push({
          id: p.id,
          x: x * width,
          y: y * height,
        });
      });
    });

    const minDist = 52; // pixels
    const iterations = 30;

    for (let k = 0; k < iterations; k++) {
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i];
          const b = pts[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
          if (dist >= minDist) continue;

          const overlap = (minDist - dist) * 0.5;
          const ux = dx / dist;
          const uy = dy / dist;

          a.x -= ux * overlap;
          a.y -= uy * overlap;
          b.x += ux * overlap;
          b.y += uy * overlap;
        }
      }
    }

    // Hard-separate tiny clusters that remain almost stacked.
    // This avoids the "same spot" look in showcase/demo datasets.
    const nearThreshold = 44;
    const clusterRadius = 32;
    const visited = new Set<string>();
    const clusters: Array<Array<{ id: string; x: number; y: number }>> = [];
    for (let i = 0; i < pts.length; i++) {
      const seed = pts[i];
      if (visited.has(seed.id)) continue;
      const cluster = [seed];
      visited.add(seed.id);
      for (let j = i + 1; j < pts.length; j++) {
        const other = pts[j];
        const dx = other.x - seed.x;
        const dy = other.y - seed.y;
        if (Math.sqrt(dx * dx + dy * dy) <= nearThreshold) {
          cluster.push(other);
          visited.add(other.id);
        }
      }
      clusters.push(cluster);
    }

    clusters.forEach((cluster) => {
      if (cluster.length <= 1) return;
      const cx = cluster.reduce((s, p) => s + p.x, 0) / cluster.length;
      const cy = cluster.reduce((s, p) => s + p.y, 0) / cluster.length;
      const sorted = [...cluster].sort((a, b) => a.id.localeCompare(b.id));
      sorted.forEach((p, idx) => {
        const angle = (Math.PI * 2 * idx) / sorted.length;
        p.x = cx + Math.cos(angle) * clusterRadius;
        p.y = cy + Math.sin(angle) * clusterRadius;
      });
    });

    // Keep inside pitch padding
    const pad = 24;
    const map = new Map<PlayerId, { x: number; y: number }>();
    pts.forEach((p) => {
      map.set(p.id, {
        x: Math.min(width - pad, Math.max(pad, p.x)),
        y: Math.min(height - pad, Math.max(pad, p.y)),
      });
    });
    return map;
  }, [network.nodes, width, height]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (selectedPlayerId) return;
    if (!hoveredEdge && !hoveredNode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const next = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    if (tooltipRafRef.current !== null) {
      cancelAnimationFrame(tooltipRafRef.current);
    }
    tooltipRafRef.current = requestAnimationFrame(() => {
      setTooltipPos(next);
      tooltipRafRef.current = null;
    });
  }, [hoveredEdge, hoveredNode, selectedPlayerId]);

  // While a player is locked, disable hover/tooltip churn to prevent jitter.
  useEffect(() => {
    if (!selectedPlayerId) return;
    setHoveredEdge(null);
    setHoveredNode(null);
    setTooltipPos(null);
  }, [selectedPlayerId]);

  if (network.edges.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 opacity-50">⚽</div>
          <p className="text-white/50 text-sm font-medium">Δεν υπάρχουν δεδομένα πασών</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: `${width}/${height}`, background: "linear-gradient(135deg, #0f1923 0%, #0a1520 100%)" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        className="absolute inset-0"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setHoveredEdge(null);
          setHoveredNode(null);
          setTooltipPos(null);
          if (tooltipRafRef.current !== null) {
            cancelAnimationFrame(tooltipRafRef.current);
            tooltipRafRef.current = null;
          }
        }}
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glowStrong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="pitchGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f1923" stopOpacity="1" />
            <stop offset="100%" stopColor="#0a1520" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Pitch background with gradient */}
        <rect x="0" y="0" width={width} height={height} fill="url(#pitchGradient)" />
        
        {/* Pitch lines with subtle glow */}
        <g stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" fill="none" opacity="0.6">
          <rect x="6" y="6" width={width - 12} height={height - 12} rx="12" />
          <line x1={width / 2} y1="0" x2={width / 2} y2={height} strokeWidth="3" />
          <rect x="6" y={height * 0.3} width={width * 0.1} height={height * 0.4} rx="4" />
          <rect x={width - 6 - width * 0.1} y={height * 0.3} width={width * 0.1} height={height * 0.4} rx="4" />
          <circle cx={width / 2} cy={height / 2} r={height * 0.12} />
        </g>

        {/* Edges with animations */}
        {visibleEdges.map((edge, idx) => {
          const fromNode = nodeById.get(edge.from);
          const toNode = nodeById.get(edge.to);
          if (!fromNode || !toNode || !fromNode.x || !fromNode.y || !toNode.x || !toNode.y) return null;

          const fromPos = adjustedNodePos.get(fromNode.id);
          const toPos = adjustedNodePos.get(toNode.id);
          const x1 = fromPos ? fromPos.x : fromNode.x * width;
          const y1 = fromPos ? fromPos.y : fromNode.y * height;
          const x2 = toPos ? toPos.x : toNode.x * width;
          const y2 = toPos ? toPos.y : toNode.y * height;

          const strokeWidth = 1.5 + 4 * (edge.count / maxCount);
          const baseOpacity = 0.3 + 0.6 * (edge.accuracy || 1);
          const isHovered = !selectedPlayerId && hoveredEdge === edge;
          const opacity = isHovered ? 1 : baseOpacity;

          return (
            <line
              key={`${edge.from}-${edge.to}-${idx}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={teamColor}
              strokeWidth={strokeWidth}
              opacity={opacity}
              style={{
                // Keep heavy blur only on hover to avoid constant GPU cost.
                filter: isHovered ? "url(#glowStrong)" : "none",
                transition: "opacity 0.2s ease, filter 0.2s ease",
              }}
              onMouseEnter={() => {
                if (!selectedPlayerId) setHoveredEdge(edge);
              }}
              onMouseLeave={() => {
                if (!selectedPlayerId) setHoveredEdge(null);
              }}
              cursor="pointer"
            />
          );
        })}

        {/* Nodes with enhanced styling */}
        {network.nodes.map((node) => {
          if (!node.x || !node.y) return null;

          const degree = degreeByNode.get(node.id) || 0;

          const radius = 14 + 4 * Math.sqrt(degree / maxDegree);
          const hitRadius = radius + 10; // stable hover/click target to prevent edge jitter
          const nodePos = adjustedNodePos.get(node.id);
          const x = nodePos ? nodePos.x : node.x * width;
          const y = nodePos ? nodePos.y : node.y * height;
          const isSelected = selectedPlayerId === node.id;
          const isHovered = !selectedPlayerId && hoveredNode === node;

          return (
            <g key={node.id} style={{ transition: "transform 0.2s ease" }}>
              {/* Outer glow ring for selected/hovered */}
              {(isSelected || isHovered) && (
                <circle
                  cx={x}
                  cy={y}
                  r={radius + 4}
                  fill="none"
                  stroke={isSelected ? SELECTED_COLOR : teamColor}
                  strokeWidth="2"
                  opacity="0.4"
                  style={{ filter: "url(#glow)" }}
                />
              )}
              {/* Main node circle */}
              <circle
                cx={x}
                cy={y}
                r={radius}
                fill={teamColor}
                stroke={isSelected ? SELECTED_COLOR : isHovered ? "#fff" : "rgba(255,255,255,0.4)"}
                strokeWidth={isSelected ? 4 : isHovered ? 3 : 2}
                style={{ 
                  filter: isHovered || isSelected ? "url(#glowStrong)" : "url(#glow)",
                  transition: "all 0.2s ease",
                  transform: "scale(1)",
                  pointerEvents: "none",
                }}
              />
              {/* Stable interaction hit area */}
              <circle
                cx={x}
                cy={y}
                r={hitRadius}
                fill="transparent"
                style={{ pointerEvents: "all" }}
                onMouseEnter={() => {
                  if (!selectedPlayerId) {
                    setHoveredNode(node);
                  }
                }}
                onMouseLeave={() => {
                  if (!selectedPlayerId) {
                    setHoveredNode(null);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  const nextSelectedId = selectedPlayerId === node.id ? null : node.id;
                  onPlayerSelect(nextSelectedId);
                  setHoveredEdge(null);
                  setHoveredNode(nextSelectedId ? node : null);
                }}
                cursor="pointer"
              />
              {/* Shirt number */}
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize={radius > 18 ? "14" : "12"}
                fontWeight="bold"
                pointerEvents="none"
                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
              >
                {node.shirtNumber || "?"}
              </text>
              {/* Player name label for selected */}
              {isSelected && (
                <g>
                  <rect
                    x={x - 40}
                    y={y + radius + 8}
                    width="80"
                    height="20"
                    rx="10"
                    fill="rgba(15, 25, 35, 0.95)"
                    stroke={SELECTED_COLOR}
                    strokeWidth="2"
                    style={{ filter: "url(#glow)" }}
                  />
                  <text
                    x={x}
                    y={y + radius + 22}
                    textAnchor="middle"
                    fill={SELECTED_COLOR}
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {node.name}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Enhanced Tooltip */}
      {(!selectedPlayerId && (hoveredEdge || hoveredNode)) && tooltipPos && (
        <div
          className="absolute pointer-events-none z-50 rounded-xl bg-gradient-to-br from-[#0f1923] to-[#0a1520] border border-white/20 p-4 shadow-2xl backdrop-blur-sm transition-all duration-200"
          style={{
            left: `${tooltipPos.x + 15}px`,
            top: `${tooltipPos.y + 15}px`,
            transform: tooltipPos.x > width - 250 ? "translateX(-100%)" : "none",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)",
          }}
        >
          {hoveredEdge && (() => {
            const fromNode = network.nodes.find((n) => n.id === hoveredEdge.from);
            const toNode = network.nodes.find((n) => n.id === hoveredEdge.to);
            return (
              <div className="text-xs text-white space-y-2">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: teamColor }} />
                  <div className="font-bold text-sm">
                    #{fromNode?.shirtNumber || "?"} → #{toNode?.shirtNumber || "?"}
                  </div>
                </div>
                <div className="space-y-1 text-white/80">
                  <div className="flex justify-between">
                    <span className="text-white/60">Passes:</span>
                    <span className="font-semibold">{hoveredEdge.count}</span>
                  </div>
                  {hoveredEdge.accuracy && (
                    <div className="flex justify-between">
                      <span className="text-white/60">Accuracy:</span>
                      <span className="font-semibold text-green-400">{(hoveredEdge.accuracy * 100).toFixed(0)}%</span>
                    </div>
                  )}
                  {hoveredEdge.avgLengthM && (
                    <div className="flex justify-between">
                      <span className="text-white/60">Avg Length:</span>
                      <span className="font-semibold">{hoveredEdge.avgLengthM.toFixed(1)}m</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          {hoveredNode && (
            <div className="text-xs text-white space-y-2">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: teamColor }} />
                <div className="font-bold text-sm">
                  #{hoveredNode.shirtNumber || "?"} {hoveredNode.name}
                </div>
              </div>
              {hoveredNode.position && (
                <div className="text-white/80">
                  <span className="text-white/60">Position: </span>
                  <span className="font-semibold">{hoveredNode.position}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface PlayerOverviewProps {
  network: PassNetwork;
  selectedPlayerId: PlayerId | null;
  players: PassNetworkProps["players"];
  teamColor: string;
  onClearSelection: () => void;
}

function PlayerOverview({ network, selectedPlayerId, players, teamColor, onClearSelection }: PlayerOverviewProps) {
  const playerStats = useMemo(() => {
    if (!selectedPlayerId) return null;

    const player = players.find((p) => p.id.toString() === selectedPlayerId);
    if (!player) return null;

    const sent = network.edges.filter((e) => e.from === selectedPlayerId);
    const received = network.edges.filter((e) => e.to === selectedPlayerId);
    const totalSent = sent.reduce((sum, e) => sum + e.count, 0);
    const totalReceived = received.reduce((sum, e) => sum + e.count, 0);
    const accuracy = sent.length > 0
      ? sent.reduce((sum, e) => sum + (e.accuracy || 1) * e.count, 0) / totalSent
      : 0;

    // Top receivers
    const receivers = new Map<PlayerId, number>();
    sent.forEach((e) => {
      receivers.set(e.to, (receivers.get(e.to) || 0) + e.count);
    });
    const topReceivers = Array.from(receivers.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => {
        const edge = sent.find((e) => e.to === id);
        const receiver = players.find((p) => p.id.toString() === id);
        return {
          id,
          name: receiver?.name || `Player ${id}`,
          number: receiver?.number || 0,
          count,
          accuracy: edge?.accuracy || 0,
        };
      });

    // Top senders
    const senders = new Map<PlayerId, number>();
    received.forEach((e) => {
      senders.set(e.from, (senders.get(e.from) || 0) + e.count);
    });
    const topSenders = Array.from(senders.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => {
        const edge = received.find((e) => e.from === id);
        const sender = players.find((p) => p.id.toString() === id);
        return {
          id,
          name: sender?.name || `Player ${id}`,
          number: sender?.number || 0,
          count,
          accuracy: edge?.accuracy || 0,
        };
      });

    return {
      player,
      totalSent,
      totalReceived,
      accuracy,
      topReceivers,
      topSenders,
    };
  }, [network, selectedPlayerId, players]);

  if (!selectedPlayerId) {
    return (
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#111d2a] to-[#0a1520] p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 opacity-30">👆</div>
          <p className="text-sm font-semibold text-white/60 mb-1">Player Overview</p>
          <p className="text-xs text-white/40">Select a player to view details</p>
        </div>
      </div>
    );
  }

  if (!playerStats) {
    return (
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#111d2a] to-[#0a1520] p-6 h-full">
        <p className="text-sm font-semibold text-white mb-4">Player Overview</p>
        <div className="text-sm text-white/50">Player not found</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#111d2a] to-[#0a1520] p-6 h-full flex flex-col shadow-xl">
      <div className="mb-5">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-base font-bold text-white">Player Overview</p>
          <button
            type="button"
            onClick={onClearSelection}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-white/80 hover:bg-white/10"
          >
            Unlock
          </button>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
      
      <div className="space-y-5 flex-1 overflow-y-auto">
        {/* Player Info with gradient */}
        <div className="relative rounded-xl border border-white/5 bg-gradient-to-br from-[#0a1520] to-[#050a10] p-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-50" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-5 h-5 rounded-full shadow-lg"
                style={{ 
                  background: teamColor === HOME_COLOR ? HOME_GRADIENT : AWAY_GRADIENT,
                  boxShadow: `0 0 12px ${teamColor}40`
                }}
              />
              <p className="text-lg font-bold text-white">
                #{playerStats.player.number || "?"} {playerStats.player.name}
              </p>
            </div>
            {playerStats.player.position && (
              <p className="text-xs text-white/60 ml-8">Position: {playerStats.player.position}</p>
            )}
          </div>
        </div>

        {/* KPIs with enhanced styling */}
        <div className="grid grid-cols-2 gap-3">
          <div className="group relative rounded-xl border border-white/5 bg-gradient-to-br from-[#0a1520] to-[#050a10] p-4 transition-all duration-300 hover:border-white/10 hover:shadow-lg">
            <p className="text-[10px] text-white/60 mb-2 uppercase tracking-wider">Passes Sent</p>
            <p className="text-2xl font-bold text-white">{playerStats.totalSent}</p>
          </div>
          <div className="group relative rounded-xl border border-white/5 bg-gradient-to-br from-[#0a1520] to-[#050a10] p-4 transition-all duration-300 hover:border-white/10 hover:shadow-lg">
            <p className="text-[10px] text-white/60 mb-2 uppercase tracking-wider">Passes Received</p>
            <p className="text-2xl font-bold text-white">{playerStats.totalReceived}</p>
          </div>
          <div className="group relative rounded-xl border border-white/5 bg-gradient-to-br from-[#0a1520] to-[#050a10] p-4 col-span-2 transition-all duration-300 hover:border-white/10 hover:shadow-lg">
            <p className="text-[10px] text-white/60 mb-2 uppercase tracking-wider">Pass Accuracy</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              {(playerStats.accuracy * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Top Receivers */}
        {playerStats.topReceivers.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-white/80 mb-3 uppercase tracking-wider">Top Receivers</p>
            <div className="space-y-2">
              {playerStats.topReceivers.map((r, idx) => (
                <div
                  key={r.id}
                  className="group relative rounded-lg border border-white/5 bg-gradient-to-br from-[#0a1520] to-[#050a10] p-3 text-xs transition-all duration-300 hover:border-white/10 hover:shadow-md"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      <span className="text-white font-medium">
                        #{r.number} {r.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-semibold">{r.count}</span>
                      <span className="text-white/50 ml-1">passes</span>
                      <div className="text-green-400 text-[10px]">{(r.accuracy * 100).toFixed(0)}% acc</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Senders */}
        {playerStats.topSenders.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-white/80 mb-3 uppercase tracking-wider">Top Senders</p>
            <div className="space-y-2">
              {playerStats.topSenders.map((s, idx) => (
                <div
                  key={s.id}
                  className="group relative rounded-lg border border-white/5 bg-gradient-to-br from-[#0a1520] to-[#050a10] p-3 text-xs transition-all duration-300 hover:border-white/10 hover:shadow-md"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: teamColor }} />
                      <span className="text-white font-medium">
                        #{s.number} {s.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-semibold">{s.count}</span>
                      <span className="text-white/50 ml-1">passes</span>
                      <div className="text-green-400 text-[10px]">{(s.accuracy * 100).toFixed(0)}% acc</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PassNetwork({
  events,
  players,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
}: PassNetworkProps) {
  const [selectedTeam, setSelectedTeam] = useState<"home" | "away">("home");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<PlayerId[]>([]);
  const [minCount, setMinCount] = useState(1);
  const [half, setHalf] = useState<Half>("all");
  const [direction, setDirection] = useState<"all" | "L2R" | "R2L">("all");
  const [selectedPlayerId, setSelectedPlayerId] = useState<PlayerId | null>(null);

  // Build team player pools to avoid cross-team links in inferred receivers.
  const { homePlayers, awayPlayers } = useMemo(() => {
    const explicitHome = players.filter((p) => p.teamId !== undefined && p.teamId !== null && homeTeamId !== null && p.teamId === homeTeamId);
    const explicitAway = players.filter((p) => p.teamId !== undefined && p.teamId !== null && awayTeamId !== null && p.teamId === awayTeamId);

    // Fallback for legacy/demo data: infer by event ownership if teamId is missing.
    if (explicitHome.length > 0 || explicitAway.length > 0) {
      return { homePlayers: explicitHome, awayPlayers: explicitAway };
    }

    const homeIds = new Set(
      events.filter((e) => e.team === "home" && e.playerId !== null).map((e) => String(e.playerId))
    );
    const awayIds = new Set(
      events.filter((e) => e.team === "away" && e.playerId !== null).map((e) => String(e.playerId))
    );
    return {
      homePlayers: players.filter((p) => homeIds.has(String(p.id))),
      awayPlayers: players.filter((p) => awayIds.has(String(p.id))),
    };
  }, [players, events, homeTeamId, awayTeamId]);

  const teamPlayers = selectedTeam === "home" ? homePlayers : awayPlayers;

  // Build networks
  const homeNetwork = useMemo(
    () =>
      buildPassNetwork(events, homePlayers, "home", {
        teamId: "home",
        playerIds: selectedPlayerIds.length > 0 ? selectedPlayerIds : undefined,
        minCount,
        half,
        direction,
      }),
    [events, homePlayers, selectedPlayerIds, minCount, half, direction]
  );

  const awayNetwork = useMemo(
    () =>
      buildPassNetwork(events, awayPlayers, "away", {
        teamId: "away",
        playerIds: selectedPlayerIds.length > 0 ? selectedPlayerIds : undefined,
        minCount,
        half,
        direction,
      }),
    [events, awayPlayers, selectedPlayerIds, minCount, half, direction]
  );

  const currentNetwork = selectedTeam === "home" ? homeNetwork : awayNetwork;
  const teamColor = selectedTeam === "home" ? HOME_COLOR : AWAY_COLOR;
  const teamName = selectedTeam === "home" ? homeTeamName : awayTeamName;

  // Get top passers for quick select
  const topPassers = useMemo(() => {
    const passCounts = new Map<PlayerId, number>();
    currentNetwork.edges.forEach((e) => {
      passCounts.set(e.from, (passCounts.get(e.from) || 0) + e.count);
      passCounts.set(e.to, (passCounts.get(e.to) || 0) + e.count);
    });
    return Array.from(passCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 11)
      .map(([id]) => id);
  }, [currentNetwork]);

  return (
    <div className="space-y-6">
      {/* Enhanced Filters */}
      <div className="group relative rounded-2xl border border-white/5 bg-gradient-to-br from-[#111d2a] to-[#0a1520] p-5 shadow-xl transition-all duration-300 hover:border-white/10">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 to-red-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-5" />
        <div className="relative z-10">
          <div className="mb-4">
            <p className="text-sm font-bold text-white mb-1">Filters</p>
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Team */}
            <div>
              <label className="text-xs text-white/70 mb-2 block font-medium">Team</label>
              <select
                value={selectedTeam}
                onChange={(e) => {
                  setSelectedTeam(e.target.value as "home" | "away");
                  setSelectedPlayerId(null);
                  setSelectedPlayerIds([]);
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a1520] border border-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 hover:border-white/10"
              >
                <option value="home">{homeTeamName}</option>
                <option value="away">{awayTeamName}</option>
              </select>
            </div>

            {/* Half */}
            <div>
              <label className="text-xs text-white/70 mb-2 block font-medium">Half</label>
              <select
                value={half}
                onChange={(e) => setHalf(e.target.value as Half)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a1520] border border-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 hover:border-white/10"
              >
                <option value="all">All</option>
                <option value="1H">1st Half</option>
                <option value="2H">2nd Half</option>
              </select>
            </div>

            {/* Min Count */}
            <div>
              <label className="text-xs text-white/70 mb-2 block font-medium">Min Count: {minCount}</label>
              <input
                type="range"
                min="1"
                max="8"
                value={minCount}
                onChange={(e) => setMinCount(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Direction */}
            <div>
              <label className="text-xs text-white/70 mb-2 block font-medium">Direction</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as "all" | "L2R" | "R2L")}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a1520] border border-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 hover:border-white/10"
              >
                <option value="all">All</option>
                <option value="L2R">Left to Right</option>
                <option value="R2L">Right to Left</option>
              </select>
            </div>

            {/* Players Quick Select */}
            <div>
              <label className="text-xs text-white/70 mb-2 block font-medium">Players</label>
              <select
                multiple
                value={selectedPlayerIds}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, (opt) => opt.value);
                  setSelectedPlayerIds(values);
                }}
                className="w-full px-3 py-2 rounded-xl bg-[#0a1520] border border-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 hover:border-white/10"
                size={3}
              >
                {teamPlayers.map((p) => (
                  <option key={p.id} value={p.id.toString()}>
                    #{p.number || "?"} {p.name}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setSelectedPlayerIds(topPassers)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all duration-200 font-medium"
                >
                  Top Passers
                </button>
                <button
                  onClick={() => setSelectedPlayerIds([])}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 transition-all duration-200 font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Pass Map */}
        <div className="group relative rounded-2xl border border-white/5 bg-gradient-to-br from-[#111d2a] to-[#0a1520] p-5 shadow-xl transition-all duration-300 hover:border-white/10">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 to-red-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-5" />
          <div className="relative z-10">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-white mb-1">{teamName} - Pass Network</p>
                <p className="text-xs text-white/50">
                  {currentNetwork.totalPasses} total passes • {currentNetwork.edges.length} connections
                </p>
              </div>
            </div>
            <div className="relative" style={{ minHeight: "520px" }}>
              <PassMap
                network={currentNetwork}
                teamColor={teamColor}
                selectedPlayerId={selectedPlayerId}
                onPlayerSelect={setSelectedPlayerId}
              />
            </div>
          </div>
        </div>

        {/* Player Overview */}
        <PlayerOverview
          network={currentNetwork}
          selectedPlayerId={selectedPlayerId}
          players={players}
          teamColor={teamColor}
          onClearSelection={() => setSelectedPlayerId(null)}
        />
      </div>
    </div>
  );
}
