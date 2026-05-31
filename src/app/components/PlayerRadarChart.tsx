"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";

interface PlayerRadarData {
  name: string;
  shooting: number;
  creativity: number;
  passing: number;
  involvement: number;
  efficiency: number;
}

interface PlayerRadarChartProps {
  players: Array<{
    name: string;
    radarMetrics: {
      shooting: number;
      creativity: number;
      passing: number;
      involvement: number;
      efficiency: number;
    };
  }>;
  mode?: "all" | "attacking" | "passing";
}

export function PlayerRadarChart({ players, mode = "all" }: PlayerRadarChartProps) {
  // Need at least 2 players for comparison
  if (players.length < 2) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-950 p-8 text-center">
        <p className="text-sm text-slate-400">Select at least 2 players to see radar comparison</p>
      </div>
    );
  }

  const axesByMode: Record<"all" | "attacking" | "passing", Array<{ label: string; key: keyof PlayerRadarChartProps["players"][number]["radarMetrics"] }>> = {
    all: [
      { label: "Shooting", key: "shooting" },
      { label: "Creativity", key: "creativity" },
      { label: "Passing", key: "passing" },
      { label: "Involvement", key: "involvement" },
      { label: "Efficiency", key: "efficiency" },
    ],
    attacking: [
      { label: "Shooting", key: "shooting" },
      { label: "Creativity", key: "creativity" },
      { label: "Efficiency", key: "efficiency" },
    ],
    passing: [
      { label: "Passing", key: "passing" },
      { label: "Creativity", key: "creativity" },
      { label: "Involvement", key: "involvement" },
    ],
  };
  const selectedAxes = axesByMode[mode];

  // Prepare data for radar chart. Each row is one axis with a column per player
  // (e.g. { name: "Shooting", player0: 1.2, player1: 0.8 }).
  const radarData: Array<Record<string, number | string>> = selectedAxes.map((axis) => ({
    name: axis.label,
    ...players.reduce((acc, player, idx) => {
      acc[`player${idx}`] = player.radarMetrics[axis.key];
      return acc;
    }, {} as Record<string, number>),
  }));

  const metricKeys = players.map((_, idx) => `player${idx}`);
  const maxMetricValue = Math.max(
    0,
    ...radarData.flatMap((axis) =>
      metricKeys.map((key) => {
        const value = (axis as Record<string, number | string>)[key];
        return typeof value === "number" && Number.isFinite(value) ? value : 0;
      })
    )
  );
  const radarDomainMax =
    maxMetricValue <= 5
      ? 5
      : maxMetricValue <= 10
      ? 10
      : maxMetricValue <= 20
      ? 20
      : maxMetricValue <= 40
      ? 40
      : maxMetricValue <= 60
      ? 60
      : maxMetricValue <= 80
      ? 80
      : 100;

  const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
  const dashPatterns = ["0", "6 4", "3 3", "10 4", "2 2"];
  const fillOpacities = [0.22, 0.16, 0.12, 0.1, 0.08];
  const seriesVisibility = players.map((player, idx) => ({
    name: player.name,
    dataKey: `player${idx}`,
    color: colors[idx % colors.length],
    hasAnyNonZero: Object.values(player.radarMetrics).some((v) => v > 0),
    allZero: Object.values(player.radarMetrics).every((v) => v === 0),
  }));

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-slate-100 mb-1">Performance Radar Comparison</h3>
        <p className="text-[11px] text-slate-400">
          {mode === "attacking"
            ? "Attacking profile"
            : mode === "passing"
            ? "Passing profile"
            : "Multi-dimensional player analysis"}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
          <PolarGrid 
            stroke="#334155" 
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.5}
          />
          <PolarAngleAxis
            dataKey="name"
            tick={{ 
              fill: "#94a3b8", 
              fontSize: 12,
              fontWeight: 500
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, radarDomainMax]}
            tick={{ 
              fill: "#64748b", 
              fontSize: 10
            }}
            tickCount={6}
          />
          {players.map((player, idx) => (
            <Radar
              key={player.name}
              name={player.name}
              dataKey={`player${idx}`}
              stroke={colors[idx % colors.length]}
              fill={colors[idx % colors.length]}
              fillOpacity={fillOpacities[idx % fillOpacities.length]}
              strokeWidth={2.4}
              strokeDasharray={dashPatterns[idx % dashPatterns.length]}
              dot={{ fill: colors[idx % colors.length], r: 3, strokeWidth: 1.5, stroke: "#fff" }}
            />
          ))}
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span className="text-xs text-slate-300 ml-2">{value}</span>
            )}
            content={({ payload }) => (
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {payload?.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-xs text-slate-300">{entry.value}</span>
                  </div>
                ))}
              </div>
            )}
          />
        </RadarChart>
      </ResponsiveContainer>
      <div className={`mt-4 grid gap-2 text-[10px] border-t border-slate-800 pt-4 ${mode === "all" ? "grid-cols-2 md:grid-cols-5" : "grid-cols-3"}`}>
        {selectedAxes.map((axis) => (
          <div key={axis.key} className="text-center">
            <p className="font-medium text-slate-300 mb-0.5">{axis.label}</p>
            <p className="text-slate-500 text-[9px]">
              {axis.key === "shooting"
                ? "Shots/xG/goals blend"
                : axis.key === "creativity"
                ? "xA/assists blend"
                : axis.key === "passing"
                ? "Volume + accuracy"
                : axis.key === "involvement"
                ? "Touches per 90"
                : "On-target/conversion"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

