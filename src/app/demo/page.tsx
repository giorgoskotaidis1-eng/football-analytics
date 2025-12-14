"use client";

import { useState } from "react";
import Link from "next/link";
import { PlayerRadarChart } from "@/app/components/PlayerRadarChart";
import { Heatmap } from "@/app/components/Heatmap";
import { XGTimelineChart } from "@/app/components/XGTimelineChart";
import { ShotMapChart } from "@/app/components/ShotMapChart";

// Sample data για showcase
const samplePlayers = [
  {
    id: 1,
    name: "Γιάννης Παπαδόπουλος",
    position: "FW",
    age: 25,
    number: 9,
    team: { id: 1, name: "Καλαμάτες" },
    matches: 15,
    minutes: 1280,
    goals: 12,
    assists: 5,
    shots: 45,
    shotsOnTarget: 28,
    totalXG: 11.2,
    averageXG: 0.25,
    xA: 4.8,
    passes: 320,
    successfulPasses: 280,
    passAccuracy: 87.5,
    touches: 450,
    goalsPer90: 0.84,
    assistsPer90: 0.35,
    shotsPer90: 3.16,
    xGPer90: 0.79,
    xAPer90: 0.34,
    passesPer90: 22.5,
    touchesPer90: 31.6,
    radarMetrics: {
      shooting: 85,
      creativity: 72,
      passing: 78,
      involvement: 82,
      efficiency: 88,
    },
  },
  {
    id: 2,
    name: "Μάρκος Αντωνίου",
    position: "MF",
    age: 28,
    number: 10,
    team: { id: 1, name: "Καλαμάτες" },
    matches: 15,
    minutes: 1320,
    goals: 4,
    assists: 8,
    shots: 25,
    shotsOnTarget: 12,
    totalXG: 3.8,
    averageXG: 0.15,
    xA: 7.2,
    passes: 580,
    successfulPasses: 520,
    passAccuracy: 89.7,
    touches: 720,
    goalsPer90: 0.27,
    assistsPer90: 0.55,
    shotsPer90: 1.70,
    xGPer90: 0.26,
    xAPer90: 0.49,
    passesPer90: 39.5,
    touchesPer90: 49.1,
    radarMetrics: {
      shooting: 45,
      creativity: 92,
      passing: 95,
      involvement: 98,
      efficiency: 85,
    },
  },
  {
    id: 3,
    name: "Νίκος Γεωργίου",
    position: "DF",
    age: 30,
    number: 4,
    team: { id: 1, name: "Καλαμάτες" },
    matches: 15,
    minutes: 1350,
    goals: 1,
    assists: 2,
    shots: 8,
    shotsOnTarget: 3,
    totalXG: 0.8,
    averageXG: 0.10,
    xA: 1.5,
    passes: 420,
    successfulPasses: 380,
    passAccuracy: 90.5,
    touches: 580,
    goalsPer90: 0.07,
    assistsPer90: 0.13,
    shotsPer90: 0.53,
    xGPer90: 0.05,
    xAPer90: 0.10,
    passesPer90: 28.0,
    touchesPer90: 38.7,
    radarMetrics: {
      shooting: 20,
      creativity: 35,
      passing: 88,
      involvement: 75,
      efficiency: 92,
    },
  },
];

const sampleMatch = {
  id: 1,
  slug: "demo-match",
  competition: "Super League",
  date: new Date().toISOString(),
  homeTeam: { id: 1, name: "Καλαμάτες" },
  awayTeam: { id: 2, name: "ΠαΟΝΕ" },
  scoreHome: 3,
  scoreAway: 1,
  xgHome: 2.8,
  xgAway: 1.2,
  shotsHome: 18,
  shotsAway: 8,
  possessionHome: 62,
  possessionAway: 38,
};

