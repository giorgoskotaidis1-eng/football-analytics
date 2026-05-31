"use client";

import { useState, useEffect } from "react";

type Player = {
  id: number;
  name: string;
  position: string;
  number: number | null;
  team: { id: number; name: string } | null;
  goals: number | null;
  assists: number | null;
  xg: number | null;
  xag: number | null;
  shotsPer90: number | null;
  keyPassesPer90: number | null;
  pressuresPer90: number | null;
  progressivePassesPer90: number | null;
  carriesIntoFinalThirdPer90: number | null;
  defensiveDuelsWonPer90: number | null;
};

interface PlayerStatsModalProps {
  player: Player;
  onClose: () => void;
  onSave: () => void;
}

export function PlayerStatsModal({ player, onClose, onSave }: PlayerStatsModalProps) {
  const [stats, setStats] = useState({
    goals: player.goals ?? 0,
    assists: player.assists ?? 0,
    xg: player.xg ?? 0,
    xag: player.xag ?? 0,
    shotsPer90: player.shotsPer90 ?? 0,
    keyPassesPer90: player.keyPassesPer90 ?? 0,
    pressuresPer90: player.pressuresPer90 ?? 0,
    progressivePassesPer90: player.progressivePassesPer90 ?? 0,
    carriesIntoFinalThirdPer90: player.carriesIntoFinalThirdPer90 ?? 0,
    defensiveDuelsWonPer90: player.defensiveDuelsWonPer90 ?? 0,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/player-stats/${player.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stats),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          onSave();
        } else {
          alert(`Error: ${data.message}`);
        }
      } else {
        const error = await res.json();
        alert(`Error: ${error.message || "Failed to save stats"}`);
      }
    } catch (error) {
      console.error("[PlayerStatsModal] Error:", error);
      alert("Failed to save statistics");
    } finally {
      setSaving(false);
    }
  }

  function handleInputChange(field: keyof typeof stats, value: string) {
    const numValue = parseFloat(value) || 0;
    setStats((prev) => ({ ...prev, [field]: numValue }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-[#1a2f3f]/50 bg-gradient-to-br from-[#0c1f2f] via-[#0f1923] to-[#0c1f2f] shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 border-b border-[#1a2f3f]/50 bg-gradient-to-r from-[#0c1f2f]/95 to-[#0f1923]/95 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent">
                Edit Statistics
              </h2>
              <p className="text-sm text-white/60 mt-1">{player.name} • {player.team?.name || "No Team"}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-white/60 hover:bg-[#1a2f3f] hover:text-white transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Stats */}
          <div>
            <h3 className="text-sm font-semibold text-white/80 mb-4 uppercase tracking-wider">Basic Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-white/60 mb-2">Goals</label>
                <input
                  type="number"
                  value={stats.goals}
                  onChange={(e) => handleInputChange("goals", e.target.value)}
                  className="w-full rounded-xl border border-[#1a2f3f] bg-[#0c1f2f] px-4 py-2.5 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/60 mb-2">Assists</label>
                <input
                  type="number"
                  value={stats.assists}
                  onChange={(e) => handleInputChange("assists", e.target.value)}
                  className="w-full rounded-xl border border-[#1a2f3f] bg-[#0c1f2f] px-4 py-2.5 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/60 mb-2">xG</label>
                <input
                  type="number"
                  step="0.01"
                  value={stats.xg}
                  onChange={(e) => handleInputChange("xg", e.target.value)}
                  className="w-full rounded-xl border border-[#1a2f3f] bg-[#0c1f2f] px-4 py-2.5 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/60 mb-2">xAG</label>
                <input
                  type="number"
                  step="0.01"
                  value={stats.xag}
                  onChange={(e) => handleInputChange("xag", e.target.value)}
                  className="w-full rounded-xl border border-[#1a2f3f] bg-[#0c1f2f] px-4 py-2.5 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Per 90 Stats */}
          <div>
            <h3 className="text-sm font-semibold text-white/80 mb-4 uppercase tracking-wider">Per 90 Minutes</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-white/60 mb-2">Shots per 90</label>
                <input
                  type="number"
                  step="0.01"
                  value={stats.shotsPer90}
                  onChange={(e) => handleInputChange("shotsPer90", e.target.value)}
                  className="w-full rounded-xl border border-[#1a2f3f] bg-[#0c1f2f] px-4 py-2.5 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/60 mb-2">Key Passes per 90</label>
                <input
                  type="number"
                  step="0.01"
                  value={stats.keyPassesPer90}
                  onChange={(e) => handleInputChange("keyPassesPer90", e.target.value)}
                  className="w-full rounded-xl border border-[#1a2f3f] bg-[#0c1f2f] px-4 py-2.5 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/60 mb-2">Pressures per 90</label>
                <input
                  type="number"
                  step="0.01"
                  value={stats.pressuresPer90}
                  onChange={(e) => handleInputChange("pressuresPer90", e.target.value)}
                  className="w-full rounded-xl border border-[#1a2f3f] bg-[#0c1f2f] px-4 py-2.5 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/60 mb-2">Progressive Passes per 90</label>
                <input
                  type="number"
                  step="0.01"
                  value={stats.progressivePassesPer90}
                  onChange={(e) => handleInputChange("progressivePassesPer90", e.target.value)}
                  className="w-full rounded-xl border border-[#1a2f3f] bg-[#0c1f2f] px-4 py-2.5 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/60 mb-2">Carries into Final Third per 90</label>
                <input
                  type="number"
                  step="0.01"
                  value={stats.carriesIntoFinalThirdPer90}
                  onChange={(e) => handleInputChange("carriesIntoFinalThirdPer90", e.target.value)}
                  className="w-full rounded-xl border border-[#1a2f3f] bg-[#0c1f2f] px-4 py-2.5 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/60 mb-2">Defensive Duels Won per 90</label>
                <input
                  type="number"
                  step="0.01"
                  value={stats.defensiveDuelsWonPer90}
                  onChange={(e) => handleInputChange("defensiveDuelsWonPer90", e.target.value)}
                  className="w-full rounded-xl border border-[#1a2f3f] bg-[#0c1f2f] px-4 py-2.5 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-[#1a2f3f]/50 bg-gradient-to-r from-[#0c1f2f]/95 to-[#0f1923]/95 backdrop-blur-sm p-6">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-xl border border-[#1a2f3f] bg-[#0c1f2f] px-4 py-2.5 text-sm font-semibold text-white/80 transition-all hover:bg-[#1a2f3f] hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-400 transition-all hover:from-emerald-500/20 hover:to-teal-500/20 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Statistics"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}






