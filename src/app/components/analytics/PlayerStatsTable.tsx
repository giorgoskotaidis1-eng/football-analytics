"use client";

import { useMemo, useState } from "react";
import type { ShotEvent } from "./ShotAnalytics";

interface PlayerStatsTableProps {
  shots: ShotEvent[];
}

type SortKey = "player" | "shots" | "goals" | "xg" | "xgPerShot" | "onGoalPercent";
type SortDirection = "asc" | "desc";

export function PlayerStatsTable({ shots }: PlayerStatsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("xg");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Aggregate stats by player
  const playerStats = useMemo(() => {
    const statsMap = new Map<
      string,
      {
        playerId: string;
        playerName: string;
        shots: ShotEvent[];
        totalShots: number;
        goals: number;
        onGoal: number;
        wide: number;
        blocked: number;
        totalXg: number;
      }
    >();

    shots.forEach((shot) => {
      const existing = statsMap.get(shot.playerId) || {
        playerId: shot.playerId,
        playerName: shot.playerName,
        shots: [],
        totalShots: 0,
        goals: 0,
        onGoal: 0,
        wide: 0,
        blocked: 0,
        totalXg: 0,
      };

      existing.shots.push(shot);
      existing.totalShots++;
      if (shot.goal || shot.outcome === "Goal") existing.goals++;
      if (shot.outcome === "OnGoal" || shot.goal) existing.onGoal++;
      if (shot.outcome === "Wide") existing.wide++;
      if (shot.outcome === "Blocked") existing.blocked++;
      existing.totalXg += shot.xg || 0;

      statsMap.set(shot.playerId, existing);
    });

    return Array.from(statsMap.values());
  }, [shots]);

  // Sort players
  const sortedStats = useMemo(() => {
    const sorted = [...playerStats];
    sorted.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortKey) {
        case "player":
          aVal = a.playerName;
          bVal = b.playerName;
          break;
        case "shots":
          aVal = a.totalShots;
          bVal = b.totalShots;
          break;
        case "goals":
          aVal = a.goals;
          bVal = b.goals;
          break;
        case "xg":
          aVal = a.totalXg;
          bVal = b.totalXg;
          break;
        case "xgPerShot":
          aVal = a.totalShots > 0 ? a.totalXg / a.totalShots : 0;
          bVal = b.totalShots > 0 ? b.totalXg / b.totalShots : 0;
          break;
        case "onGoalPercent":
          aVal = a.totalShots > 0 ? (a.onGoal / a.totalShots) * 100 : 0;
          bVal = b.totalShots > 0 ? (b.onGoal / b.totalShots) * 100 : 0;
          break;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortDirection === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [playerStats, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return null;
    return (
      <span className="ml-1 text-emerald-400">
        {sortDirection === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  if (sortedStats.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-[11px] text-white/50">
        Δεν υπάρχουν δεδομένα παικτών
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#1a1f2e] bg-[#0b1220]">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-[#1a1f2e] bg-[#0f1620]">
            <th
              className="px-4 py-3 text-left font-bold text-white/90 cursor-pointer hover:text-emerald-400 transition-colors"
              onClick={() => handleSort("player")}
            >
              <div className="flex items-center gap-2">
                <span>Παίκτης</span>
                <SortIcon columnKey="player" />
              </div>
            </th>
            <th
              className="px-4 py-3 text-right font-bold text-white/90 cursor-pointer hover:text-emerald-400 transition-colors"
              onClick={() => handleSort("shots")}
            >
              <div className="flex items-center justify-end gap-2">
                <span>Σουτ</span>
                <SortIcon columnKey="shots" />
              </div>
            </th>
            <th
              className="px-4 py-3 text-right font-bold text-white/90 cursor-pointer hover:text-emerald-400 transition-colors"
              onClick={() => handleSort("goals")}
            >
              <div className="flex items-center justify-end gap-2">
                <span>Γκολ</span>
                <SortIcon columnKey="goals" />
              </div>
            </th>
            <th
              className="px-4 py-3 text-right font-bold text-white/90 cursor-pointer hover:text-emerald-400 transition-colors"
              onClick={() => handleSort("xg")}
            >
              <div className="flex items-center justify-end gap-2">
                <span>xG</span>
                <SortIcon columnKey="xg" />
              </div>
            </th>
            <th
              className="px-4 py-3 text-right font-bold text-white/90 cursor-pointer hover:text-emerald-400 transition-colors"
              onClick={() => handleSort("xgPerShot")}
            >
              <div className="flex items-center justify-end gap-2">
                <span>xG/Σουτ</span>
                <SortIcon columnKey="xgPerShot" />
              </div>
            </th>
            <th
              className="px-4 py-3 text-right font-bold text-white/90 cursor-pointer hover:text-emerald-400 transition-colors"
              onClick={() => handleSort("onGoalPercent")}
            >
              <div className="flex items-center justify-end gap-2">
                <span>Στο Τέρμα %</span>
                <SortIcon columnKey="onGoalPercent" />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedStats.map((player, idx) => {
            const xgPerShot = player.totalShots > 0 ? player.totalXg / player.totalShots : 0;
            const onGoalPercent = player.totalShots > 0 ? (player.onGoal / player.totalShots) * 100 : 0;

            return (
              <tr
                key={player.playerId}
                className={`border-b border-[#1a1f2e]/30 transition-all hover:bg-[#1a1f2e]/40 ${
                  idx % 2 === 0 ? "bg-[#0b1220]" : "bg-[#0f1620]/50"
                }`}
              >
                <td className="px-4 py-3 font-semibold text-white">{player.playerName}</td>
                <td className="px-4 py-3 text-right text-white/90 font-medium">{player.totalShots}</td>
                <td className="px-4 py-3 text-right text-yellow-400 font-bold">{player.goals}</td>
                <td className="px-4 py-3 text-right text-emerald-400 font-bold">
                  {player.totalXg.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-white/80 font-medium">{xgPerShot.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-white/80 font-medium">{onGoalPercent.toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

