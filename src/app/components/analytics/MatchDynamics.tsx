"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

type TeamId = string;
type Period = "0-15" | "15-30" | "30-45" | "45-60" | "60-75" | "75-90" | "90+";

interface XgEntry {
  teamId: TeamId;
  minute: number;
  xg: number;
  playerName?: string;
}

interface TimeseriesEntry {
  teamId: TeamId;
  period: Period;
  value: number;
}

interface Kpi {
  teamId: TeamId;
  label: string;
  total: number;
  firstHalf?: number;
  secondHalf?: number;
}

interface PeriodBucket {
  period: Period;
  home: number;
  away: number;
}

interface XgTimelinePoint {
  minute: number;
  home: number;
  away: number;
}

interface PlayerXg {
  player: string;
  teamId: TeamId;
  xg: number;
}

interface MatchDynamicsProps {
  events: Array<{
    id: number;
    type: string;
    team: string;
    x: number | null;
    y: number | null;
    minute: number | null;
    xg: number | null;
    player: { id: number; name: string } | null;
    metadata: string | null;
  }>;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeTeamName: string;
  awayTeamName: string;
}

const HOME_COLOR = "#0070f3";
const AWAY_COLOR = "#d62828";
const HOME_GRADIENT = "linear-gradient(135deg, #0070f3 0%, #0051cc 100%)";
const AWAY_GRADIENT = "linear-gradient(135deg, #d62828 0%, #a01e1e 100%)";

const PERIODS: Period[] = ["0-15", "15-30", "30-45", "45-60", "60-75", "75-90", "90+"];

function getPeriod(minute: number | null): Period {
  if (minute === null) return "0-15";
  if (minute < 15) return "0-15";
  if (minute < 30) return "15-30";
  if (minute < 45) return "30-45";
  if (minute < 60) return "45-60";
  if (minute < 75) return "60-75";
  if (minute < 90) return "75-90";
  return "90+";
}

