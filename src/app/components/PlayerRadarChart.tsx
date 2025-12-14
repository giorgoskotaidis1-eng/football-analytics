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
}

export function PlayerRadarChart({ players }: PlayerRadarChartProps) {
  // Need at least 2 players for comparison
  if (players.length < 2) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-950 p-8 text-center">
        <p className="text-sm text-slate-400">Select at least 2 players to see radar comparison</p>
      </div>
    );
  }

  // Prepare data for radar chart
  const radarData: PlayerRadarData[] = [
    {
      name: "Shooting",
      ...players.reduce((acc, player, idx) => {
        acc[`player${idx}`] = player.radarMetrics.shooting;
        return acc;
      }, {} as Record<string, number>),
    },
    {
      name: "Creativity",
      ...players.reduce((acc, player, idx) => {
        acc[`player${idx}`] = player.radarMetrics.creativity;
        return acc;
      }, {} as Record<string, number>),
    },
    {
      name: "Passing",
      ...players.reduce((acc, player, idx) => {
        acc[`player${idx}`] = player.radarMetrics.passing;
        return acc;
      }, {} as Record<string, number>),
    },
    {
      name: "Involvement",
      ...players.reduce((acc, player, idx) => {
        acc[`player${idx}`] = player.radarMetrics.involvement;
        return acc;
      }, {} as Record<string, number>),
    },
    {
      name: "Efficiency",
      ...players.reduce((acc, player, idx) => {
        acc[`player${idx}`] = player.radarMetrics.efficiency;
        return acc;
      }, {} as Record<string, number>),
    },
  ];

  const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-slate-100 mb-1">Performance Radar Comparison</h3>
        <p className="text-[11px] text-slate-400">Multi-dimensional player analysis</p>
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
            domain={[0, 100]}
            tick={{ 
              fill: "#64748b", 
              fontSize: 10
            }}
            tickCount={5}
          />
          {players.map((player, idx) => (
            <Radar
              key={player.name}
              name={player.name}
              dataKey={`player${idx}`}
              stroke={colors[idx % colors.length]}
              fill={colors[idx % colors.length]}
              fillOpacity={0.2}
              strokeWidth={2}
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
      <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] md:grid-cols-5 border-t border-slate-800 pt-4">
        <div className="text-center">
          <p className="font-medium text-slate-300 mb-0.5">Shooting</p>
          <p className="text-slate-500 text-[9px]">Goals per 90</p>
        </div>
        <div className="text-center">
          <p className="font-medium text-slate-300 mb-0.5">Creativity</p>
          <p className="text-slate-500 text-[9px]">Assists per 90</p>
        </div>
        <div className="text-center">
          <p className="font-medium text-slate-300 mb-0.5">Passing</p>
          <p className="text-slate-500 text-[9px]">Pass accuracy %</p>
        </div>
        <div className="text-center">
          <p className="font-medium text-slate-300 mb-0.5">Involvement</p>
          <p className="text-slate-500 text-[9px]">Touches per 90</p>
        </div>
        <div className="text-center">
          <p className="font-medium text-slate-300 mb-0.5">Efficiency</p>
          <p className="text-slate-500 text-[9px]">Shot conversion</p>
        </div>
      </div>
    </div>
  );
}

