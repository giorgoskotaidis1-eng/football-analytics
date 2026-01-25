"use client";

import { useMemo } from "react";

interface HeatmapPoint {
  x: number;
  y: number;
}

interface PlayerHeatmapProps {
  data: HeatmapPoint[];
  eventType?: string;
}

const PITCH_WIDTH = 900;
const PITCH_HEIGHT = 520;

export function PlayerHeatmap({ data, eventType = "all" }: PlayerHeatmapProps) {
  const grid = useMemo(() => {
    const cols = 18;
    const rows = 12;
    const cells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));

    for (const point of data) {
      // Normalize x, y from 0-100 to 0-1 if needed
      const x = point.x > 1 ? point.x / 100 : point.x;
      const y = point.y > 1 ? point.y / 100 : point.y;
      
      const c = Math.min(cols - 1, Math.max(0, Math.floor(x * cols)));
      const r = Math.min(rows - 1, Math.max(0, Math.floor(y * rows)));
      cells[r][c] += 1;
    }

    const maxCount = Math.max(...cells.flat(), 1);
    return { cells, maxCount };
  }, [data]);

  const gradientStops = [
    { t: 0, color: "#1b2b33" },
    { t: 0.5, color: "#3cab6c" },
    { t: 0.8, color: "#ffd166" },
    { t: 1, color: "#f94144" },
  ];

  const lerpColor = (a: string, b: string, t: number) => {
    const pa = a.match(/\w\w/g)!.map((x) => parseInt(x, 16));
    const pb = b.match(/\w\w/g)!.map((x) => parseInt(x, 16));
    const pc = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
    return `#${pc.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
  };

  const sampleGradient = (stops: typeof gradientStops, t: number) => {
    const clamped = Math.min(1, Math.max(0, t));
    const i = stops.findIndex((s) => s.t >= clamped);
    if (i <= 0) return stops[0].color;
    const s0 = stops[i - 1];
    const s1 = stops[i];
    const localT = (clamped - s0.t) / (s1.t - s0.t);
    return lerpColor(s0.color, s1.color, localT);
  };

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-[#1a1f2e] bg-gradient-to-br from-[#0b1220] to-[#0f1620] p-8 text-center">
        <svg className="mx-auto h-12 w-12 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <p className="mt-4 text-sm text-white/60">Δεν υπάρχουν δεδομένα για heatmap</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#1a2f3f]/50 bg-gradient-to-br from-[#0c1f2f] via-[#0f1923] to-[#0c1f2f] p-6 shadow-xl">
      <div className="relative" style={{ aspectRatio: `${PITCH_WIDTH}/${PITCH_HEIGHT}` }}>
        <svg viewBox={`0 0 ${PITCH_WIDTH} ${PITCH_HEIGHT}`} className="w-full h-full">
          {/* Pitch lines */}
          <g stroke="rgba(255,255,255,0.08)" strokeWidth="2" fill="none">
            <rect x="6" y="6" width={PITCH_WIDTH - 12} height={PITCH_HEIGHT - 12} rx="10" />
            <line x1={PITCH_WIDTH / 2} y1="0" x2={PITCH_WIDTH / 2} y2={PITCH_HEIGHT} />
            <rect x="6" y={PITCH_HEIGHT * 0.3} width={PITCH_WIDTH * 0.1} height={PITCH_HEIGHT * 0.4} />
            <rect x={PITCH_WIDTH - 6 - PITCH_WIDTH * 0.1} y={PITCH_HEIGHT * 0.3} width={PITCH_WIDTH * 0.1} height={PITCH_HEIGHT * 0.4} />
            <circle cx={PITCH_WIDTH / 2} cy={PITCH_HEIGHT / 2} r={PITCH_HEIGHT * 0.12} />
          </g>

          {/* Heat cells */}
          {grid.cells.map((row, rIdx) =>
            row.map((cnt, cIdx) => {
              const tRaw = cnt / grid.maxCount;
              const t = Math.sqrt(tRaw); // Square root scaling
              const color = sampleGradient(gradientStops, t);
              const cellW = PITCH_WIDTH / 18;
              const cellH = PITCH_HEIGHT / 12;
              const x = cIdx * cellW;
              const y = rIdx * cellH;

              return (
                <g key={`${rIdx}-${cIdx}`}>
                  <rect
                    x={x}
                    y={y}
                    width={cellW}
                    height={cellH}
                    fill={color}
                    opacity={cnt > 0 ? 0.7 : 0}
                  />
                  {cnt > 0 && (
                    <text
                      x={x + cellW / 2}
                      y={y + cellH / 2 + 4}
                      fontSize="12"
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

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <span className="text-[10px] font-medium text-white/60">Low</span>
        <div
          className="h-3 w-48 rounded-full"
          style={{
            background: "linear-gradient(90deg, #1b2b33, #3cab6c, #ffd166, #f94144)",
          }}
        />
        <span className="text-[10px] font-medium text-white/60">High</span>
      </div>
    </div>
  );
}

