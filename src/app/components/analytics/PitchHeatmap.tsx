"use client";

import React, { useMemo } from "react";

type EventPoint = { 
  x: number; 
  y: number; 
  teamId?: string; 
  playerId?: string; 
  type?: string; 
  subType?: string; 
  tSec?: number;
};

type Props = {
  events: EventPoint[];
  cols?: number;
  rows?: number;
  width?: number;
  height?: number;
  showCounts?: boolean;
  useSqrtScale?: boolean;
};

const gradientStops = [
  { t: 0, color: "#1b2b33" }, // low (γκρι-μπλε)
  { t: 0.5, color: "#3cab6c" }, // mid green
  { t: 0.8, color: "#ffd166" }, // amber
  { t: 1, color: "#f94144" }, // red
];

function lerpColor(a: string, b: string, t: number) {
  const pa = a.match(/\w\w/g)!.map((x) => parseInt(x, 16));
  const pb = b.match(/\w\w/g)!.map((x) => parseInt(x, 16));
  const pc = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${pc.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function sampleGradient(stops: typeof gradientStops, t: number) {
  const clamped = Math.min(1, Math.max(0, t));
  const i = stops.findIndex((s) => s.t >= clamped);
  if (i <= 0) return stops[0].color;
  const s0 = stops[i - 1];
  const s1 = stops[i];
  const localT = (clamped - s0.t) / (s1.t - s0.t);
  return lerpColor(s0.color, s1.color, localT);
}

export const PitchHeatmap: React.FC<Props> = ({
  events,
  cols = 12,
  rows = 8,
  width = 900,
  height = 520,
  showCounts = true,
  useSqrtScale = true,
}) => {
  const grid = useMemo(() => {
    const cells = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => 0)
    );
    for (const ev of events) {
      // ev.x, ev.y in [0..1], y=0 top, x=0 left
      const c = Math.min(cols - 1, Math.max(0, Math.floor(ev.x * cols)));
      const r = Math.min(rows - 1, Math.max(0, Math.floor(ev.y * rows)));
      cells[r][c] += 1;
    }
    const maxCount = Math.max(...cells.flat(), 1);
    return { cells, maxCount };
  }, [events, cols, rows]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: width,
        aspectRatio: `${width}/${height}`,
        background: "#0f1923",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
        {/* Pitch lines (faint) */}
        <g stroke="rgba(255,255,255,0.08)" strokeWidth="2" fill="none">
          <rect x="6" y="6" width={width - 12} height={height - 12} rx="10" />
          <line x1={width / 2} y1="0" x2={width / 2} y2={height} />
          {/* goal boxes */}
          <rect x="6" y={height * 0.3} width={width * 0.1} height={height * 0.4} />
          <rect x={width - 6 - width * 0.1} y={height * 0.3} width={width * 0.1} height={height * 0.4} />
          {/* center circle */}
          <circle cx={width / 2} cy={height / 2} r={height * 0.12} />
        </g>

        {/* Heat cells */}
        {grid.cells.map((row, rIdx) =>
          row.map((cnt, cIdx) => {
            const tRaw = cnt / grid.maxCount;
            const t = useSqrtScale ? Math.sqrt(tRaw) : tRaw;
            const color = sampleGradient(gradientStops, t);
            const cellW = width / cols;
            const cellH = height / rows;
            const x = cIdx * cellW;
            const y = rIdx * cellH;
            return (
              <g key={`${rIdx}-${cIdx}`}>
                <rect x={x} y={y} width={cellW} height={cellH} fill={color} opacity={0.9} />
                {showCounts && cnt > 0 && (
                  <text
                    x={x + cellW / 2}
                    y={y + cellH / 2 + 4}
                    fontSize="16"
                    fill="#e8f6ff"
                    textAnchor="middle"
                    style={{ fontWeight: 600 }}
                  >
                    {cnt}
                  </text>
                )}
              </g>
            );
          })
        )}
      </svg>
    </div>
  );
};

