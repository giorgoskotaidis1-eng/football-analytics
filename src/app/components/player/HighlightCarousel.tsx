"use client";

import { useState } from "react";

interface Highlight {
  id: string;
  description: string;
  timestamp: number;
  outcome: string;
  x: number;
  y: number;
  videoUrl?: string;
  matchId?: number;
  matchDate?: string;
  competition?: string;
}

interface HighlightCarouselProps {
  highlights: Highlight[];
}

export function HighlightCarousel({ highlights }: HighlightCarouselProps) {
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);

  if (highlights.length === 0) {
    return (
      <div className="rounded-xl border border-[#1a1f2e] bg-gradient-to-br from-[#0b1220] to-[#0f1620] p-8 text-center">
        <svg className="mx-auto h-12 w-12 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <p className="mt-4 text-sm text-white/60">Δεν υπάρχουν highlights</p>
      </div>
    );
  }

  const getOutcomeColor = (outcome: string) => {
    switch (outcome.toLowerCase()) {
      case "goal":
        return "bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-yellow-500/30 text-yellow-400";
      case "ongoal":
        return "bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30 text-green-400";
      case "assist":
        return "bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400";
      case "tackle":
        return "bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400";
      default:
        return "bg-gradient-to-br from-slate-500/20 to-slate-600/20 border-slate-500/30 text-slate-400";
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {highlights.map((highlight) => (
          <div
            key={highlight.id}
            onClick={() => setSelectedHighlight(highlight)}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-[#1a2f3f]/50 bg-gradient-to-br from-[#0c1f2f] via-[#0f1923] to-[#0c1f2f] p-6 transition-all hover:border-[#2a4f5f]/70 hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] hover:scale-[1.02]"
          >
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#1a2f3f]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
              background: `radial-gradient(circle at ${highlight.x * 100}% ${highlight.y * 100}%, rgba(16, 185, 129, 0.15) 0%, transparent 60%)`
            }} />
            
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className={`rounded-xl border px-3 py-1.5 text-[10px] font-bold uppercase shadow-lg ${getOutcomeColor(highlight.outcome)}`}>
                  {highlight.outcome}
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-[#1a1f2e]/50 px-2.5 py-1">
                  <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[10px] font-semibold text-white/80">{formatTime(highlight.timestamp)}</span>
                </div>
              </div>
              <p className="text-base font-bold text-white mb-3 leading-tight">{highlight.description}</p>
              {highlight.competition && (
                <div className="flex items-center gap-2 mb-3">
                  <svg className="h-3.5 w-3.5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p className="text-[11px] text-white/50 font-medium">{highlight.competition}</p>
                </div>
              )}
              {highlight.videoUrl && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 px-4 py-2.5 text-[11px] text-emerald-400 font-semibold transition-all group-hover:from-emerald-500/25 group-hover:to-teal-500/25 group-hover:border-emerald-500/40 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Watch Video</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedHighlight && selectedHighlight.videoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedHighlight(null)}>
          <div className="relative w-full max-w-4xl rounded-xl overflow-hidden border border-[#1a1f2e] bg-[#0b1220]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[#1a1f2e]">
              <div>
                <h3 className="text-sm font-bold text-white">{selectedHighlight.description}</h3>
                <p className="text-[10px] text-white/60">{selectedHighlight.competition}</p>
              </div>
              <button
                onClick={() => setSelectedHighlight(null)}
                className="rounded-lg p-2 text-white/60 hover:bg-[#1a1f2e] hover:text-white transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="aspect-video bg-black">
              <video
                src={selectedHighlight.videoUrl}
                controls
                className="w-full h-full"
                autoPlay
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

