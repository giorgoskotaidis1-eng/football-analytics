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
        style={{ background: "linear-gradient(135deg, #0f5132 0%, #0a3d2e 100%)" }}
      >
        {/* Pitch lines */}
        <rect x="0" y="0" width="1" height="1" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.008" />
        <line x1="0.5" y1="0" x2="0.5" y2="1" stroke="rgba(255,255,255,0.3)" strokeWidth="0.008" />
        <circle cx="0.5" cy="0.5" r="0.15" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.008" />
        <rect x="0" y="0" width="0.2" height="0.2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.008" />
        <rect x="0" y="0.8" width="0.2" height="0.2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.008" />
        <rect x="0.8" y="0" width="0.2" height="0.2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.008" />
        <rect x="0.8" y="0.8" width="0.2" height="0.2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.008" />

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
