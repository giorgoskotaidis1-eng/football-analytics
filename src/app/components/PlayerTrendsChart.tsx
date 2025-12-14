"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface TrendData {
  matchId: number;
  date: string;
  opponent: string;
  competition: string;
  goals: number;
  assists: number;
  xg: number;
  xa: number;
  shots: number;
  passes: number;
  touches: number;
}

interface PlayerTrendsChartProps {
  trends: TrendData[];
  metric: "goals" | "assists" | "xg" | "xa" | "shots" | "passes";
  title: string;
}

export function PlayerTrendsChart({ trends, metric, title }: PlayerTrendsChartProps) {
  // Format data for chart
  const chartData = trends.map((trend, idx) => {
    const date = new Date(trend.date);
    const matchLabel = `${date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    })} vs ${trend.opponent}`;

    return {
      match: `Match ${idx + 1}`,
      matchLabel,
      date: date.toISOString(),
      [metric]: trend[metric],
    };
  });

  // Color mapping for different metrics
  const colorMap: Record<string, string> = {
    goals: "#fbbf24", // amber-400
    assists: "#34d399", // emerald-400
    xg: "#34d399", // emerald-400
    xa: "#38bdf8", // sky-400
    shots: "#a78bfa", // violet-400
    passes: "#f472b6", // pink-400
  };

  const color = colorMap[metric] || "#34d399";

  if (trends.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-slate-800 bg-slate-950">
        <p className="text-sm text-slate-500">No match data available</p>
      </div>
    );
  }

  // Calculate average and trend
  const values = chartData.map(d => d[metric] as number);
  const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const maxValue = Math.max(...values, 0);

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950/90 to-slate-900/90 p-4 transition-all hover:border-slate-700 hover:shadow-xl hover:shadow-emerald-500/5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[11px] font-semibold text-slate-200">{title}</p>
          <p className="text-[9px] text-slate-500 mt-0.5">Performance trend</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500">Average</p>
          <p className="text-[11px] font-bold" style={{ color: color }}>
            {average.toFixed(metric === "xg" || metric === "xa" ? 2 : 1)}
          </p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 15, left: -10, bottom: 40 }}
        >
          <defs>
            <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
          <XAxis
            dataKey="match"
            stroke="#64748b"
            tick={{ fill: "#94a3b8", fontSize: 9 }}
            angle={-45}
            textAnchor="end"
            height={50}
            interval={Math.floor(chartData.length / 6)} // Show ~6 labels
          />
          <YAxis
            stroke="#64748b"
            tick={{ fill: "#94a3b8", fontSize: 9 }}
            domain={[0, "auto"]}
            width={35}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: `1px solid ${color}40`,
              borderRadius: "8px",
              fontSize: "11px",
              padding: "8px 12px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
            }}
            labelStyle={{ color: "#cbd5e1", fontWeight: 600, marginBottom: "4px" }}
            formatter={(value: number) => [
              <span key="value" style={{ color, fontWeight: 700 }}>
                {value.toFixed(metric === "xg" || metric === "xa" ? 2 : 0)}
              </span>,
              title
            ]}
            labelFormatter={(label, payload) => {
              if (payload && payload[0]) {
                const data = payload[0].payload as typeof chartData[0];
                return data.matchLabel;
              }
              return label;
            }}
            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: "3 3" }}
          />
          <Line
            type="monotone"
            dataKey={metric}
            stroke={color}
            strokeWidth={2.5}
            dot={{ fill: color, r: 3, strokeWidth: 2, stroke: "#0f172a" }}
            activeDot={{ r: 5, fill: color, stroke: "#0f172a", strokeWidth: 2 }}
            name={title}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-between text-[9px] text-slate-500">
        <span>Max: {maxValue.toFixed(metric === "xg" || metric === "xa" ? 2 : 0)}</span>
        <span>{trends.length} matches</span>
      </div>
    </div>
  );
}

