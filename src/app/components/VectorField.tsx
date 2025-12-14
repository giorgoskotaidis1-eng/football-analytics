"use client";

import { useMemo, useEffect, useRef, useState } from "react";

interface Event {
  id: number;
  type: string;
  team: string;
  x: number | null;
  y: number | null;
  metadata: string | null;
}

interface VectorFieldProps {
  events: Event[];
  team: "home" | "away";
  teamName: string;
}

export function VectorField({ events, team, teamName }: VectorFieldProps) {
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

  const vectors = useMemo(() => {
    // Get passes with valid start AND end coordinates from metadata
    const passesWithVectors = events.filter((e) => {
      if (!e || e.type !== "pass" || e.team !== team) return false;
      
      // Must have start coords
      if (e.x === null || e.y === null || isNaN(Number(e.x)) || isNaN(Number(e.y))) return false;
      
      // Must have end coords in metadata
      if (!e.metadata) return false;
      
      try {
        const meta = typeof e.metadata === "string" ? JSON.parse(e.metadata) : e.metadata;
        const endX = meta.endX !== undefined ? Number(meta.endX) : null;
        const endY = meta.endY !== undefined ? Number(meta.endY) : null;
        
        if (endX === null || endY === null || isNaN(endX) || isNaN(endY)) return false;
        if (endX < 0 || endX > 100 || endY < 0 || endY > 100) return false;
        
        return true;
      } catch {
        return false;
      }
    });

    if (passesWithVectors.length === 0) return [];

    // Calculate vectors from startX/startY to endX/endY
    const calculatedVectors: Array<{
      x: number;
      y: number;
      angle: number;
      magnitude: number;
      intensity: number;
    }> = [];

    passesWithVectors.forEach((pass) => {
      if (!pass.metadata || pass.x === null || pass.y === null) return;
      
      try {
        const meta = typeof pass.metadata === "string" ? JSON.parse(pass.metadata) : pass.metadata;
        const startX = Number(pass.x);
        const startY = Number(pass.y);
        const endX = Number(meta.endX);
        const endY = Number(meta.endY);
        
        if (isNaN(startX) || isNaN(startY) || isNaN(endX) || isNaN(endY)) return;
        
        // Calculate dx, dy in normalized 0-100 space
        const dx = endX - startX;
        const dy = endY - startY;
        
        // Calculate magnitude (distance)
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        
        // Filter out noisy/zero magnitude vectors (threshold: >2% of pitch)
        if (magnitude < 2) return;
        
        // Calculate angle in degrees (0 = right, 90 = down, 180 = left, 270 = up)
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        
        // Normalize coords to 0-100
        const normalizedX = Math.max(0, Math.min(100, startX));
        const normalizedY = Math.max(0, Math.min(100, startY));
        
        // Intensity based on magnitude (normalized 0-1)
        const intensity = Math.min(1, magnitude / 50); // Max 50% of pitch = intensity 1
        
        calculatedVectors.push({
          x: normalizedX,
          y: normalizedY,
          angle: Number(angle) || 0,
          magnitude: Number(magnitude) || 0,
          intensity: Number(intensity) || 0,
        });
      } catch {
        // Invalid metadata, skip
        return;
      }
    });

    // Group by zones and average for visualization (reduce noise)
    const gridSize = 10; // 10x6 grid
    const rows = 6;
    const cols = 10;
    const zoneVectors: Array<{
      x: number;
      y: number;
      angle: number;
      intensity: number;
    }> = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const zoneX = (col / cols) * 100;
        const zoneY = (row / rows) * 100;
        const zoneWidth = 100 / cols;
        const zoneHeight = 100 / rows;

        const zoneVectorsList = calculatedVectors.filter((v) => {
          return (
            v.x >= zoneX &&
            v.x < zoneX + zoneWidth &&
            v.y >= zoneY &&
            v.y < zoneY + zoneHeight
          );
        });

        if (zoneVectorsList.length > 0) {
          // Average angle (circular mean)
          let sinSum = 0;
          let cosSum = 0;
          let totalIntensity = 0;
          
          zoneVectorsList.forEach((v) => {
            const rad = (v.angle * Math.PI) / 180;
            sinSum += Math.sin(rad) * v.intensity;
            cosSum += Math.cos(rad) * v.intensity;
            totalIntensity += v.intensity;
          });
          
          const avgAngle = (Math.atan2(sinSum, cosSum) * 180) / Math.PI;
          const avgIntensity = totalIntensity / zoneVectorsList.length;

          zoneVectors.push({
            x: zoneX + zoneWidth / 2,
            y: zoneY + zoneHeight / 2,
            angle: Number(avgAngle) || 0,
            intensity: Math.max(0, Math.min(1, Number(avgIntensity) || 0)),
          });
        }
      }
    }

    return zoneVectors;
  }, [events, team, isVisible]);

  const color = team === "home" ? "#22c55e" : "#38bdf8";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#1a1f2e] bg-[#0b1220] p-4 shadow-lg">
        <p className="mb-3 text-[10px] font-medium text-white/80">{teamName} - Movement vectors</p>
        <div 
          ref={containerRef}
          className="relative aspect-[3/2] w-full overflow-hidden rounded-xl border border-[#1a1f2e] bg-[#0a0e17]"
        >
          {/* SVG Pitch - cleaner, darker */}
          <svg 
            className="absolute inset-0 w-full h-full z-0"
            preserveAspectRatio="xMidYMid meet"
            viewBox="0 0 600 400"
          >
            <rect x={0} y={0} width={600} height={400} fill="#0a0e17" />
            {/* Pitch outline */}
            <rect x={2} y={2} width={596} height={396} fill="none" stroke="#1a1f2e" strokeWidth={0.5} opacity={0.8} />
            {/* Center line */}
            <line x1={300} y1={0} x2={300} y2={400} stroke="#1a1f2e" strokeWidth={0.5} strokeDasharray="6,4" opacity={0.6} />
            {/* Center circle */}
            <circle cx={300} cy={200} r={72} fill="none" stroke="#1a1f2e" strokeWidth={0.5} opacity={0.6} />
            <circle cx={300} cy={200} r={1.5} fill="#1a1f2e" opacity={0.6} />
            {/* Penalty boxes */}
            <rect x={0} y={60} width={108} height={280} fill="none" stroke="#1a1f2e" strokeWidth={0.5} opacity={0.6} />
            <rect x={0} y={120} width={72} height={160} fill="none" stroke="#1a1f2e" strokeWidth={0.5} opacity={0.6} />
            <rect x={492} y={60} width={108} height={280} fill="none" stroke="#1a1f2e" strokeWidth={0.5} opacity={0.6} />
            <rect x={528} y={120} width={72} height={160} fill="none" stroke="#1a1f2e" strokeWidth={0.5} opacity={0.6} />
            {/* Goal boxes */}
            <rect x={0} y={140} width={36} height={120} fill="none" stroke="#1a1f2e" strokeWidth={0.5} opacity={0.6} />
            <rect x={564} y={140} width={36} height={120} fill="none" stroke="#1a1f2e" strokeWidth={0.5} opacity={0.6} />
          </svg>

          {/* Vector arrows - overlay on pitch */}
          {vectors.length > 0 ? (
            vectors.map((vector, idx) => {
              // Length proportional to intensity
              const length = 15 + vector.intensity * 20;
              // For away team, flip angle (they attack from opposite direction)
              const adjustedAngle = team === "home" ? vector.angle : vector.angle + 180;

              return (
                <div
                  key={idx}
                  className="absolute origin-center opacity-80"
                  style={{
                    left: `${vector.x}%`,
                    top: `${vector.y}%`,
                    transform: `translate(-50%, -50%) rotate(${adjustedAngle}deg)`,
                  }}
                >
                  <div
                    className="relative"
                    style={{
                      width: `${length}px`,
                      height: "2px",
                      background: color,
                      boxShadow: `0 0 8px ${color}66`,
                    }}
                  >
                    <div
                      className="absolute -right-[4px] top-1/2 h-0 w-0 -translate-y-1/2 border-y-[4px] border-l-[6px] border-y-transparent"
                      style={{ borderLeftColor: color }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex h-full items-center justify-center text-[11px] text-white/50 z-10 relative">
              Δεν υπάρχουν διανύσματα για αυτό το φίλτρο
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="rounded-xl border border-[#1a1f2e] bg-[#0b1220] p-3 shadow-lg">
        <p className="text-[10px] text-white/70 mb-2">Στατιστικά διανυσμάτων</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
          <div>
            <span className="text-white/60">Συνολικά διανύσματα</span>
            <p className="mt-1 text-base font-semibold text-white">{vectors.length || 0}</p>
          </div>
          <div>
            <span className="text-white/60">Μέση ένταση</span>
            <p className="mt-1 text-base font-semibold text-emerald-400">
              {vectors.length > 0
                ? (vectors.reduce((sum, v) => sum + (v.intensity || 0), 0) / vectors.length).toFixed(2)
                : "0.00"}
            </p>
          </div>
          <div>
            <span className="text-white/60">Κατεύθυνση</span>
            <p className="mt-1 text-base font-semibold text-white">
              {team === "home" ? "→ Εμπρός" : "← Εμπρός"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

