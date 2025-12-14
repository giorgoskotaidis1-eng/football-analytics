"use client";

import React, { useMemo, useState } from "react";
import { PitchHeatmap } from "./analytics/PitchHeatmap";
import { Legend } from "./analytics/Legend";

interface Event {
  id: number;
  type: string;
  team: string;
  x: number | null;
  y: number | null;
  playerId?: number | null;
  player?: { id: number; name: string } | null;
  minute?: number | null;
}

interface ActivityFieldProps {
  events: Event[];
  team: "home" | "away";
  teamName: string;
  homeTeamId?: number | null;
  awayTeamId?: number | null;
}

type EventPoint = {
  x: number;
  y: number;
  teamId?: string;
  playerId?: string;
  type?: string;
  subType?: string;
  tSec?: number;
};

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-[#1a1f2e] bg-[#0b1220] p-3 shadow-lg">
      <p className="text-[10px] text-white/70 mb-1">{label}</p>
      <p className="text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

export function ActivityField({
  events,
  team,
  teamName,
  homeTeamId,
  awayTeamId,
}: ActivityFieldProps) {
  const [selectedTeam, setSelectedTeam] = useState<"home" | "away" | "both">("both");
  const [eventType, setEventType] = useState<string>("all");
  const [playerId, setPlayerId] = useState<string>("all");
  const [useSqrtScale, setUseSqrtScale] = useState(true);

  // Get unique event types and players for filters
  const eventTypes = useMemo(() => {
    const types = new Set<string>();
    events.forEach((e) => {
      if (e.type) types.add(e.type);
    });
    return Array.from(types).sort();
  }, [events]);

  const players = useMemo(() => {
    const playerMap = new Map<number, string>();
    events.forEach((e) => {
      if (e.playerId && e.player?.name) {
        playerMap.set(e.playerId, e.player.name);
      }
    });
    return Array.from(playerMap.entries()).map(([id, name]) => ({ id, name }));
  }, [events]);

  // Filter events
  const filtered = useMemo(() => {
    return events.filter((e) => {
      // Team filter
      if (selectedTeam === "home" && e.team !== "home") return false;
      if (selectedTeam === "away" && e.team !== "away") return false;
      // Event type filter
      if (eventType !== "all" && e.type !== eventType) return false;
      // Player filter
      if (playerId !== "all" && e.playerId?.toString() !== playerId) return false;
      // Valid coords
      if (e.x === null || e.y === null || isNaN(Number(e.x)) || isNaN(Number(e.y))) return false;
      return true;
    });
  }, [events, selectedTeam, eventType, playerId]);

  // Convert to EventPoint format and normalize coords to 0-1
  const homeEvents: EventPoint[] = useMemo(() => {
    return filtered
      .filter((e) => e.team === "home")
      .map((e) => ({
        x: Math.max(0, Math.min(1, Number(e.x) / 100)),
        y: Math.max(0, Math.min(1, Number(e.y) / 100)),
        teamId: homeTeamId?.toString(),
        playerId: e.playerId?.toString(),
        type: e.type,
        tSec: e.minute ? e.minute * 60 : undefined,
      }));
  }, [filtered, homeTeamId]);

  const awayEvents: EventPoint[] = useMemo(() => {
    return filtered
      .filter((e) => e.team === "away")
      .map((e) => ({
        x: Math.max(0, Math.min(1, Number(e.x) / 100)),
        y: Math.max(0, Math.min(1, Number(e.y) / 100)),
        teamId: awayTeamId?.toString(),
        playerId: e.playerId?.toString(),
        type: e.type,
        tSec: e.minute ? e.minute * 60 : undefined,
      }));
  }, [filtered, awayTeamId]);

  // Calculate KPIs
  const calculateKPIs = (eventPoints: EventPoint[]) => {
    const cols = 12;
    const rows = 8;
    const cells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));

    for (const ev of eventPoints) {
      const c = Math.min(cols - 1, Math.max(0, Math.floor(ev.x * cols)));
      const r = Math.min(rows - 1, Math.max(0, Math.floor(ev.y * rows)));
      cells[r][c] += 1;
    }

    const flatCells = cells.flat();
    const maxCount = Math.max(...flatCells, 0);
    const activeZones = flatCells.filter((cnt) => cnt > 0).length;
    const totalEvents = eventPoints.length;
    const avgPerZone = activeZones > 0 ? (totalEvents / activeZones).toFixed(1) : "0.0";

    return { totalEvents, activeZones, peakCount: maxCount, avgPerZone };
  };

  const homeKPIs = useMemo(() => calculateKPIs(homeEvents), [homeEvents]);
  const awayKPIs = useMemo(() => calculateKPIs(awayEvents), [awayEvents]);
  const bothKPIs = useMemo(() => calculateKPIs([...homeEvents, ...awayEvents]), [homeEvents, awayEvents]);

  const displayKPIs = selectedTeam === "home" ? homeKPIs : selectedTeam === "away" ? awayKPIs : bothKPIs;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-xl border border-[#1a1f2e] bg-[#0b1220] p-4 shadow-lg">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Team Filter */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-white/70">Team:</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value as "home" | "away" | "both")}
              className="px-3 py-1.5 rounded-lg bg-[#111d2a] border border-[rgba(255,255,255,0.08)] text-[11px] text-white/90 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            >
              <option value="both">Both</option>
              <option value="home">Home</option>
              <option value="away">Away</option>
            </select>
          </div>

          {/* Event Type Filter */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-white/70">Event Type:</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#111d2a] border border-[rgba(255,255,255,0.08)] text-[11px] text-white/90 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            >
              <option value="all">All</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Player Filter */}
          {players.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-white/70">Player:</label>
              <select
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[#111d2a] border border-[rgba(255,255,255,0.08)] text-[11px] text-white/90 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              >
                <option value="all">All</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id.toString()}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sqrt Scale Toggle */}
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-[11px] text-white/70">Sqrt Scale:</label>
            <button
              onClick={() => setUseSqrtScale(!useSqrtScale)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                useSqrtScale
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-[#111d2a] text-white/70 border border-[rgba(255,255,255,0.08)]"
              }`}
            >
              {useSqrtScale ? "On" : "Off"}
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center">
          <Legend />
        </div>
      </div>

      {/* Heatmaps - Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Home Team */}
        <div className="rounded-xl border border-[#1a1f2e] bg-[#0b1220] p-4 shadow-lg">
          <p className="mb-3 text-[11px] font-semibold text-white/90">
            {teamName.includes("Home") ? teamName : "Home"} - Zone Activity
          </p>
          {homeEvents.length > 0 ? (
            <PitchHeatmap
              events={homeEvents}
              cols={12}
              rows={8}
              showCounts={true}
              useSqrtScale={useSqrtScale}
            />
          ) : (
            <div className="flex h-[520px] items-center justify-center text-[11px] text-white/50">
              Δεν υπάρχουν events για την ομάδα γηπέδου
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className="rounded-xl border border-[#1a1f2e] bg-[#0b1220] p-4 shadow-lg">
          <p className="mb-3 text-[11px] font-semibold text-white/90">
            {teamName.includes("Away") ? teamName : "Away"} - Zone Activity
          </p>
          {awayEvents.length > 0 ? (
            <PitchHeatmap
              events={awayEvents}
              cols={12}
              rows={8}
              showCounts={true}
              useSqrtScale={useSqrtScale}
            />
          ) : (
            <div className="flex h-[520px] items-center justify-center text-[11px] text-white/50">
              Δεν υπάρχουν events για την ομάδα φιλοξενούμενη
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-4">
        <Kpi label="Συνολικά events" value={displayKPIs.totalEvents} />
        <Kpi label="Ενεργές ζώνες" value={displayKPIs.activeZones} />
        <Kpi label="Peak count" value={displayKPIs.peakCount} />
        <Kpi label="Μέσος όρος/ζώνη" value={displayKPIs.avgPerZone} />
      </div>
    </div>
  );
}
