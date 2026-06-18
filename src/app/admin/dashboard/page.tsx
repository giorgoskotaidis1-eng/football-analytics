"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";

type Stats = {
  totalPlayers: number;
  onlinePlayers: number;
  totalMatches: number;
  totalTeams: number;
};

type PlayerLogin = {
  isOnline?: boolean;
};

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats>({
    totalPlayers: 0,
    onlinePlayers: 0,
    totalMatches: 0,
    totalTeams: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [playersRes, matchesRes, teamsRes] = await Promise.all([
          fetch("/api/admin/player-logins"),
          fetch("/api/matches?limit=1"),
          fetch("/api/teams"),
        ]);

        if (playersRes.ok) {
          const playersData = (await playersRes.json()) as { ok?: boolean; players?: PlayerLogin[] };
          if (playersData.ok && playersData.players) {
            setStats((prev) => ({
              ...prev,
              totalPlayers: playersData.players.length,
              onlinePlayers: playersData.players.filter((player) => player.isOnline).length,
            }));
          }
        }

        if (matchesRes.ok) {
          const matchesData = (await matchesRes.json()) as { ok?: boolean; matches?: unknown[]; total?: number };
          if (matchesData.ok && matchesData.matches) {
            setStats((prev) => ({
              ...prev,
              totalMatches: matchesData.total || matchesData.matches.length,
            }));
          }
        }

        if (teamsRes.ok) {
          const teamsData = (await teamsRes.json()) as { ok?: boolean; teams?: unknown[] };
          if (teamsData.ok && teamsData.teams) {
            setStats((prev) => ({
              ...prev,
              totalTeams: teamsData.teams.length,
            }));
          }
        }
      } catch (error) {
        console.error("[AdminDashboard] Error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 text-xs text-slate-200">
        <div className="h-96 animate-pulse rounded-xl bg-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs text-slate-200">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 shadow-lg">
            <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Admin</p>
            <h1 className="text-lg font-semibold tracking-tight text-slate-50">{t("adminDashboard")}</h1>
            <p className="text-[11px] text-slate-500">
              {t("overviewOfTeam")}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="group rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-950/40 via-cyan-950/50 to-blue-950/40 p-6 shadow-xl hover:border-blue-500/40 hover:shadow-blue-500/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-medium text-blue-400/90 uppercase tracking-wide">
              {t("totalPlayers")}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border border-blue-500/40 shadow-lg">
              <svg className="h-5 w-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold bg-gradient-to-br from-blue-300 via-cyan-300 to-blue-200 bg-clip-text text-transparent">{stats.totalPlayers}</div>
        </div>

        <div className="group rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-teal-950/50 to-emerald-950/40 p-6 shadow-xl hover:border-emerald-500/40 hover:shadow-emerald-500/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-medium text-emerald-400/90 uppercase tracking-wide">
              {t("onlineNow")}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border border-emerald-500/40 shadow-lg">
              <svg className="h-5 w-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-6.364-9.192a5 5 0 010 7.072m-3.536-3.536a5 5 0 010 7.072" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold bg-gradient-to-br from-emerald-300 via-teal-300 to-emerald-200 bg-clip-text text-transparent">
            {stats.onlinePlayers}
          </div>
        </div>

        <div className="group rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-950/40 via-pink-950/50 to-purple-950/40 p-6 shadow-xl hover:border-purple-500/40 hover:shadow-purple-500/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-medium text-purple-400/90 uppercase tracking-wide">
              {t("totalMatches")}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/40 shadow-lg">
              <svg className="h-5 w-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold bg-gradient-to-br from-purple-300 via-pink-300 to-purple-200 bg-clip-text text-transparent">{stats.totalMatches}</div>
        </div>

        <div className="group rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-950/40 via-orange-950/50 to-amber-950/40 p-6 shadow-xl hover:border-amber-500/40 hover:shadow-amber-500/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-medium text-amber-400/90 uppercase tracking-wide">
              {t("totalTeams")}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/40 shadow-lg">
              <svg className="h-5 w-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold bg-gradient-to-br from-amber-300 via-orange-300 to-amber-200 bg-clip-text text-transparent">{stats.totalTeams}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-950/90 via-slate-900/95 to-slate-950/90 p-6 shadow-xl">
        <h2 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
          <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {t("quickActions")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/admin/player-stats"
            className="group rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-950/40 to-cyan-950/40 p-5 transition-all hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border border-blue-500/40 shadow-lg">
                <svg className="h-6 w-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-blue-200 mb-1">{t("managePlayerStats")}</div>
                <div className="text-[10px] text-blue-400/70">{t("managePlayerStatsDesc")}</div>
              </div>
            </div>
          </a>

          <a
            href="/admin/players"
            className="group rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-teal-950/40 p-5 transition-all hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border border-emerald-500/40 shadow-lg">
                <svg className="h-6 w-6 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-emerald-200 mb-1">{t("playerActivity")}</div>
                <div className="text-[10px] text-emerald-400/70">{t("playerActivityDesc")}</div>
              </div>
            </div>
          </a>

          <a
            href="/admin/matches"
            className="group rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-950/40 to-pink-950/40 p-5 transition-all hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/40 shadow-lg">
                <svg className="h-6 w-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-purple-200 mb-1">{t("matchesAnalysis")}</div>
                <div className="text-[10px] text-purple-400/70">{t("matchesAnalysisDesc")}</div>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

