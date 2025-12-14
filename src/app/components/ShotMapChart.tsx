"use client";

import { useEffect, useRef, useState } from "react";

interface Shot {
  x: number;
  y: number;
  xg: number;
  outcome: "goal" | "saved" | "blocked" | "off_target";
  team: "home" | "away";
  playerName?: string;
  minute?: number;
}

interface ShotMapChartProps {
  shots: Shot[];
  homeTeamName: string;
  awayTeamName: string;
}

export function ShotMapChart({ shots, homeTeamName, awayTeamName }: ShotMapChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Resize/re-render when tab becomes visible
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Filter and validate shots with guards (re-run when visible for re-render)
  const validShots = (shots || []).filter((s) => {
    if (!s) return false;
    const x = Number(s.x);
    const y = Number(s.y);
    return (
      !isNaN(x) &&
      !isNaN(y) &&
      x >= 0 &&
      x <= 100 &&
      y >= 0 &&
      y <= 100 &&
      (s.team === "home" || s.team === "away")
    );
  });
  
  // Re-render when tab becomes visible (use isVisible in dependency)
  useEffect(() => {
    if (isVisible && containerRef.current) {
      // Force re-render by triggering a resize event
      window.dispatchEvent(new Event('resize'));
    }
  }, [isVisible, validShots.length]);

  if (validShots.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl border border-[#1a1f2e] bg-[#0b1220] text-[11px] text-white/50 shadow-lg">
        No shot data
      </div>
    );
  }

  // Normalize coordinates (0-100) to SVG coordinates
  // x: 0 = left touchline, 100 = right touchline
  // y: 0 = top (home goal/attacking end), 100 = bottom (away goal/defending end)
  const normalizeX = (x: number) => Math.max(0, Math.min(680, (x / 100) * 680)); // Pitch width
  const normalizeY = (y: number) => Math.max(0, Math.min(440, (y / 100) * 440)); // Pitch height

  // Filter and categorize shots by team and outcome
  const homeShots = validShots
    .filter((s) => s.team === "home")
    .map((s) => {
      // Normalize outcome: ensure valid outcome type
      let outcome: "goal" | "saved" | "blocked" | "off_target" = "off_target";
      if (s.outcome === "goal" || s.outcome === "saved" || s.outcome === "blocked" || s.outcome === "off_target") {
        outcome = s.outcome;
      }
      return {
        ...s,
        x: Number(s.x),
        y: Number(s.y),
        xg: Number(s.xg) || 0,
        outcome,
      };
    });

  const awayShots = validShots
    .filter((s) => s.team === "away")
    .map((s) => {
      // Normalize outcome
      let outcome: "goal" | "saved" | "blocked" | "off_target" = "off_target";
      if (s.outcome === "goal" || s.outcome === "saved" || s.outcome === "blocked" || s.outcome === "off_target") {
        outcome = s.outcome;
      }
      return {
        ...s,
        x: Number(s.x),
        y: Number(s.y),
        xg: Number(s.xg) || 0,
        outcome,
      };
    });
  
  // For away team, we need to flip both x and y to show shots from their perspective
  // Away team attacks from bottom (y=100) to top (y=50), so flip y: 100 - y
  // Away team attacks from right to left, so flip x: 100 - x

  const getShotColor = (outcome: string, team: string) => {
    if (outcome === "goal") return team === "home" ? "#10b981" : "#0ea5e9";
    if (outcome === "saved") return team === "home" ? "#f59e0b" : "#3b82f6";
    if (outcome === "blocked") return "#ef4444";
    return "#64748b";
  };

  const getShotSize = (xg: number) => {
    return Math.max(4, Math.min(12, xg * 20));
  };

  return (
    <div className="space-y-4">
      {/* Professional Legend - Clean Design with elevated title */}
      <div className="flex flex-wrap items-center gap-4 bg-[#1a1f2e]/80 backdrop-blur-sm border border-[#1a1f2e] rounded-lg px-4 py-3 relative" style={{ marginTop: '12px' }}>
        <div className="absolute -top-2 left-4 bg-[#0b1220] px-2 z-10">
          <div className="text-[10px] font-semibold text-white/90 uppercase tracking-wide">Shot Map</div>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-emerald-500 border-2 border-white shadow-lg" />
            <span className="text-[10px] text-white">Goal ({homeTeamName})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-sky-500 border-2 border-white shadow-lg" />
            <span className="text-[10px] text-white">Goal ({awayTeamName})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-amber-500 border-2 border-white shadow-lg" />
            <span className="text-[10px] text-white">Saved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-red-500 border-2 border-white shadow-lg" />
            <span className="text-[10px] text-white">Blocked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-white/40 border border-white/60" />
            <span className="text-[10px] text-white/70">Off Target</span>
          </div>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="relative rounded-xl border border-[#1a1f2e] bg-[#0b1220] p-6 shadow-xl"
      >
        {/* Elevated team labels */}
        <div className="absolute -top-3 left-6 bg-[#0b1220] px-2 z-10">
          <div className="text-[9px] font-semibold text-white/90 uppercase tracking-wide">
            {homeTeamName} vs {awayTeamName}
          </div>
        </div>
        <svg 
          viewBox="0 0 680 440" 
          className="w-full" 
          preserveAspectRatio="xMidYMid meet"
          style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}
        >
          {/* Professional pitch background */}
          <rect x="0" y="0" width="680" height="440" fill="#0f5132" fillOpacity={0.4} />
          <rect x="2" y="2" width="676" height="436" fill="none" stroke="#22c55e" strokeWidth={3} />
          
          {/* Grass pattern (subtle) */}
          <defs>
            <pattern id="grass" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <line x1="0" y1="10" x2="20" y2="10" stroke="#22c55e" strokeWidth={0.5} opacity={0.1} />
            </pattern>
          </defs>
          <rect x="0" y="0" width="680" height="440" fill="url(#grass)" />
          
          {/* Center line */}
          <line x1="340" y1="0" x2="340" y2="440" stroke="#22c55e" strokeWidth={2} strokeDasharray="10,10" opacity={0.6} />
          
          {/* Center circle */}
          <circle cx="340" cy="220" r="70" fill="none" stroke="#22c55e" strokeWidth={2} opacity={0.6} />
          <circle cx="340" cy="220" r="5" fill="#22c55e" opacity={0.8} />
          
          {/* Home penalty box (left) */}
          <rect x="0" y="80" width="140" height="280" fill="none" stroke="#22c55e" strokeWidth={2} opacity={0.6} />
          <rect x="0" y="160" width="100" height="120" fill="none" stroke="#22c55e" strokeWidth={2} opacity={0.6} />
          <rect x="0" y="180" width="50" height="80" fill="none" stroke="#22c55e" strokeWidth={2} opacity={0.6} />
          
          {/* Away penalty box (right) */}
          <rect x="540" y="80" width="140" height="280" fill="none" stroke="#22c55e" strokeWidth={2} opacity={0.6} />
          <rect x="580" y="160" width="100" height="120" fill="none" stroke="#22c55e" strokeWidth={2} opacity={0.6} />
          <rect x="630" y="180" width="50" height="80" fill="none" stroke="#22c55e" strokeWidth={2} opacity={0.6} />
          
          {/* Home goal (left) */}
          <rect x="0" y="160" width="20" height="120" fill="none" stroke="#22c55e" strokeWidth={3} opacity={0.8} />
          
          {/* Away goal (right) */}
          <rect x="660" y="160" width="20" height="120" fill="none" stroke="#22c55e" strokeWidth={3} opacity={0.8} />
          
          {/* Shots with better visualization */}
          {homeShots.map((shot, idx) => {
            const size = getShotSize(shot.xg);
            const isGoal = shot.outcome === "goal";
            return (
              <g key={`home-${idx}`}>
                {/* Glow effect for goals */}
                {isGoal && (
                  <circle
                    cx={normalizeX(shot.x)}
                    cy={normalizeY(shot.y)}
                    r={size + 3}
                    fill={getShotColor(shot.outcome, "home")}
                    opacity={0.3}
                    style={{ filter: 'blur(4px)' }}
                  />
                )}
                <circle
                  cx={normalizeX(shot.x)}
                  cy={normalizeY(shot.y)}
                  r={size}
                  fill={getShotColor(shot.outcome, "home")}
                  opacity={isGoal ? 0.9 : 0.7}
                  stroke="#fff"
                  strokeWidth={isGoal ? 2.5 : 1.5}
                  style={{ filter: isGoal ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' : 'none' }}
                >
                  <title>
                    {shot.playerName || "Player"} - {shot.minute !== undefined ? `${shot.minute}'` : "N/A"} - xG: {shot.xg.toFixed(2)} - {shot.outcome}
                  </title>
                </circle>
                {/* xG label for goals */}
                {isGoal && (
                  <text
                    x={normalizeX(shot.x)}
                    y={normalizeY(shot.y) - size - 4}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize="8"
                    fontWeight="bold"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                  >
                    {shot.xg.toFixed(2)}
                  </text>
                )}
              </g>
            );
          })}
          
          {awayShots.map((shot, idx) => {
            const size = getShotSize(shot.xg);
            const isGoal = shot.outcome === "goal";
            // Flip coordinates for away team: they attack from bottom-right to top-left
            // x: flip horizontally (100 - x) so right side becomes left
            // y: flip vertically (100 - y) so bottom (y=100, their attacking end) becomes top (y=0)
            const flippedX = 100 - shot.x;
            const flippedY = 100 - shot.y;
            const svgX = normalizeX(flippedX);
            const svgY = normalizeY(flippedY);
            
            return (
              <g key={`away-${idx}`}>
                {/* Glow effect for goals */}
                {isGoal && (
                  <circle
                    cx={svgX}
                    cy={svgY}
                    r={size + 3}
                    fill={getShotColor(shot.outcome, "away")}
                    opacity={0.3}
                    style={{ filter: 'blur(4px)' }}
                  />
                )}
                <circle
                  cx={svgX}
                  cy={svgY}
                  r={size}
                  fill={getShotColor(shot.outcome, "away")}
                  opacity={isGoal ? 0.9 : 0.7}
                  stroke="#fff"
                  strokeWidth={isGoal ? 2.5 : 1.5}
                  style={{ filter: isGoal ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' : 'none' }}
                >
                  <title>
                    {shot.playerName || "Player"} - {shot.minute !== undefined ? `${shot.minute}'` : "N/A"} - xG: {shot.xg.toFixed(2)} - {shot.outcome} (Away)
                  </title>
                </circle>
                {/* xG label for goals */}
                {isGoal && (
                  <text
                    x={svgX}
                    y={svgY - size - 4}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize="8"
                    fontWeight="bold"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                  >
                    {shot.xg.toFixed(2)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

