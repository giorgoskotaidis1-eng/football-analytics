"use client";

import { useMemo, useState } from "react";

type MatchEventLite = {
  id: number;
  type: string;
  team: string;
  minute: number | null;
  xg: number | null;
  player?: { id: number; name: string } | null;
  metadata: string | null;
};

type PlayerLite = {
  id: number;
  name: string;
  position: string;
  number?: number | null;
  teamId?: number | null;
};

type SortKey =
  | "player"
  | "team"
  | "minutes"
  | "goals"
  | "assists"
  | "shots"
  | "shotsOnTarget"
  | "xg"
  | "averageXG"
  | "xA"
  | "passes"
  | "successfulPasses"
  | "passAccuracy"
  | "keyPasses"
  | "progressivePasses"
  | "passesIntoFinalThird"
  | "passesIntoPenaltyArea"
  | "longPasses"
  | "touches"
  | "tackles"
  | "interceptions"
  | "clearances"
  | "blocks"
  | "fouls"
  | "coachScore";

type SortDirection = "asc" | "desc";

interface PlayersAnalysisProps {
  events: MatchEventLite[];
  players: PlayerLite[];
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  homeTeamName: string;
  awayTeamName: string;
  starterPlayerIds?: number[];
  onJumpToVideoMinute?: (minute: number) => void;
  canJumpToVideo?: boolean;
}

