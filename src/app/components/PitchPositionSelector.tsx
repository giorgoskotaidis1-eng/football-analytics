"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface PitchPositionSelectorProps {
  x: number | null;
  y: number | null;
  onPositionChange: (x: number, y: number) => void;
  team: "home" | "away";
}

export function PitchPositionSelector({ x, y, onPositionChange, team }: PitchPositionSelectorProps) {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localX, setLocalX] = useState<number | null>(x);
  const [localY, setLocalY] = useState<number | null>(y);
  const rafRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Update local state when props change (only when not dragging)
  useEffect(() => {
    if (!isDragging) {
      setLocalX(x);
      setLocalY(y);
    }
  }, [x, y, isDragging]);

  // Default to center if no position
  const currentX = localX ?? 50;
  const currentY = localY ?? 50;

  // Optimized position calculation with throttling
  const updatePosition = useCallback((clientX: number, clientY: number) => {
    if (!pitchRef.current) return;
    
    const now = performance.now();
    // Throttle to max 60fps (16ms)
    if (now - lastUpdateRef.current < 16 && isDragging) {
      return;
    }
    lastUpdateRef.current = now;

    const rect = pitchRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;
    
    const pitchX = (clickX / rect.width) * 100;
    const pitchY = (clickY / rect.height) * 100;
    
    // Clamp to 0-100
    const clampedX = Math.max(0, Math.min(100, pitchX));
    const clampedY = Math.max(0, Math.min(100, pitchY));
    
    // Update local state immediately for smooth UI
    setLocalX(clampedX);
    setLocalY(clampedY);
    
    // Use requestAnimationFrame for smooth updates
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    rafRef.current = requestAnimationFrame(() => {
      onPositionChange(clampedX, clampedY);
    });
  }, [isDragging, onPositionChange]);

  const handlePitchClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    updatePosition(e.clientX, e.clientY);
  }, [updatePosition]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e.clientX, e.clientY);
  }, [updatePosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updatePosition(e.clientX, e.clientY);
  }, [isDragging, updatePosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    // Final update
    if (localX !== null && localY !== null) {
      onPositionChange(localX, localY);
    }
  }, [isDragging, localX, localY, onPositionChange]);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-slate-300">Position on Pitch</label>
        <div className="text-[10px] text-slate-500">
          X: {currentX.toFixed(1)} | Y: {currentY.toFixed(1)}
        </div>
      </div>
      
      {/* Interactive Pitch */}
      <div
        ref={pitchRef}
        className="relative w-full cursor-crosshair rounded-lg border-2 border-slate-700 bg-gradient-to-b from-emerald-900/30 to-emerald-950/50 select-none touch-none"
        style={{ aspectRatio: "3/2" }}
        onClick={handlePitchClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        onTouchStart={(e) => {
          e.preventDefault();
          const touch = e.touches[0];
          setIsDragging(true);
          updatePosition(touch.clientX, touch.clientY);
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          if (!isDragging) return;
          const touch = e.touches[0];
          updatePosition(touch.clientX, touch.clientY);
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleMouseUp();
        }}
      >
        {/* Pitch Lines */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 66.67">
          {/* Center Circle */}
          <circle cx="50" cy="33.33" r="9.5" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          {/* Center Line */}
          <line x1="50" y1="0" x2="50" y2="66.67" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          
          {/* Penalty Areas */}
          <rect x="0" y="20" width="16.67" height="26.67" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          <rect x="83.33" y="20" width="16.67" height="26.67" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          
          {/* Goal Areas */}
          <rect x="0" y="25" width="5.56" height="16.67" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          <rect x="94.44" y="25" width="5.56" height="16.67" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          
          {/* Goals */}
          <line x1="0" y1="29.17" x2="0" y2="37.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          <line x1="100" y1="29.17" x2="100" y2="37.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        </svg>

        {/* Position Marker - Optimized with will-change */}
        <div
          className="absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-500 shadow-lg"
          style={{
            left: `${currentX}%`,
            top: `${currentY}%`,
            willChange: isDragging ? 'transform' : 'auto',
            transition: isDragging ? 'none' : 'left 0.1s ease-out, top 0.1s ease-out',
          }}
        >
          {!isDragging && (
            <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-20" />
          )}
        </div>

        {/* Zone Labels */}
        <div className="absolute left-2 top-1 text-[8px] font-medium text-slate-400">
          {team === "home" ? "← Your Goal" : "← Opponent Goal"}
        </div>
        <div className="absolute right-2 top-1 text-[8px] font-medium text-slate-400">
          {team === "home" ? "Opponent Goal →" : "Your Goal →"}
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 top-1 text-[8px] font-medium text-slate-400">
          Center
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-md bg-slate-900/50 p-2 text-[10px] text-slate-400">
        <p className="font-medium text-slate-300 mb-1">How to use:</p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li><strong>X (0-100):</strong> Left (0) to Right (100) - Where horizontally on the pitch</li>
          <li><strong>Y (0-100):</strong> Your Goal (0) to Opponent Goal (100) - How far forward</li>
          <li>Click or drag on the pitch to set position</li>
        </ul>
      </div>

      {/* Manual Input Fallback */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400">X Position</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            className="h-7 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            value={currentX.toFixed(1)}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              const clampedVal = Math.max(0, Math.min(100, val));
              setLocalX(clampedVal);
              onPositionChange(clampedVal, currentY);
            }}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400">Y Position</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            className="h-7 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            value={currentY.toFixed(1)}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              const clampedVal = Math.max(0, Math.min(100, val));
              setLocalY(clampedVal);
              onPositionChange(currentX, clampedVal);
            }}
          />
        </div>
      </div>
    </div>
  );
}

