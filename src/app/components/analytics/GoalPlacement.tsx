"use client";

import { useMemo } from "react";
import type { ShotEvent } from "./ShotAnalytics";

interface GoalPlacementProps {
  shots: ShotEvent[];
}

const GOAL_WIDTH = 732; // Standard goal width in cm (7.32m)
const GOAL_HEIGHT = 244; // Standard goal height in cm (2.44m)
const GRID_COLS = 12;
const GRID_ROWS = 8;

export function GoalPlacement({ shots }: GoalPlacementProps) {
  // Create bins for goal placement
  const bins = useMemo(() => {
    const grid: number[][] = Array(GRID_ROWS)
      .fill(0)
      .map(() => Array(GRID_COLS).fill(0));

    // For shots on goal, we need to estimate goal position
    // Assuming shots have normalized coordinates where goal is at y=0 or y=100
    shots.forEach((shot) => {
      // Estimate goal position from shot coordinates
      // This is simplified - in real data you'd have goal coordinates
      // For now, we'll use a heuristic based on shot position
      
      // If shot is very close to goal line (y < 0.1 or y > 0.9), estimate goal position
      let goalX = 0.5; // Default center
      let goalY = 0.5; // Default center
      
      if (shot.y < 0.1) {
        // Shot from top, goal at bottom
        goalX = shot.x;
        goalY = 0.95; // Near bottom of goal
      } else if (shot.y > 0.9) {
        // Shot from bottom, goal at top
        goalX = shot.x;
        goalY = 0.05; // Near top of goal
      } else {
        // Estimate based on shot angle
        goalX = shot.x;
        goalY = shot.y < 0.5 ? 0.95 : 0.05;
      }

      // Convert to grid coordinates
      const col = Math.floor(goalX * GRID_COLS);
      const row = Math.floor(goalY * GRID_ROWS);
      
      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        grid[row][col]++;
      }
    });

    return grid;
  }, [shots]);

  const maxShots = Math.max(...bins.flat(), 1);

  const binWidth = GOAL_WIDTH / GRID_COLS;
  const binHeight = GOAL_HEIGHT / GRID_ROWS;

  if (shots.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-[11px] text-white/50">
        Δεν υπάρχουν σουτ στο τέρμα
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${GOAL_WIDTH} ${GOAL_HEIGHT}`}
        width="100%"
        height="100%"
        className="rounded-lg"
        style={{ maxHeight: "300px", background: "#0f1923" }}
      >
        {/* Goal frame */}
        <rect
          x="0"
          y="0"
          width={GOAL_WIDTH}
          height={GOAL_HEIGHT}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="3"
          rx="4"
        />

        {/* Grid lines */}
        <g stroke="rgba(255,255,255,0.1)" strokeWidth="1">
          {Array.from({ length: GRID_COLS + 1 }).map((_, i) => (
            <line
              key={`v-${i}`}
              x1={(i * GOAL_WIDTH) / GRID_COLS}
              y1="0"
              x2={(i * GOAL_WIDTH) / GRID_COLS}
              y2={GOAL_HEIGHT}
            />
          ))}
          {Array.from({ length: GRID_ROWS + 1 }).map((_, i) => (
            <line
              key={`h-${i}`}
              x1="0"
              y1={(i * GOAL_HEIGHT) / GRID_ROWS}
              x2={GOAL_WIDTH}
              y2={(i * GOAL_HEIGHT) / GRID_ROWS}
            />
          ))}
        </g>

        {/* Heatmap bins */}
        {bins.map((row, rowIdx) =>
          row.map((count, colIdx) => {
            const opacity = Math.min(1, count / maxShots);
            if (count === 0) return null;

            return (
              <rect
                key={`bin-${rowIdx}-${colIdx}`}
                x={colIdx * binWidth}
                y={rowIdx * binHeight}
                width={binWidth}
                height={binHeight}
                fill={`rgba(239, 68, 68, ${opacity * 0.8})`}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1"
                className="transition-all hover:opacity-100"
              >
                <title>{`${count} σουτ`}</title>
              </rect>
            );
          })
        )}

        {/* Count labels */}
        {bins.map((row, rowIdx) =>
          row.map((count, colIdx) => {
            if (count === 0) return null;
            return (
              <text
                key={`label-${rowIdx}-${colIdx}`}
                x={colIdx * binWidth + binWidth / 2}
                y={rowIdx * binHeight + binHeight / 2 + 4}
                fontSize="12"
                fill="#fff"
                textAnchor="middle"
                fontWeight="bold"
                className="pointer-events-none"
              >
                {count}
              </text>
            );
          })
        )}
      </svg>

      {/* Legend */}
      <div className="mt-5 flex items-center justify-center gap-5 flex-wrap">
        <span className="text-[11px] font-semibold text-white/80">Ένταση:</span>
        <div className="flex items-center gap-2.5 rounded-lg bg-[#0b1220] border border-[#1a1f2e] px-3 py-1.5">
          <div className="h-3.5 w-8 bg-red-500/30 rounded shadow-lg"></div>
          <span className="text-[10px] font-semibold text-white/80">Χαμηλή</span>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg bg-[#0b1220] border border-[#1a1f2e] px-3 py-1.5">
          <div className="h-3.5 w-8 bg-red-500/70 rounded shadow-lg"></div>
          <span className="text-[10px] font-semibold text-white/80">Μέτρια</span>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg bg-[#0b1220] border border-[#1a1f2e] px-3 py-1.5">
          <div className="h-3.5 w-8 bg-red-500 rounded shadow-lg shadow-red-500/30"></div>
          <span className="text-[10px] font-semibold text-white/80">Υψηλή</span>
        </div>
      </div>
    </div>
  );
}

