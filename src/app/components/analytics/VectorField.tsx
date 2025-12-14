"use client";

import React, { useMemo, useState, useCallback } from "react";

type TeamId = string;
type PlayerId = string;
type Half = "1H" | "2H" | "all";
type Direction = "L2R" | "R2L" | "all";

interface MovementVector {
  teamId: TeamId;
  playerId: PlayerId;
  startX: number; // 0..1
  startY: number; // 0..1
  endX: number;
  endY: number;
  half?: Half;
  speedMps?: number;
  distanceM?: number;
  eventType?: string;
  subType?: string;
}

interface VectorFieldProps {
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
const AWAY_COLOR = "#f25c54";

function buildVectors(
  events: VectorFieldProps["events"],
  players: VectorFieldProps["players"],
  team: "home" | "away",
  filters: {
    attribute?: "passing" | "carrying" | "all";
    subAttribute?: string;
    eventType?: string;
    playerIds?: PlayerId[];
    half?: Half;
    minDistance?: number;
    normalizeDirection?: boolean;
  }
): MovementVector[] {
  // Filter events by team and type
  let filteredEvents = events.filter(
    (e) => e.team === team && e.playerId !== null && e.x !== null && e.y !== null && e.minute !== null
  );

  // Filter by half
  if (filters.half === "1H") {
    filteredEvents = filteredEvents.filter((e) => e.minute !== null && e.minute < 45);
  } else if (filters.half === "2H") {
    filteredEvents = filteredEvents.filter((e) => e.minute !== null && e.minute >= 45);
  }

  // Filter by attribute/event type
  if (filters.attribute === "passing") {
    filteredEvents = filteredEvents.filter((e) => e.type === "pass");
  } else if (filters.attribute === "carrying") {
    filteredEvents = filteredEvents.filter((e) => e.type === "carry" || e.type === "dribble");
  }

  if (filters.eventType && filters.eventType !== "all") {
    filteredEvents = filteredEvents.filter((e) => e.type === filters.eventType);
  }

  // Filter by players
  if (filters.playerIds && filters.playerIds.length > 0) {
    const allowedIds = new Set(filters.playerIds);
    filteredEvents = filteredEvents.filter((e) => e.playerId && allowedIds.has(e.playerId.toString()));
  }

  // Build vectors from consecutive events or from metadata
  const vectors: MovementVector[] = [];
  const eventsByPlayer = new Map<PlayerId, typeof filteredEvents>();

  filteredEvents.forEach((e) => {
    if (!e.playerId) return;
    const playerId = e.playerId.toString();
    if (!eventsByPlayer.has(playerId)) {
      eventsByPlayer.set(playerId, []);
    }
    eventsByPlayer.get(playerId)!.push(e);
  });

  eventsByPlayer.forEach((playerEvents, playerId) => {
    // Sort by minute
    const sorted = [...playerEvents].sort((a, b) => (a.minute || 0) - (b.minute || 0));

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      if (!current.x || !current.y || !next.x || !next.y) continue;

      // Only create vector if events are close in time (same minute or adjacent)
      const timeDiff = (next.minute || 0) - (current.minute || 0);
      if (timeDiff > 1) continue; // Skip if more than 1 minute apart

      const startX = current.x / 100; // Normalize to 0-1
      const startY = current.y / 100;
      const endX = next.x / 100;
      const endY = next.y / 100;

      // Calculate distance (assuming pitch is ~105m x 68m)
      const dx = (endX - startX) * 105;
      const dy = (endY - startY) * 68;
      const distanceM = Math.sqrt(dx * dx + dy * dy);

      // Filter by min distance
      if (filters.minDistance && distanceM < filters.minDistance) continue;

      // Calculate speed (assume ~2 seconds between events)
      const speedMps = distanceM / 2;

      // Normalize direction if needed (mirror for away team if attacking left-to-right)
      let finalStartX = startX;
      let finalEndX = endX;
      if (filters.normalizeDirection && team === "away") {
        // Mirror horizontally for away team
        finalStartX = 1 - startX;
        finalEndX = 1 - endX;
      }

      // Get event metadata
      let eventType = current.type;
      let subType: string | undefined;
      if (current.metadata) {
        try {
          const meta = JSON.parse(current.metadata);
          subType = meta.subType || meta.progressive || undefined;
        } catch {
          // Invalid JSON
        }
      }

      // Filter by sub-attribute
      if (filters.subAttribute && filters.subAttribute !== "all") {
        if (filters.subAttribute === "progressive" && subType !== "progressive") continue;
        if (filters.subAttribute === "backward" && subType !== "backward") continue;
      }

      vectors.push({
        teamId: team,
        playerId,
        startX: finalStartX,
        startY,
        endX: finalEndX,
        endY,
        half: (current.minute || 0) < 45 ? "1H" : "2H",
        speedMps,
        distanceM,
        eventType,
        subType,
      });
    }
  });

