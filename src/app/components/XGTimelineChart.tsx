"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface XGTimelineData {
  minute: number;
  home: number;
  away: number;
}

interface XGTimelineChartProps {
  data: XGTimelineData[];
  homeTeamName: string;
  awayTeamName: string;
}

export function XGTimelineChart({ data, homeTeamName, awayTeamName }: XGTimelineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-[11px] text-slate-400">
        Δεν υπάρχουν δεδομένα xG. Προσθέστε events για να δείτε το χρονοδιάγραμμα.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis 
            dataKey="minute" 
            stroke="#64748b"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            label={{ value: "Minute", position: "insideBottom", offset: -5, fill: "#94a3b8", fontSize: 11 }}
          />
          <YAxis 
            stroke="#64748b"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            label={{ value: "xG", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 11 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "#0f172a", 
              border: "1px solid #1e293b",
              borderRadius: "6px",
              fontSize: "11px",
              color: "#e2e8f0"
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
          />
          <Line 
            type="monotone" 
            dataKey="home" 
            name={homeTeamName}
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ r: 3, fill: "#10b981" }}
            activeDot={{ r: 5 }}
          />
          <Line 
            type="monotone" 
            dataKey="away" 
            name={awayTeamName}
            stroke="#0ea5e9" 
            strokeWidth={2}
            dot={{ r: 3, fill: "#0ea5e9" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

