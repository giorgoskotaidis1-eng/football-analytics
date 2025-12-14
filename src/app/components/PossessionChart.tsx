"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface PossessionChartProps {
  home: number; // percentage 0-100
  away: number; // percentage 0-100
  homeTeamName: string;
  awayTeamName: string;
}

export function PossessionChart({ home, away, homeTeamName, awayTeamName }: PossessionChartProps) {
  const data = [
    { name: homeTeamName, value: home, color: "#10b981" },
    { name: awayTeamName, value: away, color: "#0ea5e9" },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "#0f172a", 
              border: "1px solid #1e293b",
              borderRadius: "6px",
              fontSize: "11px",
              color: "#e2e8f0"
            }}
            formatter={(value: number) => `${value.toFixed(1)}%`}
          />
          <Legend 
            wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