const sampleAnalytics = {
  xg: { home: 2.8, away: 1.2 },
  possession: { home: 62, away: 38 },
  shots: {
    home: { total: 18, onTarget: 12, goals: 3, totalXG: 2.8, averageXG: 0.16, conversionRate: 16.7 },
    away: { total: 8, onTarget: 4, goals: 1, totalXG: 1.2, averageXG: 0.15, conversionRate: 12.5 },
  },
  heatmaps: {
    home: [
      [50, 30, 15], [55, 35, 20], [60, 40, 25], [65, 45, 30],
      [50, 50, 35], [55, 55, 40], [60, 60, 45], [45, 50, 30],
    ],
    away: [
      [50, 70, 10], [45, 65, 15], [40, 60, 20], [35, 55, 15],
      [50, 50, 25], [45, 45, 20], [40, 40, 15], [35, 35, 10],
    ],
  },
  shotMaps: {
    home: [
      { x: 75, y: 20, xg: 0.8, outcome: "goal" as const, team: "home" as const, playerName: "Γιάννης Παπαδόπουλος", minute: 12 },
      { x: 80, y: 25, xg: 0.6, outcome: "saved" as const, team: "home" as const, playerName: "Μάρκος Αντωνίου", minute: 28 },
      { x: 70, y: 30, xg: 0.4, outcome: "off_target" as const, team: "home" as const, playerName: "Γιάννης Παπαδόπουλος", minute: 45 },
      { x: 85, y: 15, xg: 0.9, outcome: "goal" as const, team: "home" as const, playerName: "Γιάννης Παπαδόπουλος", minute: 52 },
      { x: 78, y: 22, xg: 0.5, outcome: "saved" as const, team: "home" as const, playerName: "Μάρκος Αντωνίου", minute: 67 },
      { x: 72, y: 28, xg: 0.3, outcome: "blocked" as const, team: "home" as const, playerName: "Γιάννης Παπαδόπουλος", minute: 71 },
      { x: 82, y: 18, xg: 0.75, outcome: "goal" as const, team: "home" as const, playerName: "Γιάννης Παπαδόπουλος", minute: 78 },
    ],
    away: [
      { x: 25, y: 80, xg: 0.5, outcome: "saved" as const, team: "away" as const, playerName: "Αντίπαλος", minute: 35 },
      { x: 30, y: 75, xg: 0.4, outcome: "off_target" as const, team: "away" as const, playerName: "Αντίπαλος", minute: 58 },
      { x: 20, y: 85, xg: 0.7, outcome: "goal" as const, team: "away" as const, playerName: "Αντίπαλος", minute: 35 },
    ],
  },
};

const sampleEvents = [
  { minute: 12, type: "goal", team: "home", player: "Γιάννης Παπαδόπουλος", xG: 0.8 },
  { minute: 28, type: "shot", team: "home", player: "Μάρκος Αντωνίου", xG: 0.6 },
  { minute: 35, type: "goal", team: "away", player: "Αντίπαλος Παίκτης", xG: 0.7 },
  { minute: 52, type: "goal", team: "home", player: "Γιάννης Παπαδόπουλος", xG: 0.9 },
  { minute: 67, type: "shot", team: "home", player: "Μάρκος Αντωνίου", xG: 0.5 },
  { minute: 78, type: "goal", team: "home", player: "Γιάννης Παπαδόπουλος", xG: 0.85 },
];

type DemoSection = "overview" | "players" | "match" | "analytics" | "comparison";

