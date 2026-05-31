"use client";

import { useEffect, useMemo, useState } from "react";
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

type Analytics = {
  xg: { home: number; away: number };
  possession: { home: number; away: number };
  shots: {
    home: { total: number; onTarget: number; goals: number };
    away: { total: number; onTarget: number; goals: number };
  };
  ppda: { home: number; away: number };
  highRegains: { home: number; away: number };
  progressivePasses: { home: number; away: number };
  xa: { home: number; away: number };
  passAccuracy: { home: number; away: number };
  events: {
    total: number;
    touchesHome: number;
    touchesAway: number;
    passesHomeSuccess: number;
    passesAwaySuccess: number;
  };
};

type SelectedView = "summary" | "shotQuality" | "pressing";
type TeamFilter = "both" | "home" | "away";

export default function MatchComparisonPage() {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [selectedView, setSelectedView] = useState<SelectedView>("summary");
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("both");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [, setLoading] = useState(true);

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
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, []);

  const selectedMatch = useMemo(
    () => matches.find((m) => m.slug === selectedMatchId) ?? null,
    [matches, selectedMatchId]
  );

  useEffect(() => {
    if (!selectedMatch) {
      setAnalytics(null);
      setAnalyticsError(null);
      return;
    }
    let cancelled = false;
    setLoadingAnalytics(true);
    setAnalyticsError(null);
    (async () => {
      try {
        const res = await fetch(`/api/matches/${selectedMatch.id}/analytics`);
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !data?.ok) {
          setAnalytics(null);
          setAnalyticsError(data?.message || t("failedToLoadAnalytics") || "Failed to load analytics");
          return;
        }
        setAnalytics(data.analytics as Analytics);
      } catch {
        if (!cancelled) {
          setAnalytics(null);
          setAnalyticsError(t("failedToLoadAnalytics") || "Failed to load analytics");
        }
      } finally {
        if (!cancelled) setLoadingAnalytics(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedMatch, t]);

  function pickSide<T>(home: T, away: T, both: (h: T, a: T) => string): string {
    if (teamFilter === "home") return formatNumber(home);
    if (teamFilter === "away") return formatNumber(away);
    return both(home, away);
  }

  function formatNumber(n: unknown): string {
    if (n === null || n === undefined) return "—";
    if (typeof n === "number") {
      if (Number.isInteger(n)) return n.toString();
      return (Math.round(n * 100) / 100).toString();
    }
    return String(n);
  }

  function bothLabel<T>(home: T, away: T): string {
    return `${formatNumber(home)} - ${formatNumber(away)}`;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-900/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            {t("matchComparison")}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t("matchComparisonDescription")}</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-8">
        <div className="mb-8 rounded-xl border border-slate-200/80 dark:border-slate-800/50 bg-gradient-to-br from-white dark:from-slate-900/30 via-slate-50/30 dark:via-slate-950/30 to-white dark:to-slate-950/30 p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Match</label>
                <div className="relative">
                  <select
                    value={selectedMatchId}
                    onChange={(e) => setSelectedMatchId(e.target.value)}
                    className="h-12 w-64 appearance-none rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 pr-10 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <option value="" className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                      Select match
                    </option>
                    {matches.map((match) => {
                      const homeName = getTeamName(match.homeTeam, match.homeTeamName);
                      const awayName = getTeamName(match.awayTeam, match.awayTeamName);
                      return (
                        <option
                          key={match.id}
                          value={match.slug}
                          className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        >
                          {homeName} {t("vs")} {awayName} - {match.competition || t("match")}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t("view")}</label>
                <div className="relative">
                  <select
                    value={selectedView}
                    onChange={(e) => setSelectedView(e.target.value as SelectedView)}
                    className="h-12 w-48 appearance-none rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 pr-10 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <option value="summary" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {t("summary")}
                    </option>
                    <option value="shotQuality" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {t("shotQuality")}
                    </option>
                    <option value="pressing" className="bg-slate-900 text-white">
                      {t("pressing")}
                    </option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTeamFilter(teamFilter === "home" ? "both" : "home")}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                  teamFilter === "home"
                    ? "border-emerald-500/70 bg-emerald-500/30 text-emerald-200"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                {t("home")}
              </button>
              <button
                type="button"
                onClick={() => setTeamFilter(teamFilter === "away" ? "both" : "away")}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                  teamFilter === "away"
                    ? "border-emerald-500/70 bg-emerald-500/30 text-emerald-200"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                {t("away")}
              </button>
            </div>
          </div>
        </div>

        {/* Top row: xG / Shot quality */}
        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] mb-6">
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
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedMatch ? `${selectedView}` : t("selectMatchToViewPhases")}
                  </p>
                </div>
              </div>
            </div>
            <div className="min-h-[200px] flex items-center justify-center">
              {!selectedMatch ? (
                <p className="text-sm text-slate-500 text-center">{t("selectMatchFromDropdown")}</p>
              ) : loadingAnalytics ? (
                <p className="text-sm text-slate-500 text-center">{t("loading")}</p>
              ) : analyticsError ? (
                <p className="text-sm text-red-400 text-center">{analyticsError}</p>
              ) : analytics ? (
                <div className="text-center">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">{t("xg")}</p>
                  <p className="text-3xl font-bold text-white">
                    {pickSide(analytics.xg.home, analytics.xg.away, bothLabel)}
                  </p>
                  <Link
                    href={`/matches/${selectedMatch.slug}`}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-500"
                  >
                    {t("viewMatchAnalytics")}
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center">—</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/20 p-2">
                <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">{t("shotQualitySummary")}</h3>
            </div>
            <div className="min-h-[200px] flex flex-col items-center justify-center gap-3 text-sm text-slate-300">
              {!selectedMatch ? (
                <p className="text-sm text-slate-500 text-center">{t("selectMatchToViewShotQuality")}</p>
              ) : loadingAnalytics ? (
                <p className="text-sm text-slate-500">{t("loading")}</p>
              ) : analyticsError ? (
                <p className="text-sm text-red-400">{analyticsError}</p>
              ) : analytics ? (
                <div className="grid grid-cols-2 gap-4 text-center w-full">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">{t("shotsTotal") || "Shots"}</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {pickSide(analytics.shots.home.total, analytics.shots.away.total, bothLabel)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                      {t("shotsOnTarget") || "On target"}
                    </p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {pickSide(analytics.shots.home.onTarget, analytics.shots.away.onTarget, bothLabel)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">{t("goals")}</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {pickSide(analytics.shots.home.goals, analytics.shots.away.goals, bothLabel)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">{t("xa") || "xA"}</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {pickSide(analytics.xa.home, analytics.xa.away, bothLabel)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">—</p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom row: Pressing / High regains / Transitions */}
        <div className="grid gap-6 md:grid-cols-3">
          <MetricCard
            title={t("pressingIntensityPPDA")}
            iconColor="text-red-400"
            bgColor="bg-red-500/20"
            iconPath="M13 10V3L4 14h7v7l9-11h-7z"
            empty={!selectedMatch}
            loading={loadingAnalytics}
            error={analyticsError}
            placeholderText={t("selectMatchToViewPressingMetrics")}
            value={
              analytics
                ? pickSide(analytics.ppda.home, analytics.ppda.away, bothLabel)
                : null
            }
            label={t("ppda") || "PPDA"}
          />
          <MetricCard
            title={t("highRegainsLabel")}
            iconColor="text-purple-400"
            bgColor="bg-purple-500/20"
            iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            empty={!selectedMatch}
            loading={loadingAnalytics}
            error={analyticsError}
            placeholderText={t("selectMatchToViewRegainMetrics")}
            value={
              analytics
                ? pickSide(analytics.highRegains.home, analytics.highRegains.away, bothLabel)
                : null
            }
            label={t("highRegainsLabel")}
          />
          <MetricCard
            title={t("transitions")}
            iconColor="text-cyan-400"
            bgColor="bg-cyan-500/20"
            iconPath="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            empty={!selectedMatch}
            loading={loadingAnalytics}
            error={analyticsError}
            placeholderText={t("selectMatchToViewTransitionMetrics")}
            value={
              analytics
                ? pickSide(
                    analytics.progressivePasses.home,
                    analytics.progressivePasses.away,
                    bothLabel
                  )
                : null
            }
            label={t("progressivePasses") || "Progressive passes"}
          />
        </div>
      </main>
    </div>
  );
}

function MetricCard({
  title,
  iconColor,
  bgColor,
  iconPath,
  empty,
  loading,
  error,
  placeholderText,
  value,
  label,
}: {
  title: string;
  iconColor: string;
  bgColor: string;
  iconPath: string;
  empty: boolean;
  loading: boolean;
  error: string | null;
  placeholderText: string;
  value: string | null;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className={`rounded-lg ${bgColor} p-2`}>
          <svg className={`h-5 w-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
          </svg>
        </div>
        <h3 className="text-base font-bold text-white">{title}</h3>
      </div>
      <div className="min-h-[150px] flex flex-col items-center justify-center text-center gap-2">
        {empty ? (
          <p className="text-sm text-slate-500">{placeholderText}</p>
        ) : loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : value ? (
          <>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
          </>
        ) : (
          <p className="text-sm text-slate-500">—</p>
        )}
      </div>
    </div>
  );
}
