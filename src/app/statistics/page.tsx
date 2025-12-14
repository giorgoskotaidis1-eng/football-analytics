"use client";

import { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import { ExportModal } from "@/app/components/ExportModal";
import { useTranslation } from "@/lib/i18n";

type SeasonStats = {
  season: string;
  matches: number;
  totalGoals: number;
  totalXG: number;
  totalShots: number;
  totalAssists: number;
  avgGoalsPerMatch: number;
  avgXGPerMatch: number;
  topScorers: Array<{
    id: number;
    name: string;
    position: string;
    goals: number;
    assists: number;
    xg: number;
    shots: number;
    matches: number;
  }>;
  topAssists: Array<{
    id: number;
    name: string;
    position: string;
    goals: number;
    assists: number;
    xg: number;
    shots: number;
    matches: number;
  }>;
  topXG: Array<{
    id: number;
    name: string;
    position: string;
    goals: number;
    assists: number;
    xg: number;
    shots: number;
    matches: number;
  }>;
  teams: Array<{
    id: number;
    name: string;
    matches: number;
    goals: number;
    xg: number;
  }>;
};

type Summary = {
  totalSeasons: number;
  totalMatches: number;
  totalGoals: number;
  totalXG: number;
};

export default function StatisticsPage() {
  const { t } = useTranslation();
  const [seasons, setSeasons] = useState<SeasonStats[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<string>("All");
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    async function fetchStatistics() {
      setLoading(true);
      try {
        const params = selectedSeason !== "All" ? `?season=${selectedSeason}` : "";
        const res = await fetch(`/api/statistics/season${params}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            setSeasons(data.seasons);
            setSummary(data.summary);
          }
        }
      } catch (err) {
        console.error("Failed to fetch statistics", err);
        toast.error("Failed to load statistics");
      } finally {
        setLoading(false);
      }
    }
    fetchStatistics();
  }, [selectedSeason]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading statistics...</p>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-white dark:bg-slate-950">
        {/* Professional Header */}
        <header className="border-b border-slate-200 dark:border-slate-900/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30">
                  <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">{t("seasonStatistics")}</h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t("statisticsDescription")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    className="h-12 appearance-none rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 pr-10 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <option value="All">{t("allSeasons")}</option>
                    {seasons.map((s) => (
                      <option key={s.season} value={s.season}>
                        {s.season}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                    <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-2 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {t("export")}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-8">
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/50 bg-gradient-to-br from-white dark:from-slate-900/50 via-slate-50/50 dark:via-slate-950/50 to-white dark:to-slate-950/50 p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("totalSeasons")}</p>
                </div>
                <p className="text-3xl font-bold text-white">{summary.totalSeasons}</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/50 bg-gradient-to-br from-white dark:from-slate-900/50 via-slate-50/50 dark:via-slate-950/50 to-white dark:to-slate-950/50 p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("totalMatches")}</p>
                </div>
                <p className="text-3xl font-bold text-white">{summary.totalMatches}</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/50 bg-gradient-to-br from-white dark:from-slate-900/50 via-slate-50/50 dark:via-slate-950/50 to-white dark:to-slate-950/50 p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("totalGoals")}</p>
                </div>
                <p className="text-3xl font-bold text-white">{summary.totalGoals}</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/50 bg-gradient-to-br from-white dark:from-slate-900/50 via-slate-50/50 dark:via-slate-950/50 to-white dark:to-slate-950/50 p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("totalXg")}</p>
                </div>
                <p className="text-3xl font-bold text-white">{summary.totalXG.toFixed(2)}</p>
              </div>
            </div>
          )}

          {/* Season Details */}
          {seasons.length === 0 ? (
            <div className="rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 shadow-xl overflow-hidden">
              <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-800/50 bg-slate-900/30">
                <h2 className="text-base font-bold text-white">{t("seasonStatistics")}</h2>
              </div>
              <div className="px-6 py-16 text-center">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/50 border border-slate-700">
                    <svg className="h-8 w-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-white">{t("noSeasonStatisticsAvailable")}</p>
                    <p className="text-sm text-slate-400">{t("addMatchesToSeeSeasonStatistics")}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {seasons.map((season) => (
                <div key={season.season} className="rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 shadow-xl overflow-hidden">
                  <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-800/50 bg-slate-900/30">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <h2 className="text-xl font-bold text-white">{t("season")} {season.season}</h2>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          {season.matches} {t("matches")}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          {season.totalGoals} {t("goals")}
                        </span>
                        <span>{season.avgGoalsPerMatch.toFixed(2)} {t("goalsPerMatch")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Season Overview */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                      <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{t("matches")}</p>
                        <p className="text-2xl font-bold text-white">{season.matches}</p>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{t("totalGoals")}</p>
                        <p className="text-2xl font-bold text-white">{season.totalGoals}</p>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{t("totalXg")}</p>
                        <p className="text-2xl font-bold text-white">{season.totalXG.toFixed(2)}</p>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{t("avgXgPerMatch")}</p>
                        <p className="text-2xl font-bold text-white">{season.avgXGPerMatch.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Top Scorers */}
                    {season.topScorers.length > 0 && (
                      <div>
                        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                          <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          {t("topScorers")}
                        </h3>
                        <div className="rounded-lg border border-slate-800 bg-slate-900/30 overflow-hidden">
                          <div className="overflow-x-auto hide-scrollbar" style={{ overflowY: 'visible' }}>
                            <table className="w-full border-collapse text-sm text-slate-300">
                              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                                <tr>
                                  <th className="px-6 py-4 text-left">
                                    <span className="text-xs font-semibold uppercase tracking-wide">{t("playerName")}</span>
                                  </th>
                                  <th className="px-6 py-4 text-left">
                                    <span className="text-xs font-semibold uppercase tracking-wide">{t("position")}</span>
                                  </th>
                                  <th className="px-6 py-4 text-center">
                                    <span className="text-xs font-semibold uppercase tracking-wide">{t("goals")}</span>
                                  </th>
                                  <th className="px-6 py-4 text-center">
                                    <span className="text-xs font-semibold uppercase tracking-wide">{t("assists")}</span>
                                  </th>
                                  <th className="px-6 py-4 text-center">
                                    <span className="text-xs font-semibold uppercase tracking-wide">{t("xg")}</span>
                                  </th>
                                  <th className="px-6 py-4 text-center">
                                    <span className="text-xs font-semibold uppercase tracking-wide">{t("matches")}</span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {season.topScorers.map((player) => (
                                  <tr key={player.id} className="border-t border-slate-800/50 hover:bg-slate-900/30 transition">
                                    <td className="px-6 py-4 text-white font-medium">{player.name}</td>
                                    <td className="px-6 py-4">
                                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                                        {player.position}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-sm font-bold text-emerald-400">
                                        {player.goals}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-white">{player.assists}</td>
                                    <td className="px-6 py-4 text-center text-white">{player.xg.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-center text-slate-400">{player.matches}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Top Assists */}
                    {season.topAssists.length > 0 && (
                      <div>
                        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                          <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          {t("topAssists")}
                        </h3>
                        <div className="rounded-lg border border-slate-800 bg-slate-900/30 overflow-hidden">
                          <div className="overflow-x-auto hide-scrollbar" style={{ overflowY: 'visible' }}>
                            <table className="w-full border-collapse text-sm text-slate-300">
                              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                                <tr>
                                  <th className="px-6 py-4 text-left">
                                    <span className="text-xs font-semibold uppercase tracking-wide">{t("playerName")}</span>
                                  </th>
                                  <th className="px-6 py-4 text-left">
                                    <span className="text-xs font-semibold uppercase tracking-wide">{t("position")}</span>
                                  </th>
                                  <th className="px-6 py-4 text-center">
                                    <span className="text-xs font-semibold uppercase tracking-wide">{t("assists")}</span>
                                  </th>
                                  <th className="px-6 py-4 text-center">
                                    <span className="text-xs font-semibold uppercase tracking-wide">{t("goals")}</span>
                                  </th>
                                  <th className="px-6 py-4 text-center">
                                    <span className="text-xs font-semibold uppercase tracking-wide">{t("matches")}</span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {season.topAssists.map((player) => (
                                  <tr key={player.id} className="border-t border-slate-800/50 hover:bg-slate-900/30 transition">
                                    <td className="px-6 py-4 text-white font-medium">{player.name}</td>
                                    <td className="px-6 py-4">
                                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                                        {player.position}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-sm font-bold text-emerald-400">
                                        {player.assists}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-white">{player.goals}</td>
                                    <td className="px-6 py-4 text-center text-slate-400">{player.matches}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Teams */}
                    {season.teams.length > 0 && (
                      <div>
                        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                          <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {t("teams")}
                        </h3>
                        <div className="rounded-lg border border-slate-800 bg-slate-900/30 overflow-hidden">
                          <div className="overflow-x-auto hide-scrollbar" style={{ overflowY: 'visible' }}>
                            <table className="w-full border-collapse text-sm text-slate-300">
                              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                                <tr>
                                  <th className="px-6 py-4 text-left">
                                    <span className="text-xs font-semibold uppercase tracking-wide">{t("team")}</span>
                                  </th>
                                  <th className="px-6 py-4 text-center">
                                    <span className="text-xs font-semibold uppercase tracking-wide">{t("matches")}</span>
                                  </th>
                                  <th className="px-6 py-4 text-center">
                                    <span className="text-xs font-semibold uppercase tracking-wide">{t("goals")}</span>
                                  </th>
                                  <th className="px-6 py-4 text-center">
                                    <span className="text-xs font-semibold uppercase tracking-wide">{t("xg")}</span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {season.teams.map((team) => (
                                  <tr key={team.id} className="border-t border-slate-800/50 hover:bg-slate-900/30 transition">
                                    <td className="px-6 py-4 text-white font-medium">{team.name}</td>
                                    <td className="px-6 py-4 text-center text-white">{team.matches}</td>
                                    <td className="px-6 py-4 text-center text-white font-medium">{team.goals}</td>
                                    <td className="px-6 py-4 text-center text-white">{team.xg.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportSuccess={() => {
          toast.success("Export completed!");
        }}
      />
    </>
  );
}