export default function DemoPage() {
  const [activeSection, setActiveSection] = useState<DemoSection>("overview");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Football Analytics - Demo</h1>
            <p className="text-[11px] text-slate-400">Showcase των δυνατοτήτων</p>
          </div>
          <Link
            href="/"
            className="rounded-md bg-slate-800 px-4 py-2 text-[11px] font-medium text-slate-200 hover:bg-slate-700 transition"
          >
            ← Back to App
          </Link>
        </div>
      </header>

      {/* Navigation Tabs - iPad Optimized */}
      <div className="border-b border-slate-800 bg-slate-900/30">
        <div className="flex overflow-x-auto px-4">
          {[
            { id: "overview" as DemoSection, label: "📊 Overview", icon: "📊" },
            { id: "players" as DemoSection, label: "👥 Players", icon: "👥" },
            { id: "match" as DemoSection, label: "⚽ Match Analysis", icon: "⚽" },
            { id: "analytics" as DemoSection, label: "📈 Analytics", icon: "📈" },
            { id: "comparison" as DemoSection, label: "🔄 Comparison", icon: "🔄" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`min-w-[120px] px-4 py-3 text-[12px] font-medium transition border-b-2 ${
                activeSection === tab.id
                  ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label.replace(/[📊👥⚽📈🔄]/g, "").trim()}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 space-y-6">
        {/* Overview Section */}
        {activeSection === "overview" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">🎯 Football Analytics Platform</h2>
              <p className="text-sm text-slate-300 mb-6">
                Professional analytics platform για προπονητές, scouts και analysts. 
                Παρόμοιο με Wyscout, Instat, StepOut.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <div className="text-2xl font-bold text-emerald-400">15</div>
                  <div className="text-[11px] text-slate-400 mt-1">Matches</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <div className="text-2xl font-bold text-emerald-400">25</div>
                  <div className="text-[11px] text-slate-400 mt-1">Players</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <div className="text-2xl font-bold text-purple-400">2</div>
                  <div className="text-[11px] text-slate-400 mt-1">Teams</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <div className="text-2xl font-bold text-yellow-400">12</div>
                  <div className="text-[11px] text-slate-400 mt-1">Goals</div>
                </div>
              </div>

              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <h3 className="text-sm font-semibold text-white mb-2">✨ Key Features</h3>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    <li>• Player Comparison & Analytics</li>
                    <li>• Match Analysis & xG Tracking</li>
                    <li>• Heatmaps & Shot Maps</li>
                    <li>• Team Performance Metrics</li>
                    <li>• Offline Support (PWA)</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <h3 className="text-sm font-semibold text-white mb-2">📱 iPad Optimized</h3>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    <li>• Touch-friendly interface</li>
                    <li>• Offline functionality</li>
                    <li>• Install as PWA</li>
                    <li>• Responsive design</li>
                    <li>• Professional UI/UX</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Players Section */}
        {activeSection === "players" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">👥 Player Analytics</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {samplePlayers.map((player) => (
                  <div key={player.id} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-lg font-bold text-emerald-400">
                        {player.number}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{player.name}</h3>
                        <p className="text-[10px] text-slate-400">{player.position} • {player.team.name}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400">Goals:</span>
                        <span className="ml-2 font-semibold text-emerald-400">{player.goals}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Assists:</span>
                        <span className="ml-2 font-semibold text-emerald-400">{player.assists}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">xG:</span>
                        <span className="ml-2 font-semibold text-purple-400">{player.totalXG.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Pass Acc:</span>
                        <span className="ml-2 font-semibold text-yellow-400">{player.passAccuracy.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Match Section */}
        {activeSection === "match" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {sampleMatch.homeTeam.name} vs {sampleMatch.awayTeam.name}
                  </h2>
                  <p className="text-[11px] text-slate-400">{sampleMatch.competition}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-400">
                    {sampleMatch.scoreHome} - {sampleMatch.scoreAway}
                  </div>
                  <div className="text-[10px] text-slate-400">Full Time</div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <div className="text-[11px] text-slate-400 mb-1">xG</div>
                  <div className="text-lg font-semibold text-emerald-400">
                    {sampleMatch.xgHome.toFixed(2)} - {sampleMatch.xgAway.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <div className="text-[11px] text-slate-400 mb-1">Possession</div>
                  <div className="text-lg font-semibold text-emerald-400">
                    {sampleMatch.possessionHome}% - {sampleMatch.possessionAway}%
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <div className="text-[11px] text-slate-400 mb-1">Shots</div>
                  <div className="text-lg font-semibold text-purple-400">
                    {sampleMatch.shotsHome} - {sampleMatch.shotsAway}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Key Events</h3>
                <div className="space-y-2">
                  {sampleEvents.map((event, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-[11px]">
                      <span className="font-semibold text-slate-400 w-12">{event.minute}'</span>
                      <span className={`px-2 py-1 rounded text-[10px] font-medium ${
                        event.type === "goal" ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {event.type === "goal" ? "⚽ Goal" : "🎯 Shot"}
                      </span>
                      <span className="text-slate-300">{event.player}</span>
                      <span className="ml-auto text-slate-500">xG: {event.xG.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Section */}
        {activeSection === "analytics" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">📈 Advanced Analytics</h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Heatmap - {sampleMatch.homeTeam.name}</h3>
                  <div className="h-80">
                    <Heatmap data={sampleAnalytics.heatmaps.home} team="home" teamName={sampleMatch.homeTeam.name} width={600} height={320} />
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">xG Timeline</h3>
                  <div className="h-64">
                    <XGTimelineChart events={sampleEvents} />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Shot Map</h3>
                <div>
                  <ShotMapChart 
                    shots={[...sampleAnalytics.shotMaps.home, ...sampleAnalytics.shotMaps.away]} 
                    homeTeamName={sampleMatch.homeTeam.name} 
                    awayTeamName={sampleMatch.awayTeam.name} 
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comparison Section */}
        {activeSection === "comparison" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">🔄 Player Comparison</h2>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <PlayerRadarChart players={samplePlayers.slice(0, 2)} />
              </div>
              
              <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950 p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Stats Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="px-3 py-2 text-left text-slate-400">Stat</th>
                        {samplePlayers.slice(0, 2).map((p) => (
                          <th key={p.id} className="px-3 py-2 text-center text-slate-400">{p.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "Goals", key: "goals" },
                        { label: "Assists", key: "assists" },
                        { label: "xG", key: "totalXG", format: (v: number) => v.toFixed(2) },
                        { label: "xA", key: "xA", format: (v: number) => v.toFixed(2) },
                        { label: "Pass Accuracy", key: "passAccuracy", format: (v: number) => `${v.toFixed(1)}%` },
                        { label: "Shots", key: "shots" },
                      ].map((stat) => (
                        <tr key={stat.key} className="border-b border-slate-800/50">
                          <td className="px-3 py-2 text-slate-300">{stat.label}</td>
                          {samplePlayers.slice(0, 2).map((player) => (
                            <td key={player.id} className="px-3 py-2 text-center text-white">
                              {stat.format 
                                ? stat.format((player as any)[stat.key])
                                : (player as any)[stat.key]
                              }
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50 px-4 py-3 mt-8">
        <p className="text-center text-[11px] text-slate-400">
          Football Analytics Platform - Demo Version • Optimized for iPad
        </p>
      </footer>
    </div>
  );
}

