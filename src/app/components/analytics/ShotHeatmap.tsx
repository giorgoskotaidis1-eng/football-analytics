"use client";

import { useMemo, useState } from "react";
import type { ShotEvent } from "./ShotAnalytics";

interface ShotHeatmapProps {
  shots: ShotEvent[];
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId?: string;
  awayTeamId?: string;
}

const PITCH_WIDTH = 900;
const PITCH_HEIGHT = 520;

export function ShotHeatmap({ shots, homeTeamName, awayTeamName, homeTeamId, awayTeamId }: ShotHeatmapProps) {
  const [hoveredShot, setHoveredShot] = useState<ShotEvent | null>(null);
  const [selectedShot, setSelectedShot] = useState<ShotEvent | null>(null);

  // Separate shots by team
  const { homeShots, awayShots } = useMemo(() => {
    const home: ShotEvent[] = [];
    const away: ShotEvent[] = [];
    
    shots.forEach((shot) => {
      const byTeamId =
        (homeTeamId && shot.teamId === homeTeamId) ? "home" :
        (awayTeamId && shot.teamId === awayTeamId) ? "away" :
        null;
      const byTeamFlag = shot.team || null;
      const team = byTeamId || byTeamFlag;

      // Use actual team mapping; only fallback to x-position when no team info exists.
      if (team === "home") {
        home.push(shot);
      } else if (team === "away") {
        away.push(shot);
      } else if (shot.x < 0.5) {
        home.push(shot);
      } else {
        away.push(shot);
      }
    });

    return { homeShots: home, awayShots: away };
  }, [shots, homeTeamId, awayTeamId]);

  // Convert normalized coordinates (0-1) to SVG coordinates
  const normalizeX = (x: number) => Math.max(10, Math.min(PITCH_WIDTH - 10, x * PITCH_WIDTH));
  const normalizeY = (y: number) => Math.max(10, Math.min(PITCH_HEIGHT - 10, y * PITCH_HEIGHT));

  const applyDeclustering = (
    shotEntries: Array<{ shot: ShotEvent; teamColor: string }>
  ) => {
    const points = shotEntries.map(({ shot, teamColor }) => ({
      shot,
      teamColor,
      baseX: normalizeX(shot.x),
      baseY: normalizeY(shot.y),
      displayX: normalizeX(shot.x),
      displayY: normalizeY(shot.y),
    }));

    /** Merge into one cluster when shots are within this SVG distance (pairwise → union-find). */
    const CLUSTER_MERGE_EPS = 72;

    const clusterIndices = (): number[][] => {
      const n = points.length;
      const parent = Array.from({ length: n }, (_, i) => i);
      const find = (i: number): number => {
        if (parent[i] !== i) parent[i] = find(parent[i]);
        return parent[i];
      };
      const union = (a: number, b: number) => {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) parent[ra] = rb;
      };
      const eps2 = CLUSTER_MERGE_EPS * CLUSTER_MERGE_EPS;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dx = points[j].baseX - points[i].baseX;
          const dy = points[j].baseY - points[i].baseY;
          if (dx * dx + dy * dy <= eps2) union(i, j);
        }
      }
      const map = new Map<number, number[]>();
      for (let i = 0; i < n; i++) {
        const r = find(i);
        if (!map.has(r)) map.set(r, []);
        map.get(r)!.push(i);
      }
      return Array.from(map.values());
    };

    const clusters = clusterIndices();
    for (const idxs of clusters) {
      if (idxs.length <= 1) continue;
      let cx = 0;
      let cy = 0;
      for (const idx of idxs) {
        cx += points[idx].baseX;
        cy += points[idx].baseY;
      }
      cx /= idxs.length;
      cy /= idxs.length;
      const n = idxs.length;
      const R = Math.min(108, Math.max(34, 14 + n * 7));
      idxs.forEach((idx, k) => {
        const angle = (Math.PI * 2 * k) / n - Math.PI / 2;
        points[idx].displayX = cx + Math.cos(angle) * R;
        points[idx].displayY = cy + Math.sin(angle) * R;
      });
    }

    for (const point of points) {
      point.displayX = Math.max(10, Math.min(PITCH_WIDTH - 10, point.displayX));
      point.displayY = Math.max(10, Math.min(PITCH_HEIGHT - 10, point.displayY));
    }

    return points;
  };

  const displayShots = useMemo(
    () =>
      applyDeclustering([
        ...homeShots.map((shot) => ({ shot, teamColor: "#3b82f6" })),
        ...awayShots.map((shot) => ({ shot, teamColor: "#ef4444" })),
      ]),
    [homeShots, awayShots]
  );

  const focusedShot = selectedShot ?? hoveredShot;

  // Get icon and color for shot outcome
  const getShotIcon = (shot: ShotEvent) => {
    const isGoal = shot.goal || shot.outcome === "Goal";
    const isOnGoal = shot.outcome === "OnGoal" || isGoal;
    const isWide = shot.outcome === "Wide";
    const isBlocked = shot.outcome === "Blocked";

    if (isGoal) {
      return { symbol: "★", color: "#fbbf24", size: 12 }; // Gold star
    } else if (isOnGoal) {
      return { symbol: "◎", color: "#3b82f6", size: 10 }; // Blue circle
    } else if (isWide) {
      return { symbol: "○", color: "#ef4444", size: 10 }; // Red circle
    } else if (isBlocked) {
      return { symbol: "✖", color: "#6b7280", size: 10 }; // Gray X
    }
    return { symbol: "○", color: "#9ca3af", size: 9 }; // Default gray
  };

  const renderShots = (
    shotEntries: Array<{
      shot: ShotEvent;
      teamColor: string;
      baseX: number;
      baseY: number;
      displayX: number;
      displayY: number;
    }>
  ) => {
    return shotEntries.map((entry, idx) => {
      const { shot, teamColor, displayX, displayY } = entry;
      const icon = getShotIcon(shot);
      const x = displayX;
      const y = displayY;
      const isHovered = focusedShot === shot;

      return (
        <g key={`shot-${teamColor}-${shot.playerName}-${shot.timeSec}-${idx}`} data-shot-marker>
          {/* Hover circle */}
          {isHovered && (
            <circle
              cx={x}
              cy={y}
              r={15}
              fill={icon.color}
              opacity={0.2}
              className="animate-pulse"
            />
          )}
          {/* Shot icon */}
          <circle
            cx={x}
            cy={y}
            r={icon.size}
            fill={icon.color}
            stroke={isHovered ? "#fff" : "rgba(255,255,255,0.3)"}
            strokeWidth={isHovered ? 2 : 1}
            className="cursor-pointer transition-all"
            onMouseEnter={() => setHoveredShot(shot)}
            onMouseLeave={() => setHoveredShot((prev) => (prev === shot ? null : prev))}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedShot((prev) => (prev === shot ? null : shot));
            }}
          />
          {/* Symbol overlay */}
          <text
            x={x}
            y={y + 4}
            fontSize={icon.size * 0.8}
            fill="#fff"
            textAnchor="middle"
            fontWeight="bold"
            pointerEvents="none"
          >
            {icon.symbol}
          </text>
        </g>
      );
    });
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${PITCH_WIDTH} ${PITCH_HEIGHT}`}
        width="100%"
        height="100%"
        className="rounded-lg"
        style={{ maxHeight: "520px", background: "#0f1923" }}
        onClick={(e) => {
          const t = e.target as Element;
          if (!t.closest?.("[data-shot-marker]")) setSelectedShot(null);
        }}
      >
        {/* Pitch background */}
        <rect width={PITCH_WIDTH} height={PITCH_HEIGHT} fill="#0f1923" rx="8" />

        {/* Pitch lines */}
        <g stroke="rgba(255,255,255,0.08)" strokeWidth="2" fill="none">
          {/* Outer border */}
          <rect x="6" y="6" width={PITCH_WIDTH - 12} height={PITCH_HEIGHT - 12} rx="10" />
          {/* Center line */}
          <line x1={PITCH_WIDTH / 2} y1="0" x2={PITCH_WIDTH / 2} y2={PITCH_HEIGHT} />
          {/* Goal boxes */}
          <rect x="6" y={PITCH_HEIGHT * 0.3} width={PITCH_WIDTH * 0.1} height={PITCH_HEIGHT * 0.4} />
          <rect
            x={PITCH_WIDTH - 6 - PITCH_WIDTH * 0.1}
            y={PITCH_HEIGHT * 0.3}
            width={PITCH_WIDTH * 0.1}
            height={PITCH_HEIGHT * 0.4}
          />
          {/* Center circle */}
          <circle cx={PITCH_WIDTH / 2} cy={PITCH_HEIGHT / 2} r={PITCH_HEIGHT * 0.12} />
        </g>

        {/* Render shots */}
        {renderShots(displayShots)}
      </svg>

      {/* Tooltip */}
      {focusedShot && (
        <div
          className="absolute z-20 rounded-xl border border-emerald-500/40 bg-gradient-to-br from-[#0b1220] to-[#0f1620] px-4 py-3 shadow-2xl backdrop-blur-sm"
          style={{
            left: `${(((displayShots.find((entry) => entry.shot === focusedShot)?.displayX ?? (focusedShot.x * PITCH_WIDTH)) / PITCH_WIDTH) * 100)}%`,
            top: `${(((displayShots.find((entry) => entry.shot === focusedShot)?.displayY ?? (focusedShot.y * PITCH_HEIGHT)) / PITCH_HEIGHT) * 100)}%`,
            transform: "translate(-50%, -100%)",
            marginTop: "-12px",
            pointerEvents: "none",
          }}
        >
          <div className="text-[11px] space-y-1.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="h-3 w-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="font-bold text-white">{focusedShot.playerName}</p>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <svg className="h-3 w-3 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{Math.floor(focusedShot.timeSec / 60)}' {focusedShot.timeSec % 60}"</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-emerald-500/20 flex items-center justify-center">
                <span className="text-[9px] font-bold text-emerald-400">xG</span>
              </div>
              <p className="font-semibold text-emerald-400">
                {(focusedShot.xg || 0).toFixed(2)}
              </p>
            </div>
            <div className="pt-1 border-t border-white/10">
              <p className="text-white/70 text-[10px] font-medium">
                {focusedShot.outcome || (focusedShot.goal ? "Goal" : "Shot")}
              </p>
              {focusedShot.shotType && (
                <p className="text-white/50 text-[9px] mt-0.5">{focusedShot.shotType}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-5 flex items-center justify-center gap-5 flex-wrap">
        <div className="flex items-center gap-2.5 rounded-lg bg-[#0b1220] border border-[#1a1f2e] px-3 py-1.5">
          <div className="h-3.5 w-3.5 rounded-full bg-yellow-400 shadow-lg shadow-yellow-400/30"></div>
          <span className="text-[10px] font-semibold text-white/90">Γκολ</span>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg bg-[#0b1220] border border-[#1a1f2e] px-3 py-1.5">
          <div className="h-3.5 w-3.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/30"></div>
          <span className="text-[10px] font-semibold text-white/90">Στο Τέρμα</span>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg bg-[#0b1220] border border-[#1a1f2e] px-3 py-1.5">
          <div className="h-3.5 w-3.5 rounded-full bg-red-500 shadow-lg shadow-red-500/30"></div>
          <span className="text-[10px] font-semibold text-white/90">Άστοχο</span>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg bg-[#0b1220] border border-[#1a1f2e] px-3 py-1.5">
          <div className="h-3.5 w-3.5 rounded-full bg-gray-500 shadow-lg shadow-gray-500/30"></div>
          <span className="text-[10px] font-semibold text-white/90">Κομμένο</span>
        </div>
      </div>
    </div>
  );
}

