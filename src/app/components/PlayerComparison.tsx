"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "@/lib/i18n";

interface Player {
  id: number;
  name: string;
  position: string | null;
  number: number | null;
  teamId: number | null;
}

interface PlayerMetrics {
  playerId: number;
  playerName: string;
  position: string;
  minutesPlayed: number;
  // Key metrics
  xg: number;
  xa: number;
  progressivePasses: number;
  passesToFinalThird: number;
  carries: number;
  pressures: number;
  duels: number;
  // Per 90 normalized
  xgPer90: number;
  xaPer90: number;
  progressivePassesPer90: number;
  passesToFinalThirdPer90: number;
  carriesPer90: number;
  pressuresPer90: number;
  duelsPer90: number;
  // Percentiles (position-adjusted)
  xgPercentile: number;
  xaPercentile: number;
  progressivePassesPercentile: number;
  passesToFinalThirdPercentile: number;
  carriesPercentile: number;
  pressuresPercentile: number;
  duelsPercentile: number;
}

interface PlayerComparisonProps {
  matchId: number;
  players: Player[];
  events: Array<{
    id: number;
    type: string;
    team: string;
    playerId: number | null;
    player: { id: number; name: string } | null;
    x: number | null;
    y: number | null;
    minute: number | null;
    xg: number | null;
    metadata: string | null;
  }>;
  analytics?: {
    xa?: { home: number; away: number };
    progressivePasses?: { home: number; away: number };
  };
}

// Position buckets for percentile calculation
const POSITION_BUCKETS: Record<string, string> = {
  GK: "GK",
  "Goalkeeper": "GK",
  DF: "DF",
  "Defender": "DF",
  "Centre-Back": "DF",
  "Left-Back": "DF",
  "Right-Back": "DF",
  "Wing-Back": "DF",
  MF: "MF",
  "Midfielder": "MF",
  "Central Midfielder": "MF",
  "Defensive Midfielder": "MF",
  "Attacking Midfielder": "MF",
  "Left Midfielder": "MF",
  "Right Midfielder": "MF",
  "Winger": "MF",
  FW: "FW",
  "Forward": "FW",
  "Striker": "FW",
  "Centre-Forward": "FW",
  "Second Striker": "FW",
};

function getPositionBucket(position: string | null): string {
  if (!position) return "MF"; // Default to midfielder
  const normalized = position.trim();
  return POSITION_BUCKETS[normalized] || "MF";
}

function calculatePercentile(value: number, allValues: number[]): number {
  if (allValues.length === 0 || isNaN(value) || !isFinite(value)) return 0;
  const sorted = [...allValues].sort((a, b) => a - b);
  const index = sorted.findIndex((v) => v >= value);
  if (index === -1) return 100;
  return Math.round((index / sorted.length) * 100);
}

