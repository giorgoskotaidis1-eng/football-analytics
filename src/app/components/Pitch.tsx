"use client";

import React from "react";
import { PlayerInfo } from "../types/spotlight";

export function Pitch({
  lineupMap,
  selectedPlayerId,
}: {
  lineupMap: Record<string, PlayerInfo>;
  selectedPlayerId?: string;
}) {
  const validEntries = Object.entries(lineupMap).filter(([_, p]) => {
    const { x, y } = p.coords;
    return !isNaN(x) && !isNaN(y) && x >= 0 && x <= 1 && y >= 0 && y <= 1;
  });

  if (validEntries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        No lineup data available
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height: "400px" }}>
      <svg
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        className="w-full h-full rounded-lg"
        style={{ background: "linear-gradient(180deg, #0f5132 0%, #0c4a2f 100%)" }}
      >
        <defs>
          <linearGradient id="pitchStripes" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.03)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.00)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="1" height="1" fill="url(#pitchStripes)" />

        {/* Pitch lines */}
        <rect x="0.002" y="0.002" width="0.996" height="0.996" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.006" />
        <line x1="0.5" y1="0.002" x2="0.5" y2="0.998" stroke="rgba(255,255,255,0.45)" strokeWidth="0.006" />
        <circle cx="0.5" cy="0.5" r="0.15" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="0.006" />
        <circle cx="0.5" cy="0.5" r="0.006" fill="rgba(255,255,255,0.75)" />

        {/* Penalty areas and 6-yard boxes */}
        <rect x="0.002" y="0.212" width="0.164" height="0.576" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="0.006" />
        <rect x="0.002" y="0.368" width="0.065" height="0.264" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="0.006" />
        <rect x="0.834" y="0.212" width="0.164" height="0.576" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="0.006" />
        <rect x="0.933" y="0.368" width="0.065" height="0.264" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="0.006" />

        {/* Penalty spots */}
        <circle cx="0.11" cy="0.5" r="0.0055" fill="rgba(255,255,255,0.72)" />
        <circle cx="0.89" cy="0.5" r="0.0055" fill="rgba(255,255,255,0.72)" />

        {/* Penalty arcs */}
        <path d="M 0.214 0.44 A 0.09 0.09 0 0 0 0.214 0.56" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.006" />
        <path d="M 0.786 0.44 A 0.09 0.09 0 0 1 0.786 0.56" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.006" />

        {/* Goals */}
        <rect x="-0.018" y="0.44" width="0.02" height="0.12" fill="none" stroke="rgba(255,255,255,0.36)" strokeWidth="0.004" />
        <rect x="0.998" y="0.44" width="0.02" height="0.12" fill="none" stroke="rgba(255,255,255,0.36)" strokeWidth="0.004" />

        {/* Player markers */}
        {validEntries.map(([pid, p]) => {
          const isSelected = pid === selectedPlayerId;
          return (
            <g key={pid}>
              {/* Glow effect for selected player */}
              {isSelected && (
                <circle
                  cx={p.coords.x}
                  cy={p.coords.y}
                  r="0.04"
                  fill="rgba(255, 183, 3, 0.3)"
                  className="animate-pulse"
                />
              )}
              {/* Player circle */}
              <circle
                cx={p.coords.x}
                cy={p.coords.y}
                r="0.025"
                fill={isSelected ? "#ffb703" : "#4fc3f7"}
                stroke={isSelected ? "#ffb703" : "rgba(79, 195, 247, 0.5)"}
                strokeWidth="0.01"
                className={isSelected ? "drop-shadow-lg" : ""}
              />
              {/* Player number */}
              <text
                x={p.coords.x}
                y={p.coords.y - 0.04}
                textAnchor="middle"
                fontSize="0.04"
                fill="#ffffff"
                fontWeight="bold"
                className="drop-shadow-md"
              >
                {p.number ?? ""}
              </text>
              {/* Player name (only for selected) */}
              {isSelected && (
                <text
                  x={p.coords.x}
                  y={p.coords.y + 0.06}
                  textAnchor="middle"
                  fontSize="0.03"
                  fill="#ffb703"
                  fontWeight="600"
                  className="drop-shadow-md"
                >
                  {p.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
