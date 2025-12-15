"use client";

import { useMemo, useState } from "react";
import { ShotHeatmap } from "./ShotHeatmap";
import { GoalPlacement } from "./GoalPlacement";
import { ShotTimeline } from "./ShotTimeline";
import { PlayerStatsTable } from "./PlayerStatsTable";
import { useTranslation } from "@/lib/i18n";

export type ShotEvent = {
  playerId: string;
  playerName: string;
  teamId: string;
  timeSec: number;
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  goal?: boolean;
  xg?: number;
  shotType?: string;
  outcome?: "OnGoal" | "Wide" | "Blocked" | "Goal";
};

interface ShotAnalyticsProps {
  shots: ShotEvent[];
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId?: string;
  awayTeamId?: string;
}

export function ShotAnalytics({ shots, homeTeamName, awayTeamName, homeTeamId, awayTeamId }: ShotAnalyticsProps) {
  const { t } = useTranslation();
  const [selectedHalf, setSelectedHalf] = useState<"all" | "1H" | "2H">("all");
  const [selectedTeam, setSelectedTeam] = useState<"all" | "home" | "away">("all");
  const [selectedShotType, setSelectedShotType] = useState<string>("all");

  // Filter shots based on selected filters
  const filteredShots = useMemo(() => {
    return shots.filter((shot) => {
      // Half filter
      if (selectedHalf !== "all") {
        const minute = Math.floor(shot.timeSec / 60);
        if (selectedHalf === "1H" && minute > 45) return false;
        if (selectedHalf === "2H" && minute <= 45) return false;
      }

      // Team filter
      if (selectedTeam !== "all") {
        if (selectedTeam === "home" && shot.teamId !== homeTeamId) return false;
        if (selectedTeam === "away" && shot.teamId !== awayTeamId) return false;
      }

      // Shot type filter
      if (selectedShotType !== "all" && shot.shotType !== selectedShotType) return false;

      return true;
    });
  }, [shots, selectedHalf, selectedTeam, selectedShotType, homeTeamId, awayTeamId]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredShots.length;
    const goals = filteredShots.filter((s) => s.goal || s.outcome === "Goal").length;
    const onGoal = filteredShots.filter((s) => s.outcome === "OnGoal" || s.goal).length;
    const wide = filteredShots.filter((s) => s.outcome === "Wide").length;
    const blocked = filteredShots.filter((s) => s.outcome === "Blocked").length;
    const totalXg = filteredShots.reduce((sum, s) => sum + (s.xg || 0), 0);

    return {
      total,
      goals,
      onGoal,
      wide,
      blocked,
      onGoalPercent: total > 0 ? (onGoal / total) * 100 : 0,
      widePercent: total > 0 ? (wide / total) * 100 : 0,
      blockedPercent: total > 0 ? (blocked / total) * 100 : 0,
      totalXg,
    };
  }, [filteredShots]);

  // Get unique shot types
  const shotTypes = useMemo(() => {
    const types = new Set<string>();
    shots.forEach((s) => {
      if (s.shotType) types.add(s.shotType);
    });
    return Array.from(types);
  }, [shots]);

  if (shots.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-[#1a1f2e] bg-gradient-to-br from-[#0b1220] to-[#0f1620] shadow-xl">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-emerald-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-[12px] font-semibold text-white/80 mb-1">Δεν υπάρχουν δεδομένα σουτ</p>
          <p className="text-[10px] text-white/50">Προσθέστε events σουτ για να δείτε την ανάλυση</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="group relative overflow-hidden rounded-2xl border border-[#1a1f2e] bg-gradient-to-br from-[#0b1220] via-[#0f1620] to-[#0b1220] p-6 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-emerald-500/20 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-0.5">Shot Analytics</h3>
                <p className="text-[11px] text-white/60 font-medium">Ανάλυση σουτ και xG</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-white/90 mb-2 flex items-center gap-2">
                <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Ημίχρονο
              </label>
              <select
                value={selectedHalf}
                onChange={(e) => setSelectedHalf(e.target.value as "all" | "1H" | "2H")}
                className="w-full rounded-xl border border-[#1a1f2e] bg-[#0b1220] px-4 py-2.5 text-[11px] font-medium text-white outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 hover:border-[#1f2535]"
              >
                <option value="all">Όλα</option>
                <option value="1H">1ο Ημίχρονο</option>
                <option value="2H">2ο Ημίχρονο</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-white/90 mb-2 flex items-center gap-2">
                <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Ομάδα
              </label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value as "all" | "home" | "away")}
                className="w-full rounded-xl border border-[#1a1f2e] bg-[#0b1220] px-4 py-2.5 text-[11px] font-medium text-white outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 hover:border-[#1f2535]"
              >
                <option value="all">Όλες</option>
                <option value="home">{homeTeamName}</option>
                <option value="away">{awayTeamName}</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-white/90 mb-2 flex items-center gap-2">
                <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Τύπος Σουτ
              </label>
              <select
                value={selectedShotType}
                onChange={(e) => setSelectedShotType(e.target.value)}
                className="w-full rounded-xl border border-[#1a1f2e] bg-[#0b1220] px-4 py-2.5 text-[11px] font-medium text-white outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 hover:border-[#1f2535]"
              >
                <option value="all">Όλοι</option>
                {shotTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="group relative overflow-hidden rounded-xl border border-[#1a1f2e] bg-gradient-to-br from-[#0b1220] to-[#0f1620] p-5 shadow-lg transition-all hover:border-emerald-500/30 hover:shadow-emerald-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-[10px] font-semibold text-white/80">Συνολικά Σουτ</p>
            </div>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-[#1a1f2e] bg-gradient-to-br from-[#0b1220] to-[#0f1620] p-5 shadow-lg transition-all hover:border-emerald-500/30 hover:shadow-emerald-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-[10px] font-semibold text-white/80">Στο Τέρμα %</p>
            </div>
            <p className="text-3xl font-bold text-emerald-400">{stats.onGoalPercent.toFixed(1)}%</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-[#1a1f2e] bg-gradient-to-br from-[#0b1220] to-[#0f1620] p-5 shadow-lg transition-all hover:border-red-500/30 hover:shadow-red-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-[10px] font-semibold text-white/80">Άστοχα %</p>
            </div>
            <p className="text-3xl font-bold text-red-400">{stats.widePercent.toFixed(1)}%</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-[#1a1f2e] bg-gradient-to-br from-[#0b1220] to-[#0f1620] p-5 shadow-lg transition-all hover:border-gray-500/30 hover:shadow-gray-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-gray-500/20 flex items-center justify-center">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <p className="text-[10px] font-semibold text-white/80">Κομμένα %</p>
            </div>
            <p className="text-3xl font-bold text-gray-400">{stats.blockedPercent.toFixed(1)}%</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-[#1a1f2e] bg-gradient-to-br from-[#0b1220] to-[#0f1620] p-5 shadow-lg transition-all hover:border-yellow-500/30 hover:shadow-yellow-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <svg className="h-4 w-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-[10px] font-semibold text-white/80">Γκολ</p>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{stats.goals}</p>
          </div>
        </div>
      </div>

      {/* Main Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shot Heatmap */}
        <div className="group relative overflow-hidden rounded-2xl border border-[#1a1f2e] bg-gradient-to-br from-[#0b1220] via-[#0f1620] to-[#0b1220] p-6 shadow-xl transition-all hover:border-emerald-500/30 hover:shadow-emerald-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <h4 className="text-[12px] font-bold text-white mb-5 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              Heatmap Γηπέδου
            </h4>
            <ShotHeatmap shots={filteredShots} homeTeamName={homeTeamName} awayTeamName={awayTeamName} />
          </div>
        </div>

        {/* Goal Placement */}
        <div className="group relative overflow-hidden rounded-2xl border border-[#1a1f2e] bg-gradient-to-br from-[#0b1220] via-[#0f1620] to-[#0b1220] p-6 shadow-xl transition-all hover:border-emerald-500/30 hover:shadow-emerald-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <h4 className="text-[12px] font-bold text-white mb-5 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Τοποθέτηση Σουτ στο Τέρμα
            </h4>
            <GoalPlacement shots={filteredShots.filter((s) => s.outcome === "OnGoal" || s.goal)} />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="group relative overflow-hidden rounded-2xl border border-[#1a1f2e] bg-gradient-to-br from-[#0b1220] via-[#0f1620] to-[#0b1220] p-6 shadow-xl transition-all hover:border-emerald-500/30 hover:shadow-emerald-500/10">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative">
          <h4 className="text-[12px] font-bold text-white mb-5 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
              <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Timeline Σουτ
          </h4>
          <ShotTimeline shots={filteredShots} />
        </div>
      </div>

      {/* Player Stats Table */}
      <div className="group relative overflow-hidden rounded-2xl border border-[#1a1f2e] bg-gradient-to-br from-[#0b1220] via-[#0f1620] to-[#0b1220] p-6 shadow-xl transition-all hover:border-emerald-500/30 hover:shadow-emerald-500/10">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative">
          <h4 className="text-[12px] font-bold text-white mb-5 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
              <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            Στατιστικά Παικτών
          </h4>
          <PlayerStatsTable shots={filteredShots} />
        </div>
      </div>
    </div>
  );
}

