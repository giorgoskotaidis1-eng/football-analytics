"use client";

import React, { useMemo, useState, useCallback } from "react";

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
  for (const [key, value] of Object.entries(DEFAULT_POSITIONS)) {
    if (pos.includes(key)) return value;
  }
  return { x: 0.5, y: 0.5 };
}

function buildPassNetwork(
  events: PassNetworkProps["events"],
  players: PassNetworkProps["players"],
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

  passes.forEach((pass) => {
    if (!pass.playerId) return;

    const fromId = pass.playerId.toString();
    
    // Get receiver from metadata
    let toId: PlayerId | null = null;
    if (pass.metadata) {
      try {
        const meta = JSON.parse(pass.metadata);
        toId = meta.toId?.toString() || meta.toPlayerId?.toString() || meta.receiverId?.toString() || null;
      } catch {
        // Invalid JSON
      }
    }

    // Track position
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

    // Track sent passes
    const stats = playerPassCounts.get(fromId) || { sent: 0, received: 0 };
    playerPassCounts.set(fromId, { ...stats, sent: stats.sent + 1 });

    if (toId && toId !== fromId) {
      const key = `${fromId}-${toId}`;
      const edge = edgeMap.get(key) || {
        from: fromId,
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

  // Build nodes
  const nodeMap = new Map<PlayerId, PlayerNode>();
  const allowedPlayerIds = filters.playerIds?.length
    ? new Set(filters.playerIds)
    : null;

  players.forEach((p) => {
    if (allowedPlayerIds && !allowedPlayerIds.has(p.id.toString())) {
      return;
    }

    const playerId = p.id.toString();
    const pos = normalizedPositions.get(playerId) || getDefaultPosition(p.position);
    
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

  const maxCount = useMemo(() => Math.max(...network.edges.map((e) => e.count), 1), [network.edges]);
  const maxDegree = useMemo(() => {
    const degrees = new Map<PlayerId, number>();
    network.edges.forEach((e) => {
      degrees.set(e.from, (degrees.get(e.from) || 0) + e.count);
      degrees.set(e.to, (degrees.get(e.to) || 0) + e.count);
    });
    return Math.max(...Array.from(degrees.values()), 1);
  }, [network.edges]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

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
        {network.edges.map((edge, idx) => {
          const fromNode = network.nodes.find((n) => n.id === edge.from);
          const toNode = network.nodes.find((n) => n.id === edge.to);
          if (!fromNode || !toNode || !fromNode.x || !fromNode.y || !toNode.x || !toNode.y) return null;

          const x1 = fromNode.x * width;
          const y1 = fromNode.y * height;
          const x2 = toNode.x * width;
          const y2 = toNode.y * height;

          const strokeWidth = 1.5 + 4 * (edge.count / maxCount);
          const baseOpacity = 0.3 + 0.6 * (edge.accuracy || 1);
          const isHovered = hoveredEdge === edge;
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
                filter: isHovered ? "url(#glowStrong)" : "none",
                transition: "opacity 0.2s ease, filter 0.2s ease",
              }}
              onMouseEnter={() => setHoveredEdge(edge)}
              onMouseLeave={() => setHoveredEdge(null)}
              cursor="pointer"
            />
          );
        })}

        {/* Nodes with enhanced styling */}
        {network.nodes.map((node) => {
          if (!node.x || !node.y) return null;

          const degree = network.edges.reduce((sum, e) => {
            if (e.from === node.id || e.to === node.id) return sum + e.count;
            return sum;
          }, 0);

          const radius = 14 + 4 * Math.sqrt(degree / maxDegree);
          const x = node.x * width;
          const y = node.y * height;
          const isSelected = selectedPlayerId === node.id;
          const isHovered = hoveredNode === node;

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
                  transform: isHovered ? "scale(1.1)" : "scale(1)",
                }}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => onPlayerSelect(isSelected ? null : node.id)}
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
      {(hoveredEdge || hoveredNode) && tooltipPos && (
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
}

function PlayerOverview({ network, selectedPlayerId, players, teamColor }: PlayerOverviewProps) {
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
        <p className="text-base font-bold text-white mb-1">Player Overview</p>
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
  const [minCount, setMinCount] = useState(2);
  const [half, setHalf] = useState<Half>("all");
  const [direction, setDirection] = useState<"all" | "L2R" | "R2L">("all");
  const [selectedPlayerId, setSelectedPlayerId] = useState<PlayerId | null>(null);

  // Get team players (simplified - show all players, filtering happens in buildPassNetwork by team in events)
  const teamPlayers = useMemo(() => {
    return players;
  }, [players]);

  // Build networks
  const homeNetwork = useMemo(
    () =>
      buildPassNetwork(events, players, "home", {
        teamId: "home",
        playerIds: selectedPlayerIds.length > 0 ? selectedPlayerIds : undefined,
        minCount,
        half,
        direction,
      }),
    [events, players, selectedPlayerIds, minCount, half, direction]
  );

  const awayNetwork = useMemo(
    () =>
      buildPassNetwork(events, players, "away", {
        teamId: "away",
        playerIds: selectedPlayerIds.length > 0 ? selectedPlayerIds : undefined,
        minCount,
        half,
        direction,
      }),
    [events, players, selectedPlayerIds, minCount, half, direction]
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
                <option value="">All Players</option>
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
        />
      </div>
    </div>
  );
}
