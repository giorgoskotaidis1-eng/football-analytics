"use client";

import { useMemo } from "react";
import type { ShotEvent } from "./ShotAnalytics";

interface ShotTimelineProps {
  shots: ShotEvent[];
}

export function ShotTimeline({ shots }: ShotTimelineProps) {
  // Group shots by minute
  const timeline = useMemo(() => {
    const byMinute: Record<number, ShotEvent[]> = {};
    
    shots.forEach((shot) => {
      const minute = Math.floor(shot.timeSec / 60);
      if (!byMinute[minute]) {
        byMinute[minute] = [];
      }
      byMinute[minute].push(shot);
    });

    // Convert to array and sort
    return Object.entries(byMinute)
      .map(([minute, shotList]) => ({
        minute: parseInt(minute),
        shots: shotList,
        count: shotList.length,
        goals: shotList.filter((s) => s.goal || s.outcome === "Goal").length,
      }))
      .sort((a, b) => a.minute - b.minute);
  }, [shots]);

  const maxCount = Math.max(...timeline.map((t) => t.count), 1);
  const maxMinute = Math.max(...timeline.map((t) => t.minute), 90);

  if (timeline.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-[11px] text-white/50">
        Δεν υπάρχουν δεδομένα για timeline
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bar Chart */}
      <div className="relative h-64">
        <svg width="100%" height="100%" viewBox={`0 0 ${Math.max(900, maxMinute * 10)} 200`} className="overflow-visible">
          {/* Grid lines */}
          <g stroke="rgba(255,255,255,0.05)" strokeWidth="1">
            {Array.from({ length: Math.ceil(maxMinute / 5) + 1 }).map((_, i) => (
              <line
                key={`grid-${i}`}
                x1={i * 50}
                y1="0"
                x2={i * 50}
                y2="200"
              />
            ))}
          </g>

          {/* Bars */}
          {timeline.map((item) => {
            const barHeight = (item.count / maxCount) * 180;
            const x = item.minute * 10;
            const goalHeight = item.goals > 0 ? (item.goals / maxCount) * 180 : 0;

            return (
              <g key={`minute-${item.minute}`}>
                {/* Total shots bar */}
                <rect
                  x={x}
                  y={200 - barHeight}
                  width="8"
                  height={barHeight}
                  fill="rgba(59, 130, 246, 0.6)"
                  rx="2"
                />
                {/* Goals bar (overlay) */}
                {goalHeight > 0 && (
                  <rect
                    x={x}
                    y={200 - goalHeight}
                    width="8"
                    height={goalHeight}
                    fill="#fbbf24"
                    rx="2"
                  />
                )}
                {/* Minute label */}
                {item.minute % 5 === 0 && (
                  <text
                    x={x + 4}
                    y="195"
                    fontSize="10"
                    fill="rgba(255,255,255,0.5)"
                    textAnchor="middle"
                  >
                    {item.minute}'
                  </text>
                )}
                {/* Count label on hover area */}
                <rect
                  x={x - 2}
                  y="0"
                  width="12"
                  height="200"
                  fill="transparent"
                  className="cursor-pointer"
                >
                  <title>
                    {item.minute}': {item.count} σουτ ({item.goals} γκολ)
                  </title>
                </rect>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-4">
        <div className="flex items-center gap-2.5 rounded-lg bg-[#0b1220] border border-[#1a1f2e] px-3 py-1.5">
          <div className="h-3.5 w-8 bg-blue-500/60 rounded shadow-lg"></div>
          <span className="text-[10px] font-semibold text-white/90">Συνολικά Σουτ</span>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg bg-[#0b1220] border border-[#1a1f2e] px-3 py-1.5">
          <div className="h-3.5 w-8 bg-yellow-400 rounded shadow-lg shadow-yellow-400/30"></div>
          <span className="text-[10px] font-semibold text-white/90">Γκολ</span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="rounded-lg border border-[#1a1f2e] bg-[#0b1220] p-4 text-center">
          <p className="text-[10px] font-semibold text-white/70 mb-1.5">Συνολικά Σουτ</p>
          <p className="text-2xl font-bold text-white">{shots.length}</p>
        </div>
        <div className="rounded-lg border border-[#1a1f2e] bg-[#0b1220] p-4 text-center">
          <p className="text-[10px] font-semibold text-white/70 mb-1.5">Σουτ/Λεπτό</p>
          <p className="text-2xl font-bold text-emerald-400">
            {(shots.length / Math.max(maxMinute, 1)).toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border border-[#1a1f2e] bg-[#0b1220] p-4 text-center">
          <p className="text-[10px] font-semibold text-white/70 mb-1.5">Γκολ</p>
          <p className="text-2xl font-bold text-yellow-400">
            {shots.filter((s) => s.goal || s.outcome === "Goal").length}
          </p>
        </div>
      </div>
    </div>
  );
}

