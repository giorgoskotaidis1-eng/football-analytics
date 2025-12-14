"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

type Match = {
  id: number;
  slug: string;
  competition: string;
  date: string;
  homeTeam: { name: string } | null;
  awayTeam: { name: string } | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
};

export default function MatchComparisonPage() {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Helper function to safely get team name
  function getTeamName(team: { name: string } | null | undefined, teamName: string | null | undefined): string {
    if (team?.name) return team.name;
    if (teamName) return teamName;
    return t("unknown");
  }

  useEffect(() => {
    async function fetchMatches() {
      try {
        const res = await fetch("/api/matches");
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.matches)) {
            // Ensure all matches have safe team data
            const safeMatches = data.matches.map((match: any) => ({
              ...match,
              homeTeam: match.homeTeam || null,
              awayTeam: match.awayTeam || null,
              homeTeamName: match.homeTeamName || null,
              awayTeamName: match.awayTeamName || null,
            }));
            setMatches(safeMatches);
          }
        }
      } catch {
        // ignore errors
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Professional Header */}
      <header className="border-b border-slate-200 dark:border-slate-900/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">{t("matchComparison")}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("matchComparisonDescription")}
          </p>
        </div>
      </header>

      {/* Main Content */}
        <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-8">
        {/* Controls Panel */}
        <div className="mb-8 rounded-xl border border-slate-200/80 dark:border-slate-800/50 bg-gradient-to-br from-white dark:from-slate-900/30 via-slate-50/30 dark:via-slate-950/30 to-white dark:to-slate-950/30 p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Match
                </label>
                <div className="relative">
                  <select
                    value={selectedMatchId}
                    onChange={(e) => setSelectedMatchId(e.target.value)}
                    className="h-12 w-64 appearance-none rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 pr-10 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <option value="" className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400">Select match</option>
                    {matches.map((match) => {
                      const homeName = getTeamName(match.homeTeam, match.homeTeamName);
                      const awayName = getTeamName(match.awayTeam, match.awayTeamName);
                      return (
                        <option key={match.id} value={match.slug} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          {homeName} {t("vs")} {awayName} - {match.competition || t("match")}
                        </option>
                      );
                    })}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                    <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t("view")}
                </label>
                <div className="relative">
                  <select className="h-12 w-48 appearance-none rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 pr-10 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-300 dark:hover:border-slate-700">
                    <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t("summary")}</option>
                    <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t("shotQuality")}</option>
                    <option className="bg-slate-900 text-white">{t("pressing")}</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                    <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/20">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                {t("home")}
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/20">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                {t("away")}
              </button>
            </div>
          </div>
        </div>

        {/* Analytics Cards Grid */}
        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] mb-6">
          {/* xG Timeline Card */}
          <div className="rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/20 p-2">
                  <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{t("xgTimeline")}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{t("selectMatchToViewPhases")}</p>
                </div>
              </div>
            </div>
            <div className="min-h-[200px] flex items-center justify-center">
              {!selectedMatchId ? (
                <p className="text-sm text-slate-500 text-center">
{t("selectMatchFromDropdown")}
                </p>
              ) : (
                <Link
                  href={`/matches/${selectedMatchId}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-500 hover:scale-105"
                >
{t("viewMatchAnalytics")}
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          </div>

          {/* Shot Quality Card */}
          <div className="rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/20 p-2">
                <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t("shotQualitySummary")}</h3>
              </div>
            </div>
            <div className="min-h-[200px] flex items-center justify-center">
              {!selectedMatchId ? (
                <p className="text-sm text-slate-500 text-center">
{t("selectMatchToViewShotQuality")}
                </p>
              ) : (
                <div className="text-center space-y-3">
                  <p className="text-sm text-slate-400">
                    {t("shotQualityDataWillBeDisplayed")}
                  </p>
                  <Link
                    href={`/matches/${selectedMatchId}`}
                    className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition"
                  >
                    {t("addMatchEvents")}
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Pressing Intensity Card */}
          <div className="rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-red-500/20 p-2">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t("pressingIntensityPPDA")}</h3>
              </div>
            </div>
            <div className="min-h-[150px] flex items-center">
              {!selectedMatchId ? (
                <p className="text-sm text-slate-500">
                  {t("selectMatchToViewPressingMetrics")}
                </p>
              ) : (
                <p className="text-sm text-slate-400">
                  {t("pressingDataWillAppear")}
                </p>
              )}
            </div>
          </div>

          {/* High Regains Card */}
          <div className="rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/20 p-2">
                <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t("highRegainsLabel")}</h3>
              </div>
            </div>
            <div className="min-h-[150px] flex items-center">
              {!selectedMatchId ? (
                <p className="text-sm text-slate-500">
                  {t("selectMatchToViewRegainMetrics")}
                </p>
              ) : (
                <p className="text-sm text-slate-400">
                  {t("highRegainsDataWillAppear")}
                </p>
              )}
            </div>
          </div>

          {/* Transitions Card */}
          <div className="rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-cyan-500/20 p-2">
                <svg className="h-5 w-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t("transitions")}</h3>
              </div>
            </div>
            <div className="min-h-[150px] flex items-center">
              {!selectedMatchId ? (
                <p className="text-sm text-slate-500">
                  {t("selectMatchToViewTransitionMetrics")}
                </p>
              ) : (
                <p className="text-sm text-slate-400">
                  {t("transitionDataWillAppear")}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}