  return vectors;
}

interface VectorPitchProps {
  vectors: MovementVector[];
  teamColor: string;
  teamName: string;
  width?: number;
  height?: number;
}

function VectorPitch({ vectors, teamColor, teamName, width = 900, height = 520 }: VectorPitchProps) {
  const [hoveredVector, setHoveredVector] = useState<MovementVector | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const maxDistance = useMemo(() => Math.max(...vectors.map((v) => v.distanceM || 0), 1), [vectors]);
  const maxSpeed = useMemo(() => Math.max(...vectors.map((v) => v.speedMps || 0), 1), [vectors]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const totalVectors = vectors.length;
    const meanMagnitude = vectors.length > 0
      ? vectors.reduce((sum, v) => sum + (v.distanceM || 0), 0) / vectors.length
      : 0;

    // Calculate net direction
    const sumDx = vectors.reduce((sum, v) => sum + (v.endX - v.startX), 0);
    const sumDy = vectors.reduce((sum, v) => sum + (v.endY - v.startY), 0);
    const netDirection = Math.atan2(sumDy, sumDx) * (180 / Math.PI);

    return { totalVectors, meanMagnitude, netDirection };
  }, [vectors]);

  if (vectors.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 opacity-50">⚡</div>
          <p className="text-white/50 text-sm font-medium">Δεν υπάρχουν διανύσματα για αυτό το φίλτρο</p>
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
          setHoveredVector(null);
          setTooltipPos(null);
        }}
      >
        <defs>
          <marker
            id={`arrowhead-${teamColor}`}
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3, 0 6"
              fill={teamColor}
            />
          </marker>
          <linearGradient id="pitchGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f1923" stopOpacity="1" />
            <stop offset="100%" stopColor="#0a1520" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Pitch background */}
        <rect x="0" y="0" width={width} height={height} fill="url(#pitchGradient)" />
        
        {/* Pitch lines */}
        <g stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" fill="none" opacity="0.6">
          <rect x="6" y="6" width={width - 12} height={height - 12} rx="12" />
          <line x1={width / 2} y1="0" x2={width / 2} y2={height} strokeWidth="3" />
          <rect x="6" y={height * 0.3} width={width * 0.1} height={height * 0.4} rx="4" />
          <rect x={width - 6 - width * 0.1} y={height * 0.3} width={width * 0.1} height={height * 0.4} rx="4" />
          <circle cx={width / 2} cy={height / 2} r={height * 0.12} />
        </g>

        {/* Vectors */}
        {vectors.map((vector, idx) => {
          const x1 = vector.startX * width;
          const y1 = vector.startY * height;
          const x2 = vector.endX * width;
          const y2 = vector.endY * height;

          const distance = vector.distanceM || 0;
          const speed = vector.speedMps || 0;
          const distanceNorm = distance / maxDistance;
          const speedNorm = speed / maxSpeed;

          // Arrow length (clamped)
          const baseLength = 20;
          const maxLength = 80;
          const pxLength = Math.min(maxLength, baseLength + 60 * distanceNorm);

          // Calculate actual line length
          const dx = x2 - x1;
          const dy = y2 - y1;
          const actualLength = Math.sqrt(dx * dx + dy * dy);

          // Scale if needed
          let finalX2 = x2;
          let finalY2 = y2;
          if (actualLength > pxLength) {
            const scale = pxLength / actualLength;
            finalX2 = x1 + dx * scale;
            finalY2 = y1 + dy * scale;
          }

          const opacity = 0.35 + 0.5 * speedNorm;
          const isHovered = hoveredVector === vector;
          const strokeWidth = isHovered ? 3 : 1.5 + distanceNorm;

          // Color based on event type
          let strokeColor = teamColor;
          if (vector.eventType === "pass") {
            strokeColor = teamColor;
          } else if (vector.eventType === "carry" || vector.eventType === "dribble") {
            strokeColor = "#10b981"; // Green for carries
          } else if (vector.subType === "progressive") {
            strokeColor = "#f59e0b"; // Amber for progressive
          }

          return (
            <line
              key={idx}
              x1={x1}
              y1={y1}
              x2={finalX2}
              y2={finalY2}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              opacity={isHovered ? 1 : opacity}
              markerEnd={`url(#arrowhead-${teamColor})`}
              style={{
                transition: "opacity 0.2s ease, stroke-width 0.2s ease",
                filter: isHovered ? "url(#glow)" : "none",
              }}
              onMouseEnter={() => setHoveredVector(vector)}
              onMouseLeave={() => setHoveredVector(null)}
              cursor="pointer"
            />
          );
        })}

        {/* Glow filter */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Attack Direction Arrow */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/60 text-xs">
        <svg width="60" height="20" viewBox="0 0 60 20">
          <path d="M 0 10 L 50 10" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M 45 5 L 50 10 L 45 15" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
        <span className="font-medium">Attack Direction</span>
      </div>

      {/* Tooltip */}
      {hoveredVector && tooltipPos && (
        <div
          className="absolute pointer-events-none z-50 rounded-xl bg-gradient-to-br from-[#0f1923] to-[#0a1520] border border-white/20 p-4 shadow-2xl backdrop-blur-sm transition-all duration-200"
          style={{
            left: `${tooltipPos.x + 15}px`,
            top: `${tooltipPos.y + 15}px`,
            transform: tooltipPos.x > width - 250 ? "translateX(-100%)" : "none",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)",
          }}
        >
          <div className="text-xs text-white space-y-2">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: teamColor }} />
              <div className="font-bold text-sm">Movement Vector</div>
            </div>
            <div className="space-y-1 text-white/80">
              <div className="flex justify-between">
                <span className="text-white/60">Distance:</span>
                <span className="font-semibold">{(hoveredVector.distanceM || 0).toFixed(1)}m</span>
              </div>
              {hoveredVector.speedMps && (
                <div className="flex justify-between">
                  <span className="text-white/60">Speed:</span>
                  <span className="font-semibold">{(hoveredVector.speedMps).toFixed(1)} m/s</span>
                </div>
              )}
              {hoveredVector.eventType && (
                <div className="flex justify-between">
                  <span className="text-white/60">Type:</span>
                  <span className="font-semibold">{hoveredVector.eventType}</span>
                </div>
              )}
              {hoveredVector.subType && (
                <div className="flex justify-between">
                  <span className="text-white/60">Sub-type:</span>
                  <span className="font-semibold">{hoveredVector.subType}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats overlay */}
      <div className="absolute bottom-12 left-4 right-4 flex justify-between items-end text-xs text-white/70">
        <div className="space-y-1">
          <div>Total Vectors: <span className="font-semibold text-white">{stats.totalVectors}</span></div>
          <div>Mean Magnitude: <span className="font-semibold text-white">{stats.meanMagnitude.toFixed(2)}m</span></div>
        </div>
        <div className="flex items-center gap-2">
          <span>Direction:</span>
          <svg width="40" height="20" viewBox="0 0 40 20" style={{ transform: `rotate(${stats.netDirection}deg)` }}>
            <path d="M 0 10 L 30 10" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M 25 5 L 30 10 L 25 15" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function VectorField({
  events,
  players,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
}: VectorFieldProps) {
  const [homeAttribute, setHomeAttribute] = useState<"passing" | "carrying" | "all">("passing");
  const [awayAttribute, setAwayAttribute] = useState<"passing" | "carrying" | "all">("passing");
  const [homeSubAttribute, setHomeSubAttribute] = useState("all");
  const [awaySubAttribute, setAwaySubAttribute] = useState("all");
  const [homeEventType, setHomeEventType] = useState("all");
  const [awayEventType, setAwayEventType] = useState("all");
  const [homePlayerIds, setHomePlayerIds] = useState<PlayerId[]>([]);
  const [awayPlayerIds, setAwayPlayerIds] = useState<PlayerId[]>([]);
  const [half, setHalf] = useState<Half>("all");
  const [minDistance, setMinDistance] = useState(5);
  const [normalizeDirection, setNormalizeDirection] = useState(false);
  const [showSpotlight, setShowSpotlight] = useState(false);

  // Build vectors for both teams
  const homeVectors = useMemo(
    () =>
      buildVectors(events, players, "home", {
        attribute: homeAttribute,
        subAttribute: homeSubAttribute,
        eventType: homeEventType === "all" ? undefined : homeEventType,
        playerIds: homePlayerIds.length > 0 ? homePlayerIds : undefined,
        half,
        minDistance,
        normalizeDirection,
      }),
    [events, players, homeAttribute, homeSubAttribute, homeEventType, homePlayerIds, half, minDistance, normalizeDirection]
  );

  const awayVectors = useMemo(
    () =>
      buildVectors(events, players, "away", {
        attribute: awayAttribute,
        subAttribute: awaySubAttribute,
        eventType: awayEventType === "all" ? undefined : awayEventType,
        playerIds: awayPlayerIds.length > 0 ? awayPlayerIds : undefined,
        half,
        minDistance,
        normalizeDirection,
      }),
    [events, players, awayAttribute, awaySubAttribute, awayEventType, awayPlayerIds, half, minDistance, normalizeDirection]
  );

  // Filter players by team based on events
  const homePlayers = useMemo(() => {
    const homePlayerIds = new Set<number>();
    events.forEach((e) => {
      if (e.team === "home" && e.playerId) {
        homePlayerIds.add(e.playerId);
      }
    });
    return players.filter((p) => homePlayerIds.has(p.id));
  }, [events, players]);

  const awayPlayers = useMemo(() => {
    const awayPlayerIds = new Set<number>();
    events.forEach((e) => {
      if (e.team === "away" && e.playerId) {
        awayPlayerIds.add(e.playerId);
      }
    });
    return players.filter((p) => awayPlayerIds.has(p.id));
  }, [events, players]);

  const homePlayerCount = useMemo(() => {
    const unique = new Set(homeVectors.map((v) => v.playerId));
    return unique.size;
  }, [homeVectors]);

  const awayPlayerCount = useMemo(() => {
    const unique = new Set(awayVectors.map((v) => v.playerId));
    return unique.size;
  }, [awayVectors]);

  return (
    <div className="space-y-6">
      {/* Filters for both teams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Home Team Filters */}
        <div className="group relative rounded-2xl border border-white/5 bg-gradient-to-br from-[#111d2a] to-[#0a1520] p-5 shadow-xl transition-all duration-300 hover:border-white/10">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-5" />
          <div className="relative z-10">
            <div className="mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg" style={{ background: `linear-gradient(135deg, ${HOME_COLOR} 0%, #2563eb 100%)` }}>
                🏠
              </div>
              <div>
                <p className="text-base font-bold text-white">{homeTeamName}</p>
                <p className="text-xs text-white/50">Εντός Εδρας</p>
              </div>
            </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="group/item">
              <label className="text-xs text-white/70 mb-2 block font-medium flex items-center gap-2">
                <span className="text-base">📊</span>
                <span>Attribute</span>
              </label>
              <select
                value={homeAttribute}
                onChange={(e) => setHomeAttribute(e.target.value as "passing" | "carrying" | "all")}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a1520] border border-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 hover:border-white/10"
              >
                <option value="passing">⚽ Passing</option>
                <option value="carrying">🏃 Carrying</option>
                <option value="all">🔀 All</option>
              </select>
            </div>
            <div className="group/item">
              <label className="text-xs text-white/70 mb-2 block font-medium flex items-center gap-2">
                <span className="text-base">🎯</span>
                <span>Sub Attribute</span>
              </label>
              <select
                value={homeSubAttribute}
                onChange={(e) => setHomeSubAttribute(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a1520] border border-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 hover:border-white/10"
              >
                <option value="all">🔀 All</option>
                <option value="progressive">⬆️ Progressive</option>
                <option value="backward">⬇️ Backward</option>
              </select>
            </div>
            <div className="group/item">
              <label className="text-xs text-white/70 mb-2 block font-medium flex items-center gap-2">
                <span className="text-base">⚡</span>
                <span>Events</span>
              </label>
              <select
                value={homeEventType}
                onChange={(e) => setHomeEventType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a1520] border border-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 hover:border-white/10"
              >
                <option value="all">🔀 All</option>
                <option value="pass">⚽ Pass</option>
                <option value="carry">🏃 Carry</option>
                <option value="dribble">🎨 Dribble</option>
              </select>
            </div>
            <div className="group/item">
              <label className="text-xs text-white/70 mb-2 block font-medium flex items-center gap-2">
                <span className="text-base">👥</span>
                <span>Players</span>
              </label>
              <select
                multiple
                value={homePlayerIds}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, (opt) => opt.value);
                  setHomePlayerIds(values);
                }}
                className="w-full px-3 py-2 rounded-xl bg-[#0a1520] border border-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 hover:border-white/10"
                size={3}
              >
                <option value="">👥 All Players ({homePlayers.length})</option>
                {homePlayers.map((p) => (
                  <option key={p.id} value={p.id.toString()}>
                    #{p.number || "?"} {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-xl bg-gradient-to-br from-[#0a1520] to-[#050a10] border border-white/5 shadow-inner">
            <div className="flex items-center gap-2">
              <span className="text-base">📈</span>
              <p className="text-xs text-white/70">
                Showing data for <span className="font-bold text-white">{homePlayerCount}</span> out of <span className="font-bold text-white">{homePlayers.length}</span> Players
              </p>
            </div>
          </div>
          </div>
        </div>

        {/* Away Team Filters */}
        <div className="group relative rounded-2xl border border-white/5 bg-gradient-to-br from-[#111d2a] to-[#0a1520] p-5 shadow-xl transition-all duration-300 hover:border-white/10">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500/0 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-5" />
          <div className="relative z-10">
            <div className="mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg" style={{ background: `linear-gradient(135deg, ${AWAY_COLOR} 0%, #dc2626 100%)` }}>
                ✈️
              </div>
              <div>
                <p className="text-base font-bold text-white">{awayTeamName}</p>
                <p className="text-xs text-white/50">Εκτός Εδρας</p>
              </div>
            </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="group/item">
              <label className="text-xs text-white/70 mb-2 block font-medium flex items-center gap-2">
                <span className="text-base">📊</span>
                <span>Attribute</span>
              </label>
              <select
                value={awayAttribute}
                onChange={(e) => setAwayAttribute(e.target.value as "passing" | "carrying" | "all")}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a1520] border border-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all duration-200 hover:border-white/10"
              >
                <option value="passing">⚽ Passing</option>
                <option value="carrying">🏃 Carrying</option>
                <option value="all">🔀 All</option>
              </select>
            </div>
            <div className="group/item">
              <label className="text-xs text-white/70 mb-2 block font-medium flex items-center gap-2">
                <span className="text-base">🎯</span>
                <span>Sub Attribute</span>
              </label>
              <select
                value={awaySubAttribute}
                onChange={(e) => setAwaySubAttribute(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a1520] border border-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all duration-200 hover:border-white/10"
              >
                <option value="all">🔀 All</option>
                <option value="progressive">⬆️ Progressive</option>
                <option value="backward">⬇️ Backward</option>
              </select>
            </div>
            <div className="group/item">
              <label className="text-xs text-white/70 mb-2 block font-medium flex items-center gap-2">
                <span className="text-base">⚡</span>
                <span>Events</span>
              </label>
              <select
                value={awayEventType}
                onChange={(e) => setAwayEventType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a1520] border border-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all duration-200 hover:border-white/10"
              >
                <option value="all">🔀 All</option>
                <option value="pass">⚽ Pass</option>
                <option value="carry">🏃 Carry</option>
                <option value="dribble">🎨 Dribble</option>
              </select>
            </div>
            <div className="group/item">
              <label className="text-xs text-white/70 mb-2 block font-medium flex items-center gap-2">
                <span className="text-base">👥</span>
                <span>Players</span>
              </label>
              <select
                multiple
                value={awayPlayerIds}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, (opt) => opt.value);
                  setAwayPlayerIds(values);
                }}
                className="w-full px-3 py-2 rounded-xl bg-[#0a1520] border border-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all duration-200 hover:border-white/10"
                size={3}
              >
                <option value="">👥 All Players ({awayPlayers.length})</option>
                {awayPlayers.map((p) => (
                  <option key={p.id} value={p.id.toString()}>
                    #{p.number || "?"} {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-xl bg-gradient-to-br from-[#0a1520] to-[#050a10] border border-white/5 shadow-inner">
            <div className="flex items-center gap-2">
              <span className="text-base">📈</span>
              <p className="text-xs text-white/70">
                Showing data for <span className="font-bold text-white">{awayPlayerCount}</span> out of <span className="font-bold text-white">{awayPlayers.length}</span> Players
              </p>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Global Controls */}
      <div className="group relative rounded-2xl border border-white/5 bg-gradient-to-br from-[#111d2a] to-[#0a1520] p-5 shadow-xl transition-all duration-300 hover:border-white/10">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-red-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-5" />
        <div className="relative z-10">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-lg">⚙️</span>
            <p className="text-sm font-bold text-white">Global Controls</p>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="group/item">
              <label className="text-xs text-white/70 mb-2 block font-medium flex items-center gap-2">
                <span className="text-base">⏱️</span>
                <span>Half</span>
              </label>
              <select
                value={half}
                onChange={(e) => setHalf(e.target.value as Half)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a1520] border border-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 hover:border-white/10"
              >
                <option value="all">🔀 All</option>
                <option value="1H">1️⃣ 1st Half</option>
                <option value="2H">2️⃣ 2nd Half</option>
              </select>
            </div>
            <div className="group/item">
              <label className="text-xs text-white/70 mb-2 block font-medium flex items-center gap-2">
                <span className="text-base">📏</span>
                <span>Min Distance: {minDistance}m</span>
              </label>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={minDistance}
                  onChange={(e) => setMinDistance(Number(e.target.value))}
                  className="w-full accent-blue-500 h-2 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-white/40 mt-1">
                  <span>0m</span>
                  <span>20m</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0a1520]/50 border border-white/5">
              <input
                type="checkbox"
                checked={normalizeDirection}
                onChange={(e) => setNormalizeDirection(e.target.checked)}
                className="w-5 h-5 rounded accent-blue-500 cursor-pointer"
              />
              <label className="text-xs text-white/70 font-medium flex items-center gap-2 cursor-pointer">
                <span className="text-base">🔄</span>
                <span>Normalize Direction</span>
              </label>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0a1520]/50 border border-white/5">
              <input
                type="checkbox"
                checked={showSpotlight}
                onChange={(e) => setShowSpotlight(e.target.checked)}
                className="w-5 h-5 rounded accent-blue-500 cursor-pointer"
              />
              <label className="text-xs text-white/70 font-medium flex items-center gap-2 cursor-pointer">
                <span className="text-base">💡</span>
                <span>Show Spotlight</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Main Visualization - Two Pitches Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Home Team Pitch */}
        <div className="group relative rounded-2xl border border-white/5 bg-gradient-to-br from-[#111d2a] to-[#0a1520] p-5 shadow-xl transition-all duration-300 hover:border-white/10">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-5" />
          <div className="relative z-10">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-lg" style={{ background: `linear-gradient(135deg, ${HOME_COLOR} 0%, #2563eb 100%)` }}>
                  🏠
                </div>
                <div>
                  <p className="text-base font-bold text-white">{homeTeamName}</p>
                  <p className="text-xs text-white/50">Vector Field Analysis</p>
                </div>
              </div>
            </div>
            <div className="relative" style={{ minHeight: "520px" }}>
              <VectorPitch vectors={homeVectors} teamColor={HOME_COLOR} teamName={homeTeamName} />
            </div>
          </div>
        </div>

        {/* Away Team Pitch */}
        <div className="group relative rounded-2xl border border-white/5 bg-gradient-to-br from-[#111d2a] to-[#0a1520] p-5 shadow-xl transition-all duration-300 hover:border-white/10">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500/0 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-5" />
          <div className="relative z-10">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-lg" style={{ background: `linear-gradient(135deg, ${AWAY_COLOR} 0%, #dc2626 100%)` }}>
                  ✈️
                </div>
                <div>
                  <p className="text-base font-bold text-white">{awayTeamName}</p>
                  <p className="text-xs text-white/50">Vector Field Analysis</p>
                </div>
              </div>
            </div>
            <div className="relative" style={{ minHeight: "520px" }}>
              <VectorPitch vectors={awayVectors} teamColor={AWAY_COLOR} teamName={awayTeamName} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