function parseMetadata(metadata: string | null): Record<string, unknown> {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function isSuccessfulPass(metadata: string | null): boolean {
  const parsed = parseMetadata(metadata);
  const outcome = String(parsed.outcome || "").toLowerCase();
  return outcome === "successful" || outcome === "complete" || outcome === "completed";
}

export function PlayersAnalysis({
  events,
  players,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  starterPlayerIds = [],
  onJumpToVideoMinute,
  canJumpToVideo = true,
}: PlayersAnalysisProps) {
  const [sortKey, setSortKey] = useState<SortKey>("xg");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [teamFilter, setTeamFilter] = useState<"all" | "home" | "away">("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [minMinutesFilter, setMinMinutesFilter] = useState<number>(0);
  const [lineupFilter, setLineupFilter] = useState<"all" | "starters" | "subs">("all");
  const [momentsModal, setMomentsModal] = useState<{
    open: boolean;
    playerName: string;
    metricLabel: string;
    moments: Array<{ minute: number; label: string }>;
  }>({ open: false, playerName: "", metricLabel: "", moments: [] });
  const [showCoachScoreHelp, setShowCoachScoreHelp] = useState(false);

  const perPlayerStats = useMemo(() => {
    const byPlayer = new Map<
      number,
      {
        playerId: number;
        playerName: string;
        position: string;
        shirtNumber: number | null;
        teamName: string;
        minutes: number;
        goals: number;
        assists: number;
        shots: number;
        shotsOnTarget: number;
        xg: number;
        xA: number;
        passes: number;
        successfulPasses: number;
        keyPasses: number;
        progressivePasses: number;
        passesIntoFinalThird: number;
        passesIntoPenaltyArea: number;
        longPasses: number;
        touches: number;
        tackles: number;
        interceptions: number;
        clearances: number;
        blocks: number;
        fouls: number;
        totalActions: number;
        sampleQuality: "low" | "normal";
        teamSide: "home" | "away" | "unknown";
        moments: {
          goals: Array<{ minute: number; label: string }>;
          shots: Array<{ minute: number; label: string }>;
          shotsOnTarget: Array<{ minute: number; label: string }>;
          keyPasses: Array<{ minute: number; label: string }>;
          passes: Array<{ minute: number; label: string }>;
          successfulPasses: Array<{ minute: number; label: string }>;
          progressivePasses: Array<{ minute: number; label: string }>;
          passesIntoFinalThird: Array<{ minute: number; label: string }>;
          passesIntoPenaltyArea: Array<{ minute: number; label: string }>;
          longPasses: Array<{ minute: number; label: string }>;
          touches: Array<{ minute: number; label: string }>;
          tackles: Array<{ minute: number; label: string }>;
          interceptions: Array<{ minute: number; label: string }>;
          clearances: Array<{ minute: number; label: string }>;
          blocks: Array<{ minute: number; label: string }>;
          fouls: Array<{ minute: number; label: string }>;
          assists: Array<{ minute: number; label: string }>;
        };
      }
    >();

    const ensurePlayer = (playerId: number, fallbackName: string, team: string) => {
      const existing = byPlayer.get(playerId);
      if (existing) return existing;

      const known = players.find((p) => p.id === playerId);
      const derivedTeamFromRoster =
        known?.teamId && homeTeamId && known.teamId === homeTeamId
          ? "home"
          : known?.teamId && awayTeamId && known.teamId === awayTeamId
          ? "away"
          : team;
      const teamName =
        derivedTeamFromRoster === "home"
          ? homeTeamName
          : derivedTeamFromRoster === "away"
          ? awayTeamName
          : "Unknown";
      const created = {
        playerId,
        playerName: known?.name || fallbackName || `Player #${playerId}`,
        position: known?.position || "",
        shirtNumber: known?.number ?? null,
        teamName,
        minutes: 0,
        goals: 0,
        assists: 0,
        shots: 0,
        shotsOnTarget: 0,
        xg: 0,
        xA: 0,
        passes: 0,
        successfulPasses: 0,
        keyPasses: 0,
        progressivePasses: 0,
        passesIntoFinalThird: 0,
        passesIntoPenaltyArea: 0,
        longPasses: 0,
        touches: 0,
        tackles: 0,
        interceptions: 0,
        clearances: 0,
        blocks: 0,
        fouls: 0,
        teamSide: (derivedTeamFromRoster === "home" || derivedTeamFromRoster === "away" ? derivedTeamFromRoster : "unknown") as "home" | "away" | "unknown",
        totalActions: 0,
        sampleQuality: "low" as "low" | "normal",
        moments: {
          goals: [],
          shots: [],
          shotsOnTarget: [],
          keyPasses: [],
          passes: [],
          successfulPasses: [],
          progressivePasses: [],
          passesIntoFinalThird: [],
          passesIntoPenaltyArea: [],
          longPasses: [],
          touches: [],
          tackles: [],
          interceptions: [],
          clearances: [],
          blocks: [],
          fouls: [],
          assists: [],
        },
      };
      byPlayer.set(playerId, created);
      return created;
    };

    for (const e of events) {
      const playerId = e.player?.id;
      if (!playerId) continue;
      const stat = ensurePlayer(playerId, e.player?.name || "", e.team);
      if (e.minute !== null) {
        stat.minutes = Math.max(stat.minutes, e.minute);
      }

      switch (e.type) {
        case "shot": {
          stat.shots += 1;
          stat.xg += Number(e.xg || 0);
          stat.moments.shots.push({
            minute: e.minute ?? 0,
            label: `Shot (${e.minute ?? 0}')`,
          });
          const outcome = String(parseMetadata(e.metadata).outcome || "").toLowerCase();
          if (outcome === "goal") stat.goals += 1;
          if (outcome === "goal") {
            stat.moments.goals.push({
              minute: e.minute ?? 0,
              label: `Goal (${e.minute ?? 0}')`,
            });
          }
          if (outcome === "goal" || outcome === "saved" || outcome === "ongoal") {
            stat.shotsOnTarget += 1;
            stat.moments.shotsOnTarget.push({
              minute: e.minute ?? 0,
              label: `Shot on target (${e.minute ?? 0}')`,
            });
          }
          break;
        }
        case "pass": {
          stat.passes += 1;
          stat.moments.passes.push({
            minute: e.minute ?? 0,
            label: `Pass (${e.minute ?? 0}')`,
          });
          const successful = isSuccessfulPass(e.metadata);
          if (successful) {
            stat.successfulPasses += 1;
            stat.moments.successfulPasses.push({
              minute: e.minute ?? 0,
              label: `Successful pass (${e.minute ?? 0}')`,
            });
          }
          const parsed = parseMetadata(e.metadata);
          const isKey = Boolean(parsed.keyPass) || String(parsed.passType || "").toLowerCase() === "key";
          if (isKey) {
            stat.keyPasses += 1;
            stat.moments.keyPasses.push({
              minute: e.minute ?? 0,
              label: `Key pass (${e.minute ?? 0}')`,
            });
          }

          const progressive =
            Boolean(parsed.progressive) ||
            String(parsed.passType || "").toLowerCase().includes("progressive");
          if (progressive) {
            stat.progressivePasses += 1;
            stat.moments.progressivePasses.push({
              minute: e.minute ?? 0,
              label: `Progressive pass (${e.minute ?? 0}')`,
            });
          }
          const y = Number((parsed.endY ?? parsed.y ?? null) as number | null);
          if (successful && !Number.isNaN(y)) {
            if (y < 33.33) {
              stat.passesIntoFinalThird += 1;
              stat.moments.passesIntoFinalThird.push({
                minute: e.minute ?? 0,
                label: `Pass into final third (${e.minute ?? 0}')`,
              });
            }
            if (y < 15.7) {
              stat.passesIntoPenaltyArea += 1;
              stat.moments.passesIntoPenaltyArea.push({
                minute: e.minute ?? 0,
                label: `Pass into penalty area (${e.minute ?? 0}')`,
              });
            }
          }
          const x = Number((parsed.endX ?? null) as number | null);
          const startX = Number((parsed.startX ?? null) as number | null);
          const startY = Number((parsed.startY ?? null) as number | null);
          if (successful && !Number.isNaN(x) && !Number.isNaN(y) && !Number.isNaN(startX) && !Number.isNaN(startY)) {
            const distance = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
            if (distance > 30) {
              stat.longPasses += 1;
              stat.moments.longPasses.push({
                minute: e.minute ?? 0,
                label: `Long pass (${e.minute ?? 0}')`,
              });
            }
          }
          break;
        }
        case "touch":
          stat.touches += 1;
          stat.moments.touches.push({
            minute: e.minute ?? 0,
            label: `Touch (${e.minute ?? 0}')`,
          });
          break;
        case "tackle":
          stat.tackles += 1;
          stat.moments.tackles.push({
            minute: e.minute ?? 0,
            label: `Tackle (${e.minute ?? 0}')`,
          });
          break;
        case "interception":
          stat.interceptions += 1;
          stat.moments.interceptions.push({
            minute: e.minute ?? 0,
            label: `Interception (${e.minute ?? 0}')`,
          });
          break;
        case "clearance":
          stat.clearances += 1;
          stat.moments.clearances.push({
            minute: e.minute ?? 0,
            label: `Clearance (${e.minute ?? 0}')`,
          });
          break;
        case "block":
          stat.blocks += 1;
          stat.moments.blocks.push({
            minute: e.minute ?? 0,
            label: `Block (${e.minute ?? 0}')`,
          });
          break;
        case "foul":
          stat.fouls += 1;
          stat.moments.fouls.push({
            minute: e.minute ?? 0,
            label: `Foul (${e.minute ?? 0}')`,
          });
          break;
        default:
          break;
      }
    }

    // Match-level assists from successful pass within 2' before a goal.
    const passes = events
      .filter((e) => e.type === "pass" && e.player?.id && isSuccessfulPass(e.metadata))
      .sort((a, b) => (a.minute || 0) - (b.minute || 0));
    const goals = events
      .filter((e) => e.type === "shot" && e.player?.id)
      .filter((e) => String(parseMetadata(e.metadata).outcome || "").toLowerCase() === "goal")
      .sort((a, b) => (a.minute || 0) - (b.minute || 0));

    for (const goal of goals) {
      if (goal.minute === null) continue;
      const goalMinute = goal.minute;
      const assister = [...passes]
        .reverse()
        .find((p) => p.team === goal.team && p.minute !== null && p.minute <= goalMinute && p.minute >= goalMinute - 2);
      const assisterId = assister?.player?.id;
      if (!assisterId) continue;
      const stat = byPlayer.get(assisterId);
      if (stat) stat.assists += 1;
      const assisterPass = passes.find((p) => p.player?.id === assisterId && p.minute === assister?.minute);
      if (stat && assisterPass) {
        stat.xA += Number(goal.xg || 0);
        stat.moments.assists.push({
          minute: assisterPass.minute ?? 0,
          label: `Assist action (${assisterPass.minute ?? 0}')`,
        });
      }
    }

    const matchDuration = Math.max(
      90,
      ...events.map((e) => (typeof e.minute === "number" ? e.minute : 0)),
    );

    // Flexible substitution extraction from metadata and type names.
    const subInAt = new Map<number, number>();
    const subOutAt = new Map<number, number>();
    for (const e of events) {
      const typeLower = String(e.type || "").toLowerCase();
      if (!typeLower.includes("sub")) continue;
      const meta = parseMetadata(e.metadata);
      const inId = Number(
        (meta.inPlayerId ?? meta.playerInId ?? meta.subOnPlayerId ?? meta.playerIn ?? null) as number | null,
      );
      const outId = Number(
        (meta.outPlayerId ?? meta.playerOutId ?? meta.subOffPlayerId ?? meta.playerOut ?? null) as number | null,
      );
      const minute = e.minute ?? 0;
      if (!Number.isNaN(inId) && inId > 0) {
        subInAt.set(inId, Math.min(subInAt.get(inId) ?? minute, minute));
      }
      if (!Number.isNaN(outId) && outId > 0) {
        subOutAt.set(outId, Math.min(subOutAt.get(outId) ?? minute, minute));
      }
    }

    return Array.from(byPlayer.values())
      .filter((p) => p.shots + p.passes + p.touches + p.tackles + p.interceptions + p.clearances + p.blocks + p.fouls > 0)
      .map((p) => ({
        ...p,
        minutes: (() => {
          const isStarter = starterPlayerIds.includes(p.playerId);
          const explicitIn = subInAt.get(p.playerId);
          const explicitOut = subOutAt.get(p.playerId);
          if (explicitIn !== undefined || explicitOut !== undefined) {
            const start = explicitIn !== undefined ? explicitIn : 0;
            const end = explicitOut !== undefined ? explicitOut : matchDuration;
            return Math.max(1, end - start);
          }
          if (isStarter) return Math.max(1, matchDuration);
          const firstActionMinute = p.moments.shots[0]?.minute
            ?? p.moments.passes[0]?.minute
            ?? p.moments.touches[0]?.minute
            ?? p.moments.tackles[0]?.minute
            ?? p.moments.interceptions[0]?.minute
            ?? p.minutes;
          return Math.max(1, matchDuration - firstActionMinute);
        })(),
        passAccuracy: p.passes > 0 ? (p.successfulPasses / p.passes) * 100 : 0,
        averageXG: p.shots > 0 ? p.xg / p.shots : 0,
        conversionRate: p.shots > 0 ? (p.goals / p.shots) * 100 : 0,
        minutesSafe: p.minutes > 0 ? p.minutes : 1,
        goalsPer90: p.minutes > 0 ? (p.goals / p.minutes) * 90 : 0,
        assistsPer90: p.minutes > 0 ? (p.assists / p.minutes) * 90 : 0,
        shotsPer90: p.minutes > 0 ? (p.shots / p.minutes) * 90 : 0,
        xGPer90: p.minutes > 0 ? (p.xg / p.minutes) * 90 : 0,
        xAPer90: p.minutes > 0 ? (p.xA / p.minutes) * 90 : 0,
        passesPer90: p.minutes > 0 ? (p.passes / p.minutes) * 90 : 0,
        keyPassesPer90: p.minutes > 0 ? (p.keyPasses / p.minutes) * 90 : 0,
        progressivePassesPer90: p.minutes > 0 ? (p.progressivePasses / p.minutes) * 90 : 0,
        touchesPer90: p.minutes > 0 ? (p.touches / p.minutes) * 90 : 0,
        tacklesPer90: p.minutes > 0 ? (p.tackles / p.minutes) * 90 : 0,
        interceptionsPer90: p.minutes > 0 ? (p.interceptions / p.minutes) * 90 : 0,
        coachScore: 0,
        totalActions:
          p.shots +
          p.passes +
          p.touches +
          p.tackles +
          p.interceptions +
          p.clearances +
          p.blocks +
          p.fouls,
        sampleQuality:
          p.shots +
            p.passes +
            p.touches +
            p.tackles +
            p.interceptions +
            p.clearances +
            p.blocks +
            p.fouls <
          5
            ? "low"
            : "normal",
      }));
  }, [events, players, homeTeamName, awayTeamName, starterPlayerIds]);

  const rowsWithCoachScore = useMemo(() => {
    const roleFor = (position: string) => {
      const p = (position || "").toUpperCase();
      if (p.includes("GK")) return "GK";
      if (["CB", "LB", "RB", "LWB", "RWB"].some((k) => p.includes(k))) return "DEF";
      if (["CM", "CDM", "CAM", "LM", "RM"].some((k) => p.includes(k))) return "MID";
      if (["ST", "CF", "LW", "RW"].some((k) => p.includes(k))) return "ATT";
      return "MID";
    };

    const clamp10 = (n: number) => Math.max(0, Math.min(10, n));

    return perPlayerStats.map((row) => {
      const role = roleFor(row.position);
      let score = 5;
      if (role === "DEF") {
        score =
          0.35 * Math.min(10, row.tackles + row.interceptions) +
          0.15 * Math.min(10, row.clearances + row.blocks) +
          0.2 * (row.passAccuracy / 10) +
          0.15 * Math.min(10, row.progressivePasses) +
          0.15 * Math.min(10, row.minutes / 9);
      } else if (role === "MID") {
        score =
          0.25 * Math.min(10, row.keyPasses + row.progressivePasses) +
          0.2 * (row.passAccuracy / 10) +
          0.2 * Math.min(10, row.touches / 8) +
          0.2 * Math.min(10, row.xA * 4 + row.assists * 3) +
          0.15 * Math.min(10, row.tackles + row.interceptions);
      } else if (role === "ATT") {
        score =
          0.35 * Math.min(10, row.goals * 4 + row.xg * 3) +
          0.2 * Math.min(10, row.shotsOnTarget * 1.5) +
          0.2 * Math.min(10, row.assists * 3 + row.xA * 3) +
          0.1 * Math.min(10, row.keyPasses + row.progressivePasses) +
          0.15 * Math.min(10, row.minutes / 9);
      } else {
        score =
          0.25 * (row.passAccuracy / 10) +
          0.25 * Math.min(10, row.minutes / 9) +
          0.25 * Math.min(10, row.touches / 8) +
          0.25 * Math.min(10, row.tackles + row.interceptions);
      }
      return { ...row, coachScore: clamp10(score) };
    });
  }, [perPlayerStats]);

  const starterSet = useMemo(() => new Set(starterPlayerIds), [starterPlayerIds]);
  const filteredRows = useMemo(() => {
    return rowsWithCoachScore.filter((row) => {
      if (teamFilter !== "all") {
        if (teamFilter === "home" && row.teamSide !== "home") return false;
        if (teamFilter === "away" && row.teamSide !== "away") return false;
      }
      if (positionFilter !== "all" && (row.position || "N/A") !== positionFilter) return false;
      if (row.minutes < minMinutesFilter) return false;
      const isStarter = starterSet.has(row.playerId);
      if (lineupFilter === "starters" && !isStarter) return false;
      if (lineupFilter === "subs" && isStarter) return false;
      return true;
    });
  }, [rowsWithCoachScore, teamFilter, positionFilter, minMinutesFilter, lineupFilter, starterSet]);

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows];
    rows.sort((a, b) => {
      const getValue = (row: (typeof rows)[number]) => {
        switch (sortKey) {
          case "player":
            return row.playerName;
          case "team":
            return row.teamName;
          case "minutes":
            return row.minutes;
          case "goals":
            return row.goals;
          case "assists":
            return row.assists;
          case "shots":
            return row.shots;
          case "shotsOnTarget":
            return row.shotsOnTarget;
          case "xg":
            return row.xg;
          case "averageXG":
            return row.averageXG;
          case "xA":
            return row.xA;
          case "passes":
            return row.passes;
          case "successfulPasses":
            return row.successfulPasses;
          case "passAccuracy":
            return row.passAccuracy;
          case "keyPasses":
            return row.keyPasses;
          case "progressivePasses":
            return row.progressivePasses;
          case "passesIntoFinalThird":
            return row.passesIntoFinalThird;
          case "passesIntoPenaltyArea":
            return row.passesIntoPenaltyArea;
          case "longPasses":
            return row.longPasses;
          case "touches":
            return row.touches;
          case "tackles":
            return row.tackles;
          case "interceptions":
            return row.interceptions;
          case "clearances":
            return row.clearances;
          case "blocks":
            return row.blocks;
          case "fouls":
            return row.fouls;
          case "coachScore":
            return row.coachScore;
          default:
            return 0;
        }
      };

      const av = getValue(a);
      const bv = getValue(b);
      if (typeof av === "string" && typeof bv === "string") {
        return sortDirection === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDirection === "asc"
        ? Number(av) - Number(bv)
        : Number(bv) - Number(av);
    });
    return rows;
  }, [filteredRows, sortKey, sortDirection]);

  const totals = useMemo(() => {
    const base = {
      players: perPlayerStats.length,
      goals: 0,
      shots: 0,
      xg: 0,
      passAccuracy: 0,
    };
    for (const row of perPlayerStats) {
      base.goals += row.goals;
      base.shots += row.shots;
      base.xg += row.xg;
      base.passAccuracy += row.passAccuracy;
    }
    return {
      ...base,
      passAccuracy: base.players > 0 ? base.passAccuracy / base.players : 0,
    };
  }, [perPlayerStats]);

  const topXgPlayer = useMemo(() => {
    if (perPlayerStats.length === 0) return null;
    return [...perPlayerStats].sort((a, b) => b.xg - a.xg)[0];
  }, [perPlayerStats]);
  const topPassAccuracyPlayer = useMemo(() => {
    if (perPlayerStats.length === 0) return null;
    return [...perPlayerStats]
      .filter((p) => p.passes >= 5)
      .sort((a, b) => b.passAccuracy - a.passAccuracy)[0] || null;
  }, [perPlayerStats]);
  const topDuelPlayer = useMemo(() => {
    if (perPlayerStats.length === 0) return null;
    return [...perPlayerStats].sort(
      (a, b) => b.tackles + b.interceptions - (a.tackles + a.interceptions),
    )[0];
  }, [perPlayerStats]);

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("desc");
  };

  const SortArrow = ({ keyName }: { keyName: SortKey }) =>
    sortKey === keyName ? <span className="text-emerald-400">{sortDirection === "asc" ? "↑" : "↓"}</span> : null;

  if (sortedRows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-center text-[11px] text-slate-400">
        Δεν υπάρχουν match events ανά παίκτη για να εξαχθούν στατιστικά.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-[#1a1f2e] bg-gradient-to-br from-[#0b1220] via-[#0f1620] to-[#0b1220] p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.15),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(59,130,246,0.12),transparent_30%)]" />
        <div className="relative flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-emerald-300/80">Match Intelligence</p>
            <h3 className="text-base font-bold text-white">Players Analysis Dashboard</h3>
            <p className="text-[11px] text-slate-400">Αναλυτική εικόνα απόδοσης παικτών για το συγκεκριμένο παιχνίδι</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px]">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">⚽ Match-specific</span>
            <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-2.5 py-1 text-blue-300">📊 Full metrics</span>
            <span className="rounded-full border border-purple-400/30 bg-purple-500/10 px-2.5 py-1 text-purple-300">🧠 Coach view</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <div className="group rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-4 transition hover:border-emerald-500/40">
          <p className="text-[10px] text-slate-500">👥 Ενεργοί Παίκτες</p>
          <p className="mt-1 text-2xl font-bold text-white">{totals.players}</p>
        </div>
        <div className="group rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-4 transition hover:border-amber-500/40">
          <p className="text-[10px] text-slate-500">🥅 Συνολικά Γκολ</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">{totals.goals}</p>
        </div>
        <div className="group rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-4 transition hover:border-sky-500/40">
          <p className="text-[10px] text-slate-500">🎯 Συνολικά Σουτ</p>
          <p className="mt-1 text-2xl font-bold text-sky-300">{totals.shots}</p>
        </div>
        <div className="group rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-4 transition hover:border-emerald-500/40">
          <p className="text-[10px] text-slate-500">📈 Συνολικό xG</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{totals.xg.toFixed(2)}</p>
        </div>
        <div className="group rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-4 transition hover:border-blue-500/40">
          <p className="text-[10px] text-slate-500">✅ Avg Pass Accuracy</p>
          <p className="mt-1 text-2xl font-bold text-blue-300">{totals.passAccuracy.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
          <p className="text-[10px] text-emerald-300/80">🏆 Top xG</p>
          <p className="mt-1 truncate text-sm font-semibold text-white">{topXgPlayer?.playerName || "-"}</p>
          <p className="text-[10px] text-emerald-300">{topXgPlayer ? `${topXgPlayer.xg.toFixed(2)} xG` : "-"}</p>
        </div>
        <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 p-4">
          <p className="text-[10px] text-blue-300/80">🎯 Best Passing (5+)</p>
          <p className="mt-1 truncate text-sm font-semibold text-white">{topPassAccuracyPlayer?.playerName || "-"}</p>
          <p className="text-[10px] text-blue-300">{topPassAccuracyPlayer ? `${topPassAccuracyPlayer.passAccuracy.toFixed(1)}%` : "-"}</p>
        </div>
        <div className="rounded-xl border border-purple-500/25 bg-purple-500/10 p-4">
          <p className="text-[10px] text-purple-300/80">🛡️ Defensive Leader</p>
          <p className="mt-1 truncate text-sm font-semibold text-white">{topDuelPlayer?.playerName || "-"}</p>
          <p className="text-[10px] text-purple-300">{topDuelPlayer ? `${topDuelPlayer.tackles + topDuelPlayer.interceptions} actions` : "-"}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <div className="grid gap-3 md:grid-cols-4">
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value as "all" | "home" | "away")}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] text-slate-200 outline-none"
          >
            <option value="all">Όλες οι ομάδες</option>
            <option value="home">{homeTeamName}</option>
            <option value="away">{awayTeamName}</option>
          </select>
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] text-slate-200 outline-none"
          >
            <option value="all">Όλες οι θέσεις</option>
            {Array.from(new Set(rowsWithCoachScore.map((r) => r.position || "N/A")))
              .sort()
              .map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
          </select>
          <input
            type="number"
            min={0}
            max={130}
            value={minMinutesFilter}
            onChange={(e) => setMinMinutesFilter(Number(e.target.value || 0))}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] text-slate-200 outline-none"
            placeholder="Min minutes"
          />
          <select
            value={lineupFilter}
            onChange={(e) => setLineupFilter(e.target.value as "all" | "starters" | "subs")}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] text-slate-200 outline-none"
          >
            <option value="all">Όλοι</option>
            <option value="starters">Μόνο starters</option>
            <option value="subs">Μόνο subs</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#1a1f2e] bg-[#0b1220]">
        <div className="border-b border-[#1a1f2e] bg-[#0f1620] px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold text-white">📋 Raw Match Metrics (ανά παίκτη)</p>
            <button
              onClick={() => setShowCoachScoreHelp((v) => !v)}
              className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
            >
              Coach Score ?
            </button>
          </div>
          <p className="text-[10px] text-slate-500">Tap σε column header για sorting</p>
          {showCoachScoreHelp && (
            <div className="mt-2 rounded-md border border-slate-700 bg-slate-900/60 p-2 text-[10px] text-slate-300">
              DEF: tackles/interceptions, clearances/blocks, pass accuracy, progressive, minutes.
              MID: key+progressive passes, pass accuracy, touches, xA+assists, defensive actions.
              ATT: goals+xG, shots on target, assists+xA, creative passing, minutes.
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-[11px] text-slate-200">
          <thead className="bg-slate-900/80 text-slate-400">
            <tr>
              {[
                ["player", "Παίκτης"],
                ["team", "Ομάδα"],
                ["minutes", "Λεπτά"],
                ["goals", "Γκολ"],
                ["assists", "Ασίστ"],
                ["shots", "Σουτ"],
                ["shotsOnTarget", "Στο Τέρμα"],
                ["xg", "xG"],
                ["averageXG", "Μ.Ο. xG"],
                ["xA", "xA"],
                ["passes", "Πάσες"],
                ["successfulPasses", "Επιτυχημένες"],
                ["passAccuracy", "Ακρίβεια %"],
                ["keyPasses", "Κρίσιμες"],
                ["progressivePasses", "Προοδευτικές"],
                ["passesIntoFinalThird", "Στο Τελικό Τρίτο"],
                ["passesIntoPenaltyArea", "Στην Περιοχή"],
                ["longPasses", "Μακρινές"],
                ["touches", "Αγγίγματα"],
                ["tackles", "Κλεψίματα"],
                ["interceptions", "Αναχαίτισεις"],
                ["clearances", "Καθαρίσματα"],
                ["blocks", "Μπλοκ"],
                ["fouls", "Φάουλ"],
                ["coachScore", "Coach Score"],
              ].map(([key, label]) => (
                <th
                  key={key}
                  className={`px-3 py-2 font-medium ${key === "player" || key === "team" ? "text-left" : "text-right"} cursor-pointer hover:text-white`}
                  onClick={() => onSort(key as SortKey)}
                >
                  <div className={`flex items-center gap-1 ${key === "player" || key === "team" ? "" : "justify-end"}`}>
                    <span>{label}</span>
                    <SortArrow keyName={key as SortKey} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, idx) => (
              <tr key={row.playerId} className={`border-t border-slate-800/80 ${idx % 2 === 0 ? "bg-slate-950/80" : "bg-slate-900/40"} hover:bg-slate-800/30`}>
                <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-left font-medium text-white">
                  {row.shirtNumber ? `#${row.shirtNumber} ` : ""}
                  {row.playerName}
                  {row.sampleQuality === "low" && (
                    <span className="ml-2 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-300">
                      Low sample
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-left">
                  <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px]">{row.teamName}</span>
                </td>
                <td className="px-3 py-2 text-right">{row.minutes}</td>
                <td className="px-3 py-2 text-right text-amber-400">
                  <button
                    className="hover:text-emerald-300"
                    onClick={() =>
                      setMomentsModal({
                        open: true,
                        playerName: row.playerName,
                        metricLabel: "Goals",
                        moments: row.moments.goals,
                      })
                    }
                  >
                    {row.goals}
                  </button>
                </td>
                <td className="px-3 py-2 text-right text-blue-400">
                  <button
                    className="hover:text-emerald-300"
                    onClick={() =>
                      setMomentsModal({
                        open: true,
                        playerName: row.playerName,
                        metricLabel: "Assists",
                        moments: row.moments.assists,
                      })
                    }
                  >
                    {row.assists}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="hover:text-emerald-300"
                    onClick={() =>
                      setMomentsModal({
                        open: true,
                        playerName: row.playerName,
                        metricLabel: "Shots",
                        moments: row.moments.shots,
                      })
                    }
                  >
                    {row.shots}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="hover:text-emerald-300"
                    onClick={() =>
                      setMomentsModal({
                        open: true,
                        playerName: row.playerName,
                        metricLabel: "Shots on Target",
                        moments: row.moments.shotsOnTarget,
                      })
                    }
                  >
                    {row.shotsOnTarget}
                  </button>
                </td>
                <td className="px-3 py-2 text-right text-emerald-400">{row.xg.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{row.averageXG.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{row.xA.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="hover:text-emerald-300"
                    onClick={() =>
                      setMomentsModal({
                        open: true,
                        playerName: row.playerName,
                        metricLabel: "Passes",
                        moments: row.moments.passes,
                      })
                    }
                  >
                    {row.passes}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="hover:text-emerald-300"
                    onClick={() =>
                      setMomentsModal({
                        open: true,
                        playerName: row.playerName,
                        metricLabel: "Successful Passes",
                        moments: row.moments.successfulPasses,
                      })
                    }
                  >
                    {row.successfulPasses}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">{row.passAccuracy.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="hover:text-emerald-300"
                    onClick={() =>
                      setMomentsModal({
                        open: true,
                        playerName: row.playerName,
                        metricLabel: "Key Passes",
                        moments: row.moments.keyPasses,
                      })
                    }
                  >
                    {row.keyPasses}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="hover:text-emerald-300"
                    onClick={() =>
                      setMomentsModal({
                        open: true,
                        playerName: row.playerName,
                        metricLabel: "Progressive Passes",
                        moments: row.moments.progressivePasses,
                      })
                    }
                  >
                    {row.progressivePasses}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="hover:text-emerald-300"
                    onClick={() =>
                      setMomentsModal({
                        open: true,
                        playerName: row.playerName,
                        metricLabel: "Passes Into Final Third",
                        moments: row.moments.passesIntoFinalThird,
                      })
                    }
                  >
                    {row.passesIntoFinalThird}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="hover:text-emerald-300"
                    onClick={() =>
                      setMomentsModal({
                        open: true,
                        playerName: row.playerName,
                        metricLabel: "Passes Into Penalty Area",
                        moments: row.moments.passesIntoPenaltyArea,
                      })
                    }
                  >
                    {row.passesIntoPenaltyArea}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="hover:text-emerald-300"
                    onClick={() =>
                      setMomentsModal({
                        open: true,
                        playerName: row.playerName,
                        metricLabel: "Long Passes",
                        moments: row.moments.longPasses,
                      })
                    }
                  >
                    {row.longPasses}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="hover:text-emerald-300"
                    onClick={() =>
                      setMomentsModal({
                        open: true,
                        playerName: row.playerName,
                        metricLabel: "Touches",
                        moments: row.moments.touches,
                      })
                    }
                  >
                    {row.touches}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="hover:text-emerald-300"
                    onClick={() =>
                      setMomentsModal({
                        open: true,
                        playerName: row.playerName,
                        metricLabel: "Tackles",
                        moments: row.moments.tackles,
                      })
                    }
                  >
                    {row.tackles}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="hover:text-emerald-300"
                    onClick={() =>
                      setMomentsModal({
                        open: true,
                        playerName: row.playerName,
                        metricLabel: "Interceptions",
                        moments: row.moments.interceptions,
                      })
                    }
                  >
                    {row.interceptions}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="hover:text-emerald-300"
                    onClick={() =>
                      setMomentsModal({
                        open: true,
                        playerName: row.playerName,
                        metricLabel: "Clearances",
                        moments: row.moments.clearances,
                      })
                    }
                  >
                    {row.clearances}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="hover:text-emerald-300"
                    onClick={() =>
                      setMomentsModal({
                        open: true,
                        playerName: row.playerName,
                        metricLabel: "Blocks",
                        moments: row.moments.blocks,
                      })
                    }
                  >
                    {row.blocks}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="hover:text-emerald-300"
                    onClick={() =>
                      setMomentsModal({
                        open: true,
                        playerName: row.playerName,
                        metricLabel: "Fouls",
                        moments: row.moments.fouls,
                      })
                    }
                  >
                    {row.fouls}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <span className="rounded px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    {row.coachScore.toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#1a1f2e] bg-[#0b1220]">
        <div className="border-b border-[#1a1f2e] bg-[#0f1620] px-4 py-3">
          <p className="text-[11px] font-semibold text-white">⏱️ Efficiency & Per-90 Metrics</p>
          <p className="text-[10px] text-slate-500">Συγκρίσιμη εικόνα ακόμα κι όταν παίζουν διαφορετικά λεπτά</p>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-[11px] text-slate-200">
          <thead className="bg-slate-900/80 text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Παίκτης</th>
              <th className="px-3 py-2 text-right font-medium">Μετατροπή %</th>
              <th className="px-3 py-2 text-right font-medium">Γκολ / 90</th>
              <th className="px-3 py-2 text-right font-medium">Ασίστ / 90</th>
              <th className="px-3 py-2 text-right font-medium">Σουτ / 90</th>
              <th className="px-3 py-2 text-right font-medium">xG / 90</th>
              <th className="px-3 py-2 text-right font-medium">xA / 90</th>
              <th className="px-3 py-2 text-right font-medium">Πάσες / 90</th>
              <th className="px-3 py-2 text-right font-medium">Κρίσιμες / 90</th>
              <th className="px-3 py-2 text-right font-medium">Προοδευτικές / 90</th>
              <th className="px-3 py-2 text-right font-medium">Αγγίγματα / 90</th>
              <th className="px-3 py-2 text-right font-medium">Κλεψίματα / 90</th>
              <th className="px-3 py-2 text-right font-medium">Αναχαιτίσεις / 90</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, idx) => (
              <tr key={`per90-${row.playerId}`} className={`border-t border-slate-800/80 ${idx % 2 === 0 ? "bg-slate-950/80" : "bg-slate-900/40"} hover:bg-slate-800/30`}>
                <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-left font-medium text-white">
                  {row.shirtNumber ? `#${row.shirtNumber} ` : ""}
                  {row.playerName}
                </td>
                <td className="px-3 py-2 text-right">{row.conversionRate.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right">{row.goalsPer90.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{row.assistsPer90.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{row.shotsPer90.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{row.xGPer90.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{row.xAPer90.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{row.passesPer90.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{row.keyPassesPer90.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{row.progressivePassesPer90.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{row.touchesPer90.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{row.tacklesPer90.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{row.interceptionsPer90.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      {momentsModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-700 bg-slate-950 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{momentsModal.playerName}</p>
                <p className="text-[11px] text-slate-400">{momentsModal.metricLabel} - Key Moments</p>
              </div>
              <button
                onClick={() => setMomentsModal({ open: false, playerName: "", metricLabel: "", moments: [] })}
                className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300"
              >
                Close
              </button>
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {momentsModal.moments.length === 0 ? (
                <p className="text-[11px] text-slate-500">Δεν υπάρχουν στιγμές για αυτό το metric.</p>
              ) : (
                momentsModal.moments
                  .sort((a, b) => a.minute - b.minute)
                  .map((m, idx) => (
                    <div key={`${m.label}-${idx}`} className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/60 px-3 py-2">
                      <div>
                        <p className="text-[11px] text-slate-200">{m.label}</p>
                        <p className="text-[10px] text-slate-500">{m.minute}'</p>
                      </div>
                      <button
                        onClick={() => {
                          if (canJumpToVideo) {
                            onJumpToVideoMinute?.(m.minute);
                          }
                          setMomentsModal({ open: false, playerName: "", metricLabel: "", moments: [] });
                        }}
                        disabled={!canJumpToVideo}
                        className="rounded bg-emerald-500 px-2 py-1 text-[10px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {canJumpToVideo ? "Jump to video" : "No video source"}
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

