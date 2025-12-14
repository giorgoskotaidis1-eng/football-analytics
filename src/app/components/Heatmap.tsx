"use client";

import { useEffect, useRef, useState } from "react";

interface HeatmapProps {
  data: number[][];
  width?: number;
  height?: number;
  showPitch?: boolean;
  team?: "home" | "away";
  teamName?: string;
}

export function Heatmap({ data, width = 600, height = 400, showPitch = true, team = "home", teamName }: HeatmapProps) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  // Calculate grid dimensions and max value (before conditional returns)
  const gridRows = data && Array.isArray(data) && data.length > 0 && Array.isArray(data[0]) ? data.length : 0;
  const gridCols = data && Array.isArray(data) && data.length > 0 && Array.isArray(data[0]) ? (data[0]?.length || 0) : 0;
  const flatData = data && Array.isArray(data) ? data.flat().filter((v) => !isNaN(Number(v)) && Number(v) >= 0) : [];
  const maxValue = flatData.length > 0 ? Math.max(...flatData.map((v) => Number(v)), 1) : 1;
  
  // Warm balanced color palette: #001f4d → #005f73 → #0a9396 → #94d2bd → #ee9b00 → #ca6702 → #bb3e03 → #ae2012
  // Define getColor function before useEffect that uses it
  const getColor = (normalized: number): { r: number; g: number; b: number; a: number } => {
    if (normalized < 0.01) return { r: 0, g: 31, b: 77, a: 0 }; // #001f4d
    
    let r, g, b, a;
    
    // Normalized is already 0-1 from sqrt scale
    if (normalized < 0.125) {
      // #001f4d → #005f73
      const t = normalized / 0.125;
      r = Math.floor(0 + t * 0);
      g = Math.floor(31 + t * (95 - 31));
      b = Math.floor(77 + t * (115 - 77));
      a = 0.3 + t * 0.2;
    } else if (normalized < 0.25) {
      // #005f73 → #0a9396
      const t = (normalized - 0.125) / 0.125;
      r = Math.floor(0 + t * 10);
      g = Math.floor(95 + t * (147 - 95));
      b = Math.floor(115 + t * (150 - 115));
      a = 0.5 + t * 0.15;
    } else if (normalized < 0.375) {
      // #0a9396 → #94d2bd
      const t = (normalized - 0.25) / 0.125;
      r = Math.floor(10 + t * (148 - 10));
      g = Math.floor(147 + t * (210 - 147));
      b = Math.floor(150 + t * (189 - 150));
      a = 0.65 + t * 0.1;
    } else if (normalized < 0.5) {
      // #94d2bd → #ee9b00
      const t = (normalized - 0.375) / 0.125;
      r = Math.floor(148 + t * (238 - 148));
      g = Math.floor(210 + t * (155 - 210));
      b = Math.floor(189 + t * (0 - 189));
      a = 0.75 + t * 0.1;
    } else if (normalized < 0.625) {
      // #ee9b00 → #ca6702
      const t = (normalized - 0.5) / 0.125;
      r = Math.floor(238 + t * (202 - 238));
      g = Math.floor(155 + t * (103 - 155));
      b = Math.floor(0 + t * (2 - 0));
      a = 0.85 + t * 0.05;
    } else if (normalized < 0.75) {
      // #ca6702 → #bb3e03
      const t = (normalized - 0.625) / 0.125;
      r = Math.floor(202 + t * (187 - 202));
      g = Math.floor(103 + t * (62 - 103));
      b = Math.floor(2 + t * (3 - 2));
      a = 0.9 + t * 0.03;
    } else {
      // #bb3e03 → #ae2012
      const t = (normalized - 0.75) / 0.25;
      r = Math.floor(187 + t * (174 - 187));
      g = Math.floor(62 + t * (32 - 62));
      b = Math.floor(3 + t * (18 - 3));
      a = 0.93 + t * 0.07;
    }
    
    return { r: Math.max(0, Math.min(255, r)), g: Math.max(0, Math.min(255, g)), b: Math.max(0, Math.min(255, b)), a: Math.max(0, Math.min(1, a)) };
  };
  
  // Render effect - must be after all hooks but before conditional returns
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible) return;
    
    // Early return if no valid data
    if (!data || !Array.isArray(data) || data.length === 0 || !data[0] || !Array.isArray(data[0])) return;
    if (maxValue <= 0 || flatData.every((v) => Number(v) === 0)) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Use container dimensions if available, otherwise use props
    const actualWidth = containerRef.current?.clientWidth || width;
    const actualHeight = containerRef.current?.clientHeight || height;

    canvas.width = actualWidth;
    canvas.height = actualHeight;

    ctx.clearRect(0, 0, actualWidth, actualHeight);

    const cellWidth = actualWidth / gridCols;
    const cellHeight = actualHeight / gridRows;
    const imageData = ctx.createImageData(actualWidth, actualHeight);
    const pixels = imageData.data;

    // Smooth interpolation with bilinear filtering
    for (let y = 0; y < actualHeight; y++) {
      for (let x = 0; x < actualWidth; x++) {
        const pixelIndex = (y * actualWidth + x) * 4;
        
        // Get fractional cell coordinates
        const fx = x / cellWidth;
        const fy = y / cellHeight;
        const cellX = Math.floor(fx);
        const cellY = Math.floor(fy);
        
        // Bilinear interpolation from 4 nearest cells
        const x1 = Math.max(0, Math.min(gridCols - 1, cellX));
        const x2 = Math.max(0, Math.min(gridCols - 1, cellX + 1));
        const y1 = Math.max(0, Math.min(gridRows - 1, cellY));
        const y2 = Math.max(0, Math.min(gridRows - 1, cellY + 1));
        
        const dx = fx - cellX;
        const dy = fy - cellY;
        
        // Get values from 4 corners (data is already normalized 0-1 from sqrt scale)
        const v11 = (data[y1]?.[x1] || 0);
        const v21 = (data[y1]?.[x2] || 0);
        const v12 = (data[y2]?.[x1] || 0);
        const v22 = (data[y2]?.[x2] || 0);
        
        // Bilinear interpolation
        const v1 = v11 * (1 - dx) + v21 * dx;
        const v2 = v12 * (1 - dx) + v22 * dx;
        const value = v1 * (1 - dy) + v2 * dy;
        
        if (value > 0) {
          // Value is already normalized 0-1 from sqrt scale
          const normalized = Math.min(1, Math.max(0, value));
          const color = getColor(normalized);
          
          pixels[pixelIndex] = color.r;
          pixels[pixelIndex + 1] = color.g;
          pixels[pixelIndex + 2] = color.b;
          pixels[pixelIndex + 3] = Math.floor(color.a * 255 * 0.75); // Opacity ~0.75 for pitch visibility
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    
    // Dynamic blur radius: clamp((pitchPx/80)*1.3, 10, 22)
    // This adapts to actual canvas size for consistent visual quality
    const blurRadius = Math.min(22, Math.max(10, (actualWidth / 80) * 1.3));
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = actualWidth;
    tempCanvas.height = actualHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.filter = `blur(${blurRadius}px)`;
      tempCtx.drawImage(canvas, 0, 0);
      ctx.clearRect(0, 0, actualWidth, actualHeight);
      ctx.drawImage(tempCanvas, 0, 0);
    }
  }, [data, width, height, maxValue, gridRows, gridCols, isVisible, flatData]);

  // Validate data - AFTER all hooks
  if (!data || !Array.isArray(data) || data.length === 0 || !data[0] || !Array.isArray(data[0])) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center rounded-xl border border-[#1a1f2e] bg-[#0b1220] text-[11px] text-white/50 shadow-lg" style={{ width, height }}>
          Not enough events for heatmap
        </div>
      </div>
    );
  }
  
  // Check if we have any meaningful data
  if (maxValue <= 0 || flatData.every((v) => Number(v) === 0)) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center rounded-xl border border-[#1a1f2e] bg-[#0b1220] text-[11px] text-white/50 shadow-lg" style={{ width, height }}>
          Not enough events for heatmap
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div 
        ref={containerRef}
        className="relative rounded-xl border border-[#1a1f2e] bg-[#0b1220] overflow-hidden shadow-lg" 
        style={{ width, height }}
      >
      {/* Elevated team label */}
      {teamName && (
        <div className="absolute -top-3 left-3 bg-[#0b1220] px-2 z-30">
          <div className="text-[9px] font-semibold text-white/90 uppercase tracking-wide">
            {teamName}
          </div>
        </div>
      )}
      {showPitch && (
        <svg 
          width="100%" 
          height="100%" 
          className="absolute inset-0 z-0"
          preserveAspectRatio="xMidYMid meet"
          viewBox={`0 0 ${width} ${height}`}
        >
          {/* Dark pitch background */}
          <rect x={0} y={0} width={width} height={height} fill="#0a0e17" />
          
          {/* Pitch outline - visible but not overpowering (stroke alpha 0.2-0.35) */}
          <rect
            x={2}
            y={2}
            width={width - 4}
            height={height - 4}
            fill="none"
            stroke="#22c55e"
            strokeWidth={1}
            opacity={0.25}
          />
          
          {/* Center line - visible but subtle */}
          <line
            x1={width / 2}
            y1={0}
            x2={width / 2}
            y2={height}
            stroke="#22c55e"
            strokeWidth={1}
            strokeDasharray="6,4"
            opacity={0.25}
          />
          
          {/* Center circle - visible but subtle */}
          <circle
            cx={width / 2}
            cy={height / 2}
            r={Math.min(width, height) * 0.18}
            fill="none"
            stroke="#22c55e"
            strokeWidth={1}
            opacity={0.25}
          />
          <circle cx={width / 2} cy={height / 2} r={2} fill="#22c55e" opacity={0.3} />
          
          {/* Penalty boxes - visible but subtle */}
          <rect
            x={0}
            y={height * 0.15}
            width={width * 0.18}
            height={height * 0.7}
            fill="none"
            stroke="#22c55e"
            strokeWidth={1}
            opacity={0.25}
          />
          <rect
            x={0}
            y={height * 0.3}
            width={width * 0.12}
            height={height * 0.4}
            fill="none"
            stroke="#22c55e"
            strokeWidth={1}
            opacity={0.25}
          />
          
          <rect
            x={width * 0.82}
            y={height * 0.15}
            width={width * 0.18}
            height={height * 0.7}
            fill="none"
            stroke="#22c55e"
            strokeWidth={1}
            opacity={0.25}
          />
          <rect
            x={width * 0.88}
            y={height * 0.3}
            width={width * 0.12}
            height={height * 0.4}
            fill="none"
            stroke="#22c55e"
            strokeWidth={1}
            opacity={0.25}
          />
          
          {/* Goal boxes - slightly more visible */}
          <rect
            x={0}
            y={height * 0.35}
            width={width * 0.06}
            height={height * 0.3}
            fill="none"
            stroke="#22c55e"
            strokeWidth={1.5}
            opacity={0.3}
          />
          <rect
            x={width * 0.94}
            y={height * 0.35}
            width={width * 0.06}
            height={height * 0.3}
            fill="none"
            stroke="#22c55e"
            strokeWidth={1.5}
            opacity={0.3}
          />
        </svg>
      )}

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 z-10"
        style={{ 
          mixBlendMode: 'screen',
          pointerEvents: 'none',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.6
        }}
      />
      </div>
      
      {/* Legend outside the pitch - cleaner design */}
      <div className="flex items-center justify-center">
        <div className="bg-[#0b1220]/95 backdrop-blur-md border border-[#1a1f2e]/50 rounded-lg px-4 py-3 shadow-xl">
          <div className="mb-2 text-center">
            <div className="text-[9px] font-semibold text-white/90 uppercase tracking-wide">
              {teamName ? `${teamName} - Intensity` : "Intensity Scale"}
            </div>
          </div>
          <div className="flex items-center gap-0 mb-1">
            <div className="w-12 h-4 rounded-l" style={{ backgroundColor: 'rgb(0, 31, 77)' }} />
            <div className="w-12 h-4" style={{ backgroundColor: 'rgb(0, 95, 115)' }} />
            <div className="w-12 h-4" style={{ backgroundColor: 'rgb(10, 147, 150)' }} />
            <div className="w-12 h-4" style={{ backgroundColor: 'rgb(148, 210, 189)' }} />
            <div className="w-12 h-4" style={{ backgroundColor: 'rgb(238, 155, 0)' }} />
            <div className="w-12 h-4" style={{ backgroundColor: 'rgb(202, 103, 2)' }} />
            <div className="w-12 h-4" style={{ backgroundColor: 'rgb(187, 62, 3)' }} />
            <div className="w-12 h-4 rounded-r" style={{ backgroundColor: 'rgb(174, 32, 18)' }} />
          </div>
          <div className="flex items-center gap-0 text-[9px] text-white/80 font-medium">
            <div className="w-12 text-center">Low</div>
            <div className="w-12 text-center">Med</div>
            <div className="w-12 text-center">High</div>
            <div className="w-12 text-center">V.High</div>
            <div className="w-12 text-center">Max</div>
          </div>
        </div>
      </div>
    </div>
  );
}