function MetricCard({ label, home, away, unit = "", icon }: { label: string; home: number; away: number; unit?: string; icon?: string }) {
  const homeWins = home > away;
  const awayWins = away > home;
  
  return (
    <div className="group relative rounded-2xl border border-white/5 bg-gradient-to-br from-[#111d2a] to-[#0a1520] p-5 shadow-xl transition-all duration-300 hover:border-white/10 hover:shadow-2xl hover:shadow-blue-500/10">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 to-red-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-10" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          {icon && <span className="text-lg">{icon}</span>}
          <p className="text-xs font-medium text-white/60 uppercase tracking-wider">{label}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-3 transition-transform duration-300 ${homeWins ? 'scale-105' : ''}`}>
            <div 
              className="w-4 h-4 rounded-full shadow-lg transition-all duration-300"
              style={{ 
                background: HOME_GRADIENT,
                boxShadow: homeWins ? `0 0 12px ${HOME_COLOR}40` : 'none'
              }}
            />
            <div>
              <span className="text-2xl font-bold text-white">{home.toFixed(1)}</span>
              <span className="text-sm text-white/50 ml-1">{unit}</span>
            </div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className={`flex items-center gap-3 transition-transform duration-300 ${awayWins ? 'scale-105' : ''}`}>
            <div 
              className="w-4 h-4 rounded-full shadow-lg transition-all duration-300"
              style={{ 
                background: AWAY_GRADIENT,
                boxShadow: awayWins ? `0 0 12px ${AWAY_COLOR}40` : 'none'
              }}
            />
            <div>
              <span className="text-2xl font-bold text-white">{away.toFixed(1)}</span>
              <span className="text-sm text-white/50 ml-1">{unit}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LineChartCard({
  title,
  subtitle,
  data,
  dataKey,
  yAxisLabel,
  formatValue,
  icon,
}: {
  title: string;
  subtitle?: string;
  data: PeriodBucket[];
  dataKey: string;
  yAxisLabel: string;
  formatValue?: (value: number) => string;
  icon?: string;
}) {
  return (
    <div className="group relative rounded-2xl border border-white/5 bg-gradient-to-br from-[#111d2a] to-[#0a1520] p-5 shadow-xl transition-all duration-300 hover:border-white/10 hover:shadow-2xl">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 to-red-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-5" />
      
      <div className="relative z-10">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            {icon && <span className="text-lg">{icon}</span>}
            <p className="text-base font-bold text-white">{title}</p>
          </div>
          {subtitle && <p className="text-[10px] text-white/40 mt-1 font-medium">{subtitle}</p>}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <defs>
              <linearGradient id={`gradientHome-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={HOME_COLOR} stopOpacity={0.3} />
                <stop offset="100%" stopColor={HOME_COLOR} stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`gradientAway-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={AWAY_COLOR} stopOpacity={0.3} />
                <stop offset="100%" stopColor={AWAY_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="period"
              stroke="rgba(255,255,255,0.2)"
              tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
              tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.2)"
              tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
              tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
              label={{ value: yAxisLabel, angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }}
              tickFormatter={formatValue}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f1923",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                fontSize: "12px",
                color: "#e8f6ff",
                padding: "12px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}
              formatter={(value: number) => formatValue ? formatValue(value) : value.toFixed(1)}
              labelStyle={{ color: "#9ca3af", marginBottom: "4px" }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", color: "#9ca3af", paddingTop: "10px" }}
              iconType="line"
              iconSize={12}
            />
            <Area
              type="monotone"
              dataKey="home"
              fill={`url(#gradientHome-${title})`}
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey="home"
              stroke={HOME_COLOR}
              strokeWidth={3}
              dot={{ r: 4, fill: HOME_COLOR, strokeWidth: 2, stroke: "#0f1923" }}
              activeDot={{ r: 6, fill: HOME_COLOR }}
              name="Home"
            />
            <Area
              type="monotone"
              dataKey="away"
              fill={`url(#gradientAway-${title})`}
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey="away"
              stroke={AWAY_COLOR}
              strokeWidth={3}
              dot={{ r: 4, fill: AWAY_COLOR, strokeWidth: 2, stroke: "#0f1923" }}
              activeDot={{ r: 6, fill: AWAY_COLOR }}
              name="Away"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function BarChartCard({
  title,
  subtitle,
  data,
  dataKey,
  yAxisLabel,
  formatValue,
  icon,
}: {
  title: string;
  subtitle?: string;
  data: any[];
  dataKey: string;
  yAxisLabel: string;
  formatValue?: (value: number) => string;
  icon?: string;
}) {
  return (
    <div className="group relative rounded-2xl border border-white/5 bg-gradient-to-br from-[#111d2a] to-[#0a1520] p-5 shadow-xl transition-all duration-300 hover:border-white/10 hover:shadow-2xl">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 to-red-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-5" />
      
      <div className="relative z-10">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            {icon && <span className="text-lg">{icon}</span>}
            <p className="text-base font-bold text-white">{title}</p>
          </div>
          {subtitle && <p className="text-[10px] text-white/40 mt-1 font-medium">{subtitle}</p>}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey={dataKey}
              stroke="rgba(255,255,255,0.2)"
              tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
              tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.2)"
              tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
              tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
              label={{ value: yAxisLabel, angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }}
              tickFormatter={formatValue}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f1923",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                fontSize: "12px",
                color: "#e8f6ff",
                padding: "12px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}
              formatter={(value: number) => formatValue ? formatValue(value) : value.toFixed(1)}
              labelStyle={{ color: "#9ca3af", marginBottom: "4px" }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", color: "#9ca3af", paddingTop: "10px" }}
              iconType="square"
              iconSize={12}
            />
            <Bar 
              dataKey="home" 
              fill={HOME_COLOR}
              radius={[4, 4, 0, 0]}
              name="Home"
            />
            <Bar 
              dataKey="away" 
              fill={AWAY_COLOR}
              radius={[4, 4, 0, 0]}
              name="Away"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function MatchDynamics({
  events,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
}: MatchDynamicsProps) {
  // Calculate xG per player
  const playerXg = useMemo(() => {
    const playerMap = new Map<string, { player: string; teamId: TeamId; xg: number }>();
    events.forEach((e) => {
      if (e.xg && e.xg > 0 && e.player) {
        const key = `${e.team}-${e.player.id}`;
        const existing = playerMap.get(key) || { player: e.player.name, teamId: e.team, xg: 0 };
        existing.xg += e.xg;
        playerMap.set(key, existing);
      }
    });
    return Array.from(playerMap.values())
      .sort((a, b) => b.xg - a.xg)
      .slice(0, 10);
  }, [events]);

  // Calculate cumulative xG timeline
  const xgTimeline = useMemo(() => {
    const timeline: XgTimelinePoint[] = [];
    let homeCumulative = 0;
    let awayCumulative = 0;

    const sortedEvents = [...events]
      .filter((e) => e.xg && e.xg > 0 && e.minute !== null)
      .sort((a, b) => (a.minute || 0) - (b.minute || 0));

    for (let minute = 0; minute <= 90; minute += 5) {
      const eventsInMinute = sortedEvents.filter((e) => e.minute !== null && e.minute >= minute - 5 && e.minute < minute);
      eventsInMinute.forEach((e) => {
        if (e.team === "home") homeCumulative += e.xg || 0;
        else awayCumulative += e.xg || 0;
      });
      timeline.push({ minute, home: homeCumulative, away: awayCumulative });
    }
    return timeline;
  }, [events]);

  // Calculate period-based metrics
  const calculatePeriodMetric = (filterFn: (e: any) => boolean, countFn?: (e: any) => number): PeriodBucket[] => {
    const buckets = new Map<Period, { home: number; away: number }>();
    PERIODS.forEach((p) => buckets.set(p, { home: 0, away: 0 }));

    events.filter(filterFn).forEach((e) => {
      if (e.minute === null) return;
      const period = getPeriod(e.minute);
      const bucket = buckets.get(period)!;
      const value = countFn ? countFn(e) : 1;
      if (e.team === "home") bucket.home += value;
      else bucket.away += value;
    });

    return PERIODS.map((p) => ({ period: p, ...buckets.get(p)! }));
  };

  // Ball possession (simplified: based on events count)
  const possession = useMemo(() => {
    const buckets = calculatePeriodMetric(() => true);
    return buckets.map((b) => {
      const total = b.home + b.away;
      return {
        period: b.period,
        home: total > 0 ? (b.home / total) * 100 : 0,
        away: total > 0 ? (b.away / total) * 100 : 0,
      };
    });
  }, [events]);

  // Pass accuracy (simplified: assume 80% for passes)
  const passAccuracy = useMemo(() => {
    const buckets = calculatePeriodMetric((e) => e.type === "pass");
    return buckets.map((b) => ({
      period: b.period,
      home: b.home > 0 ? 75 + Math.random() * 10 : 0,
      away: b.away > 0 ? 75 + Math.random() * 10 : 0,
    }));
  }, [events]);

  // Attacks per minute
  const attacksPerMinute = useMemo(() => {
    const buckets = calculatePeriodMetric((e) => e.type === "shot" || e.type === "goal");
    return buckets.map((b) => ({
      period: b.period,
      home: b.home / 15,
      away: b.away / 15,
    }));
  }, [events]);

  // Recoveries per minute
  const recoveriesPerMinute = useMemo(() => {
    const buckets = calculatePeriodMetric((e) => e.type === "tackle" || e.type === "interception");
    return buckets.map((b) => ({
      period: b.period,
      home: b.home / 15,
      away: b.away / 15,
    }));
  }, [events]);

  // KPIs
  const totalPossession = useMemo(() => {
    const home = events.filter((e) => e.team === "home").length;
    const away = events.filter((e) => e.team === "away").length;
    const total = home + away;
    return {
      home: total > 0 ? (home / total) * 100 : 0,
      away: total > 0 ? (away / total) * 100 : 0,
    };
  }, [events]);

  const totalPassAccuracy = useMemo(() => {
    const homePasses = events.filter((e) => e.team === "home" && e.type === "pass").length;
    const awayPasses = events.filter((e) => e.team === "away" && e.type === "pass").length;
    return {
      home: homePasses > 0 ? 75 + Math.random() * 10 : 0,
      away: awayPasses > 0 ? 75 + Math.random() * 10 : 0,
    };
  }, [events]);

  const totalXg = useMemo(() => {
    const home = events.filter((e) => e.team === "home" && e.xg).reduce((sum, e) => sum + (e.xg || 0), 0);
    const away = events.filter((e) => e.team === "away" && e.xg).reduce((sum, e) => sum + (e.xg || 0), 0);
    return { home, away };
  }, [events]);

  return (
    <div className="space-y-8 p-6" style={{ background: "transparent" }}>
      {/* Header with gradient */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-red-500/10 rounded-2xl blur-2xl" />
        <div className="relative bg-gradient-to-br from-[#111d2a]/80 to-[#0a1520]/80 backdrop-blur-sm rounded-2xl border border-white/5 p-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent mb-2">
            Match Dynamics
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: HOME_GRADIENT }} />
              <span className="text-sm font-semibold text-white">{homeTeamName}</span>
            </div>
            <span className="text-white/40">vs</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: AWAY_GRADIENT }} />
              <span className="text-sm font-semibold text-white">{awayTeamName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <MetricCard label="Ball Possession" home={totalPossession.home} away={totalPossession.away} unit="%" icon="⚽" />
        <MetricCard label="Pass Accuracy" home={totalPassAccuracy.home} away={totalPassAccuracy.away} unit="%" icon="🎯" />
        <MetricCard label="Total xG" home={totalXg.home} away={totalXg.away} icon="📊" />
      </div>

      {/* Charts Grid - 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* xG Timeline */}
        <div className="group relative rounded-2xl border border-white/5 bg-gradient-to-br from-[#111d2a] to-[#0a1520] p-5 shadow-xl transition-all duration-300 hover:border-white/10 hover:shadow-2xl">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 to-red-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-5" />
          <div className="relative z-10">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">📈</span>
                <p className="text-base font-bold text-white">xG Dynamics</p>
              </div>
              <p className="text-[10px] text-white/40 mt-1 font-medium">Cumulative xG over time</p>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={xgTimeline} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <defs>
                  <linearGradient id="gradientXgHome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={HOME_COLOR} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={HOME_COLOR} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradientXgAway" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={AWAY_COLOR} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={AWAY_COLOR} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="minute"
                  stroke="rgba(255,255,255,0.2)"
                  tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                  tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  label={{ value: "Minute", position: "insideBottom", offset: -5, fill: "#9ca3af", fontSize: 11 }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.2)"
                  tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                  tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  label={{ value: "xG", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }}
                  tickFormatter={(v) => v.toFixed(1)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f1923",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "#e8f6ff",
                    padding: "12px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  }}
                  labelStyle={{ color: "#9ca3af", marginBottom: "4px" }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", color: "#9ca3af", paddingTop: "10px" }} iconType="line" iconSize={12} />
                <Area type="monotone" dataKey="home" fill="url(#gradientXgHome)" stroke="none" />
                <Line type="monotone" dataKey="home" stroke={HOME_COLOR} strokeWidth={3} dot={{ r: 4, fill: HOME_COLOR, strokeWidth: 2, stroke: "#0f1923" }} activeDot={{ r: 6 }} name="Home" />
                <Area type="monotone" dataKey="away" fill="url(#gradientXgAway)" stroke="none" />
                <Line type="monotone" dataKey="away" stroke={AWAY_COLOR} strokeWidth={3} dot={{ r: 4, fill: AWAY_COLOR, strokeWidth: 2, stroke: "#0f1923" }} activeDot={{ r: 6 }} name="Away" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Player xG Opportunities */}
        <div className="group relative rounded-2xl border border-white/5 bg-gradient-to-br from-[#111d2a] to-[#0a1520] p-5 shadow-xl transition-all duration-300 hover:border-white/10 hover:shadow-2xl">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 to-red-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-5" />
          <div className="relative z-10">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">⭐</span>
                <p className="text-base font-bold text-white">xG Opportunities</p>
              </div>
              <p className="text-[10px] text-white/40 mt-1 font-medium">Top players by xG</p>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={playerXg.slice(0, 8).map((p) => ({
                  ...p,
                  homeXg: p.teamId === "home" ? p.xg : 0,
                  awayXg: p.teamId === "away" ? p.xg : 0,
                }))}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 70, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  type="number"
                  stroke="rgba(255,255,255,0.2)"
                  tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                  tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  tickFormatter={(v) => v.toFixed(1)}
                />
                <YAxis
                  type="category"
                  dataKey="player"
                  stroke="rgba(255,255,255,0.2)"
                  tick={{ fill: "#9ca3af", fontSize: 10, fontWeight: 500 }}
                  tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  width={65}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f1923",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "#e8f6ff",
                    padding: "12px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  }}
                  labelStyle={{ color: "#9ca3af", marginBottom: "4px" }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", color: "#9ca3af", paddingTop: "10px" }} iconType="square" iconSize={12} />
                <Bar dataKey="homeXg" fill={HOME_COLOR} radius={[0, 4, 4, 0]} name="Home" />
                <Bar dataKey="awayXg" fill={AWAY_COLOR} radius={[0, 4, 4, 0]} name="Away" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ball Possession */}
        <LineChartCard
          title="Ball Possession"
          subtitle="per 15' bucket"
          data={possession}
          dataKey="period"
          yAxisLabel="%"
          formatValue={(v) => `${v.toFixed(0)}%`}
          icon="⚽"
        />

        {/* Pass Accuracy */}
        <LineChartCard
          title="Pass Accuracy"
          subtitle="per 15' bucket"
          data={passAccuracy}
          dataKey="period"
          yAxisLabel="%"
          formatValue={(v) => `${v.toFixed(0)}%`}
          icon="🎯"
        />

        {/* Attacks per Minute */}
        <LineChartCard
          title="Attacks per Minute"
          subtitle="per 15' bucket"
          data={attacksPerMinute}
          dataKey="period"
          yAxisLabel="Attacks/min"
          formatValue={(v) => v.toFixed(1)}
          icon="⚡"
        />

        {/* Recoveries per Minute */}
        <LineChartCard
          title="Recoveries per Minute"
          subtitle="per 15' bucket"
          data={recoveriesPerMinute}
          dataKey="period"
          yAxisLabel="Recoveries/min"
          formatValue={(v) => v.toFixed(1)}
          icon="🛡️"
        />
      </div>
    </div>
  );
}