export function PlayerComparison({ matchId, players, events, analytics }: PlayerComparisonProps) {
  const { t } = useTranslation();
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [filterCompetition, setFilterCompetition] = useState<string>("all");

  // Calculate player metrics from events
  const playerMetrics = useMemo(() => {
    const metricsMap = new Map<number, Partial<PlayerMetrics>>();

    // Initialize all players
    players.forEach((player) => {
      metricsMap.set(player.id, {
        playerId: player.id,
        playerName: player.name,
        position: player.position || "Unknown",
        minutesPlayed: 90, // Default to full match
        xg: 0,
        xa: 0,
        progressivePasses: 0,
        passesToFinalThird: 0,
        carries: 0,
        pressures: 0,
        duels: 0,
      });
    });

    // Process events
    events.forEach((event) => {
      if (!event.playerId) return;
      const playerId = event.playerId;
      const metrics = metricsMap.get(playerId);
      if (!metrics) return;

      const x = event.x !== null && !isNaN(Number(event.x)) ? Number(event.x) : null;
      const y = event.y !== null && !isNaN(Number(event.y)) ? Number(event.y) : null;

      if (event.type === "shot") {
        const xg = event.xg !== null && !isNaN(Number(event.xg)) ? Number(event.xg) : 0;
        metrics.xg = (metrics.xg || 0) + xg;
      } else if (event.type === "pass") {
        // Progressive passes and passes to final third will be calculated from analytics
        // For now, count all passes
        if (y !== null && y < 33.3) {
          // Pass to final third (y < 33.3 for home team attacking)
          metrics.passesToFinalThird = (metrics.passesToFinalThird || 0) + 1;
        }
      } else if (event.type === "touch") {
        metrics.carries = (metrics.carries || 0) + 1;
      } else if (event.type === "tackle" || event.type === "interception") {
        metrics.pressures = (metrics.pressures || 0) + 1;
      } else if (event.type === "duel") {
        metrics.duels = (metrics.duels || 0) + 1;
      }
    });

    // Calculate per 90 metrics
    const allMetrics: PlayerMetrics[] = [];
    metricsMap.forEach((metrics) => {
      const minutes = metrics.minutesPlayed || 90;
      const per90Factor = minutes > 0 ? 90 / minutes : 1;

      const fullMetrics: PlayerMetrics = {
        ...metrics,
        minutesPlayed: minutes,
        xg: metrics.xg || 0,
        xa: metrics.xa || 0,
        progressivePasses: metrics.progressivePasses || 0,
        passesToFinalThird: metrics.passesToFinalThird || 0,
        carries: metrics.carries || 0,
        pressures: metrics.pressures || 0,
        duels: metrics.duels || 0,
        xgPer90: (metrics.xg || 0) * per90Factor,
        xaPer90: (metrics.xa || 0) * per90Factor,
        progressivePassesPer90: (metrics.progressivePasses || 0) * per90Factor,
        passesToFinalThirdPer90: (metrics.passesToFinalThird || 0) * per90Factor,
        carriesPer90: (metrics.carries || 0) * per90Factor,
        pressuresPer90: (metrics.pressures || 0) * per90Factor,
        duelsPer90: (metrics.duels || 0) * per90Factor,
        xgPercentile: 0,
        xaPercentile: 0,
        progressivePassesPercentile: 0,
        passesToFinalThirdPercentile: 0,
        carriesPercentile: 0,
        pressuresPercentile: 0,
        duelsPercentile: 0,
      };

      allMetrics.push(fullMetrics);
    });

    // Calculate percentiles by position bucket
    const metricsByPosition = new Map<string, PlayerMetrics[]>();
    allMetrics.forEach((m) => {
      const bucket = getPositionBucket(m.position);
      if (!metricsByPosition.has(bucket)) {
        metricsByPosition.set(bucket, []);
      }
      metricsByPosition.get(bucket)!.push(m);
    });

    // Calculate percentiles for each position bucket
    metricsByPosition.forEach((positionMetrics) => {
      const xgValues = positionMetrics.map((m) => m.xgPer90);
      const xaValues = positionMetrics.map((m) => m.xaPer90);
      const progPassValues = positionMetrics.map((m) => m.progressivePassesPer90);
      const finalThirdValues = positionMetrics.map((m) => m.passesToFinalThirdPer90);
      const carriesValues = positionMetrics.map((m) => m.carriesPer90);
      const pressuresValues = positionMetrics.map((m) => m.pressuresPer90);
      const duelsValues = positionMetrics.map((m) => m.duelsPer90);

      positionMetrics.forEach((m) => {
        m.xgPercentile = calculatePercentile(m.xgPer90, xgValues);
        m.xaPercentile = calculatePercentile(m.xaPer90, xaValues);
        m.progressivePassesPercentile = calculatePercentile(m.progressivePassesPer90, progPassValues);
        m.passesToFinalThirdPercentile = calculatePercentile(m.passesToFinalThirdPer90, finalThirdValues);
        m.carriesPercentile = calculatePercentile(m.carriesPer90, carriesValues);
        m.pressuresPercentile = calculatePercentile(m.pressuresPer90, pressuresValues);
        m.duelsPercentile = calculatePercentile(m.duelsPer90, duelsValues);
      });
    });

    return allMetrics;
  }, [players, events]);

  const displayedMetrics = useMemo(() => {
    if (selectedPlayers.length === 0) return [];
    return playerMetrics.filter((m) => selectedPlayers.includes(m.playerId));
  }, [playerMetrics, selectedPlayers]);

  if (playerMetrics.length === 0) {
    return (
      <div className="rounded-xl border border-[#1a1f2e] bg-[#0b1220] p-4 shadow-lg text-center text-white/50 text-sm">
        Δεν υπάρχουν δεδομένα
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-[10px] text-white/70">{t("selectPlayers") || "Select Players"}</label>
          <select
            multiple
            value={selectedPlayers.map(String)}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, (opt) => Number(opt.value));
              setSelectedPlayers(values);
            }}
            className="h-24 w-full rounded-md border border-[#1a1f2e] bg-[#0b1220] px-2 text-[11px] text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            size={5}
          >
            {playerMetrics.map((m) => (
              <option key={m.playerId} value={m.playerId}>
                {m.playerName} ({m.position})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-white/70">{t("period") || "Period"}</label>
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="h-8 w-full rounded-md border border-[#1a1f2e] bg-[#0b1220] px-2 text-[11px] text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
          >
            <option value="all">{t("all") || "All"}</option>
            <option value="firstHalf">{t("firstHalf") || "First Half"}</option>
            <option value="secondHalf">{t("secondHalf") || "Second Half"}</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-white/70">{t("competition") || "Competition"}</label>
          <select
            value={filterCompetition}
            onChange={(e) => setFilterCompetition(e.target.value)}
            className="h-8 w-full rounded-md border border-[#1a1f2e] bg-[#0b1220] px-2 text-[11px] text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
          >
            <option value="all">{t("all") || "All"}</option>
          </select>
        </div>
      </div>

      {/* Comparison Table */}
      {displayedMetrics.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-[#1a1f2e] bg-[#0b1220] shadow-lg">
          <table className="w-full border-collapse text-[10px] text-white/80">
            <thead className="bg-[#1a1f2e] text-white/90">
              <tr>
                <th className="px-3 py-2 text-left font-medium">{t("player") || "Player"}</th>
                <th className="px-3 py-2 text-center font-medium">xG</th>
                <th className="px-3 py-2 text-center font-medium">xA</th>
                <th className="px-3 py-2 text-center font-medium">{t("progressivePasses") || "Prog. Passes"}</th>
                <th className="px-3 py-2 text-center font-medium">{t("passesToFinalThird") || "Final 3rd"}</th>
                <th className="px-3 py-2 text-center font-medium">{t("carries") || "Carries"}</th>
                <th className="px-3 py-2 text-center font-medium">{t("pressures") || "Pressures"}</th>
                <th className="px-3 py-2 text-center font-medium">{t("duels") || "Duels"}</th>
              </tr>
            </thead>
            <tbody>
              {displayedMetrics.map((m) => (
                <tr key={m.playerId} className="border-t border-[#1a1f2e] hover:bg-[#1a1f2e]/50">
                  <td className="px-3 py-2">
                    <div>
                      <div className="font-medium text-white">{m.playerName}</div>
                      <div className="text-[9px] text-white/60">{m.position}</div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="text-white">{m.xgPer90.toFixed(2)}</div>
                    <div className="text-[9px] text-white/50">{m.xgPercentile}%</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="text-white">{m.xaPer90.toFixed(2)}</div>
                    <div className="text-[9px] text-white/50">{m.xaPercentile}%</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="text-white">{m.progressivePassesPer90.toFixed(1)}</div>
                    <div className="text-[9px] text-white/50">{m.progressivePassesPercentile}%</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="text-white">{m.passesToFinalThirdPer90.toFixed(1)}</div>
                    <div className="text-[9px] text-white/50">{m.passesToFinalThirdPercentile}%</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="text-white">{m.carriesPer90.toFixed(1)}</div>
                    <div className="text-[9px] text-white/50">{m.carriesPercentile}%</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="text-white">{m.pressuresPer90.toFixed(1)}</div>
                    <div className="text-[9px] text-white/50">{m.pressuresPercentile}%</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="text-white">{m.duelsPer90.toFixed(1)}</div>
                    <div className="text-[9px] text-white/50">{m.duelsPercentile}%</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-[#1a1f2e] bg-[#0b1220] p-4 shadow-lg text-center text-white/50 text-sm">
          {t("selectPlayersToCompare") || "Select players to compare"}
        </div>
      )}
    </div>
  );
}



import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "@/lib/i18n";

interface Player {
  id: number;
  name: string;
  position: string | null;
  number: number | null;
  teamId: number | null;
}

interface PlayerMetrics {
  playerId: number;
  playerName: string;
  position: string;
  minutesPlayed: number;
  // Key metrics
  xg: number;
  xa: number;
  progressivePasses: number;
  passesToFinalThird: number;
  carries: number;
  pressures: number;
  duels: number;
  // Per 90 normalized
  xgPer90: number;
  xaPer90: number;
  progressivePassesPer90: number;
  passesToFinalThirdPer90: number;
  carriesPer90: number;
  pressuresPer90: number;
  duelsPer90: number;
  // Percentiles (position-adjusted)
  xgPercentile: number;
  xaPercentile: number;
  progressivePassesPercentile: number;
  passesToFinalThirdPercentile: number;
  carriesPercentile: number;
  pressuresPercentile: number;
  duelsPercentile: number;
}

interface PlayerComparisonProps {
  matchId: number;
  players: Player[];
  events: Array<{
    id: number;
    type: string;
    team: string;
    playerId: number | null;
    player: { id: number; name: string } | null;
    x: number | null;
    y: number | null;
    minute: number | null;
    xg: number | null;
    metadata: string | null;
  }>;
  analytics?: {
    xa?: { home: number; away: number };
    progressivePasses?: { home: number; away: number };
  };
}

// Position buckets for percentile calculation
const POSITION_BUCKETS: Record<string, string> = {
  GK: "GK",
  "Goalkeeper": "GK",
  DF: "DF",
  "Defender": "DF",
  "Centre-Back": "DF",
  "Left-Back": "DF",
  "Right-Back": "DF",
  "Wing-Back": "DF",
  MF: "MF",
  "Midfielder": "MF",
  "Central Midfielder": "MF",
  "Defensive Midfielder": "MF",
  "Attacking Midfielder": "MF",
  "Left Midfielder": "MF",
  "Right Midfielder": "MF",
  "Winger": "MF",
  FW: "FW",
  "Forward": "FW",
  "Striker": "FW",
  "Centre-Forward": "FW",
  "Second Striker": "FW",
};

function getPositionBucket(position: string | null): string {
  if (!position) return "MF"; // Default to midfielder
  const normalized = position.trim();
  return POSITION_BUCKETS[normalized] || "MF";
}

function calculatePercentile(value: number, allValues: number[]): number {
  if (allValues.length === 0 || isNaN(value) || !isFinite(value)) return 0;
  const sorted = [...allValues].sort((a, b) => a - b);
  const index = sorted.findIndex((v) => v >= value);
  if (index === -1) return 100;
  return Math.round((index / sorted.length) * 100);
}

export function PlayerComparison({ matchId, players, events, analytics }: PlayerComparisonProps) {
  const { t } = useTranslation();
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [filterCompetition, setFilterCompetition] = useState<string>("all");

  // Calculate player metrics from events
  const playerMetrics = useMemo(() => {
    const metricsMap = new Map<number, Partial<PlayerMetrics>>();

    // Initialize all players
    players.forEach((player) => {
      metricsMap.set(player.id, {
        playerId: player.id,
        playerName: player.name,
        position: player.position || "Unknown",
        minutesPlayed: 90, // Default to full match
        xg: 0,
        xa: 0,
        progressivePasses: 0,
        passesToFinalThird: 0,
        carries: 0,
        pressures: 0,
        duels: 0,
      });
    });

    // Process events
    events.forEach((event) => {
      if (!event.playerId) return;
      const playerId = event.playerId;
      const metrics = metricsMap.get(playerId);
      if (!metrics) return;

      const x = event.x !== null && !isNaN(Number(event.x)) ? Number(event.x) : null;
      const y = event.y !== null && !isNaN(Number(event.y)) ? Number(event.y) : null;

      if (event.type === "shot") {
        const xg = event.xg !== null && !isNaN(Number(event.xg)) ? Number(event.xg) : 0;
        metrics.xg = (metrics.xg || 0) + xg;
      } else if (event.type === "pass") {
        // Progressive passes and passes to final third will be calculated from analytics
        // For now, count all passes
        if (y !== null && y < 33.3) {
          // Pass to final third (y < 33.3 for home team attacking)
          metrics.passesToFinalThird = (metrics.passesToFinalThird || 0) + 1;
        }
      } else if (event.type === "touch") {
        metrics.carries = (metrics.carries || 0) + 1;
      } else if (event.type === "tackle" || event.type === "interception") {
        metrics.pressures = (metrics.pressures || 0) + 1;
      } else if (event.type === "duel") {
        metrics.duels = (metrics.duels || 0) + 1;
      }
    });

    // Calculate per 90 metrics
    const allMetrics: PlayerMetrics[] = [];
    metricsMap.forEach((metrics) => {
      const minutes = metrics.minutesPlayed || 90;
      const per90Factor = minutes > 0 ? 90 / minutes : 1;

      const fullMetrics: PlayerMetrics = {
        ...metrics,
        minutesPlayed: minutes,
        xg: metrics.xg || 0,
        xa: metrics.xa || 0,
        progressivePasses: metrics.progressivePasses || 0,
        passesToFinalThird: metrics.passesToFinalThird || 0,
        carries: metrics.carries || 0,
        pressures: metrics.pressures || 0,
        duels: metrics.duels || 0,
        xgPer90: (metrics.xg || 0) * per90Factor,
        xaPer90: (metrics.xa || 0) * per90Factor,
        progressivePassesPer90: (metrics.progressivePasses || 0) * per90Factor,
        passesToFinalThirdPer90: (metrics.passesToFinalThird || 0) * per90Factor,
        carriesPer90: (metrics.carries || 0) * per90Factor,
        pressuresPer90: (metrics.pressures || 0) * per90Factor,
        duelsPer90: (metrics.duels || 0) * per90Factor,
        xgPercentile: 0,
        xaPercentile: 0,
        progressivePassesPercentile: 0,
        passesToFinalThirdPercentile: 0,
        carriesPercentile: 0,
        pressuresPercentile: 0,
        duelsPercentile: 0,
      };

      allMetrics.push(fullMetrics);
    });

    // Calculate percentiles by position bucket
    const metricsByPosition = new Map<string, PlayerMetrics[]>();
    allMetrics.forEach((m) => {
      const bucket = getPositionBucket(m.position);
      if (!metricsByPosition.has(bucket)) {
        metricsByPosition.set(bucket, []);
      }
      metricsByPosition.get(bucket)!.push(m);
    });

    // Calculate percentiles for each position bucket
    metricsByPosition.forEach((positionMetrics) => {
      const xgValues = positionMetrics.map((m) => m.xgPer90);
      const xaValues = positionMetrics.map((m) => m.xaPer90);
      const progPassValues = positionMetrics.map((m) => m.progressivePassesPer90);
      const finalThirdValues = positionMetrics.map((m) => m.passesToFinalThirdPer90);
      const carriesValues = positionMetrics.map((m) => m.carriesPer90);
      const pressuresValues = positionMetrics.map((m) => m.pressuresPer90);
      const duelsValues = positionMetrics.map((m) => m.duelsPer90);

      positionMetrics.forEach((m) => {
        m.xgPercentile = calculatePercentile(m.xgPer90, xgValues);
        m.xaPercentile = calculatePercentile(m.xaPer90, xaValues);
        m.progressivePassesPercentile = calculatePercentile(m.progressivePassesPer90, progPassValues);
        m.passesToFinalThirdPercentile = calculatePercentile(m.passesToFinalThirdPer90, finalThirdValues);
        m.carriesPercentile = calculatePercentile(m.carriesPer90, carriesValues);
        m.pressuresPercentile = calculatePercentile(m.pressuresPer90, pressuresValues);
        m.duelsPercentile = calculatePercentile(m.duelsPer90, duelsValues);
      });
    });

    return allMetrics;
  }, [players, events]);

  const displayedMetrics = useMemo(() => {
    if (selectedPlayers.length === 0) return [];
    return playerMetrics.filter((m) => selectedPlayers.includes(m.playerId));
  }, [playerMetrics, selectedPlayers]);

  if (playerMetrics.length === 0) {
    return (
      <div className="rounded-xl border border-[#1a1f2e] bg-[#0b1220] p-4 shadow-lg text-center text-white/50 text-sm">
        Δεν υπάρχουν δεδομένα
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-[10px] text-white/70">{t("selectPlayers") || "Select Players"}</label>
          <select
            multiple
            value={selectedPlayers.map(String)}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, (opt) => Number(opt.value));
              setSelectedPlayers(values);
            }}
            className="h-24 w-full rounded-md border border-[#1a1f2e] bg-[#0b1220] px-2 text-[11px] text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            size={5}
          >
            {playerMetrics.map((m) => (
              <option key={m.playerId} value={m.playerId}>
                {m.playerName} ({m.position})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-white/70">{t("period") || "Period"}</label>
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="h-8 w-full rounded-md border border-[#1a1f2e] bg-[#0b1220] px-2 text-[11px] text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
          >
            <option value="all">{t("all") || "All"}</option>
            <option value="firstHalf">{t("firstHalf") || "First Half"}</option>
            <option value="secondHalf">{t("secondHalf") || "Second Half"}</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-white/70">{t("competition") || "Competition"}</label>
          <select
            value={filterCompetition}
            onChange={(e) => setFilterCompetition(e.target.value)}
            className="h-8 w-full rounded-md border border-[#1a1f2e] bg-[#0b1220] px-2 text-[11px] text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
          >
            <option value="all">{t("all") || "All"}</option>
          </select>
        </div>
      </div>

      {/* Comparison Table */}
      {displayedMetrics.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-[#1a1f2e] bg-[#0b1220] shadow-lg">
          <table className="w-full border-collapse text-[10px] text-white/80">
            <thead className="bg-[#1a1f2e] text-white/90">
              <tr>
                <th className="px-3 py-2 text-left font-medium">{t("player") || "Player"}</th>
                <th className="px-3 py-2 text-center font-medium">xG</th>
                <th className="px-3 py-2 text-center font-medium">xA</th>
                <th className="px-3 py-2 text-center font-medium">{t("progressivePasses") || "Prog. Passes"}</th>
                <th className="px-3 py-2 text-center font-medium">{t("passesToFinalThird") || "Final 3rd"}</th>
                <th className="px-3 py-2 text-center font-medium">{t("carries") || "Carries"}</th>
                <th className="px-3 py-2 text-center font-medium">{t("pressures") || "Pressures"}</th>
                <th className="px-3 py-2 text-center font-medium">{t("duels") || "Duels"}</th>
              </tr>
            </thead>
            <tbody>
              {displayedMetrics.map((m) => (
                <tr key={m.playerId} className="border-t border-[#1a1f2e] hover:bg-[#1a1f2e]/50">
                  <td className="px-3 py-2">
                    <div>
                      <div className="font-medium text-white">{m.playerName}</div>
                      <div className="text-[9px] text-white/60">{m.position}</div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="text-white">{m.xgPer90.toFixed(2)}</div>
                    <div className="text-[9px] text-white/50">{m.xgPercentile}%</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="text-white">{m.xaPer90.toFixed(2)}</div>
                    <div className="text-[9px] text-white/50">{m.xaPercentile}%</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="text-white">{m.progressivePassesPer90.toFixed(1)}</div>
                    <div className="text-[9px] text-white/50">{m.progressivePassesPercentile}%</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="text-white">{m.passesToFinalThirdPer90.toFixed(1)}</div>
                    <div className="text-[9px] text-white/50">{m.passesToFinalThirdPercentile}%</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="text-white">{m.carriesPer90.toFixed(1)}</div>
                    <div className="text-[9px] text-white/50">{m.carriesPercentile}%</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="text-white">{m.pressuresPer90.toFixed(1)}</div>
                    <div className="text-[9px] text-white/50">{m.pressuresPercentile}%</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="text-white">{m.duelsPer90.toFixed(1)}</div>
                    <div className="text-[9px] text-white/50">{m.duelsPercentile}%</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-[#1a1f2e] bg-[#0b1220] p-4 shadow-lg text-center text-white/50 text-sm">
          {t("selectPlayersToCompare") || "Select players to compare"}
        </div>
      )}
    </div>
  );
}




