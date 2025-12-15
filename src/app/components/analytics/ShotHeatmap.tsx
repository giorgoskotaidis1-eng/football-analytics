"use client";

import { useMemo, useState } from "react";
import type { ShotEvent } from "./ShotAnalytics";

interface ShotHeatmapProps {
  shots: ShotEvent[];
  homeTeamName: string;
  awayTeamName: string;
}

const PITCH_WIDTH = 900;
const PITCH_HEIGHT = 520;

export function ShotHeatmap({ shots, homeTeamName, awayTeamName }: ShotHeatmapProps) {
  const [hoveredShot, setHoveredShot] = useState<ShotEvent | null>(null);

  // Separate shots by team
  const { homeShots, awayShots } = useMemo(() => {
    const home: ShotEvent[] = [];
    const away: ShotEvent[] = [];
    
    shots.forEach((shot) => {
      // Determine team based on x position (assuming home attacks left to right)
      // If x < 0.5, it's likely home team attacking, else away
      if (shot.x < 0.5) {
        home.push(shot);
      } else {
        away.push(shot);
      }
    });

    return { homeShots: home, awayShots: away };
  }, [shots]);

  // Convert normalized coordinates (0-1) to SVG coordinates
  const normalizeX = (x: number) => Math.max(10, Math.min(PITCH_WIDTH - 10, x * PITCH_WIDTH));
  const normalizeY = (y: number) => Math.max(10, Math.min(PITCH_HEIGHT - 10, y * PITCH_HEIGHT));

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

  const renderShots = (teamShots: ShotEvent[], teamColor: string) => {
    return teamShots.map((shot, idx) => {
      const icon = getShotIcon(shot);
      const x = normalizeX(shot.x);
      const y = normalizeY(shot.y);
      const isHovered = hoveredShot === shot;

      return (
        <g key={`shot-${idx}`}>
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
            onMouseLeave={() => setHoveredShot(null)}
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
        {renderShots(homeShots, "#3b82f6")}
        {renderShots(awayShots, "#ef4444")}
      </svg>

      {/* Tooltip */}
      {hoveredShot && (
        <div
          className="absolute z-20 rounded-xl border border-emerald-500/40 bg-gradient-to-br from-[#0b1220] to-[#0f1620] px-4 py-3 shadow-2xl backdrop-blur-sm"
          style={{
            left: `${(hoveredShot.x * 100)}%`,
            top: `${(hoveredShot.y * 100)}%`,
            transform: "translate(-50%, -100%)",
            marginTop: "-12px",
          }}
        >
          <div className="text-[11px] space-y-1.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="h-3 w-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="font-bold text-white">{hoveredShot.playerName}</p>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <svg className="h-3 w-3 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{Math.floor(hoveredShot.timeSec / 60)}' {hoveredShot.timeSec % 60}"</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-emerald-500/20 flex items-center justify-center">
                <span className="text-[9px] font-bold text-emerald-400">xG</span>
              </div>
              <p className="font-semibold text-emerald-400">
                {(hoveredShot.xg || 0).toFixed(2)}
              </p>
            </div>
            <div className="pt-1 border-t border-white/10">
              <p className="text-white/70 text-[10px] font-medium">
                {hoveredShot.outcome || (hoveredShot.goal ? "Goal" : "Shot")}
              </p>
              {hoveredShot.shotType && (
                <p className="text-white/50 text-[9px] mt-0.5">{hoveredShot.shotType}</p>
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

