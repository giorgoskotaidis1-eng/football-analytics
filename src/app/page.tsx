"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  scoreHome: number | null;
  scoreAway: number | null;
};

type Team = {
  id: number;
  name: string;
  slug: string;
};

type Player = {
  id: number;
  name: string;
  position: string | null;
  slug: string;
};

export default function Page() {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Fix hydration mismatch: only fetch data after client mount
  useEffect(() => {
    setMounted(true);
    
    async function fetchData() {
      try {
        // First check if user is authenticated
        const userRes = await fetch("/api/account/me");
        if (!userRes.ok) {
          // Not authenticated - redirect to login
          router.push("/auth/login");
          return;
        }
        const userData = await userRes.json();
        if (!userData.ok) {
          // Not authenticated - redirect to login
          router.push("/auth/login");
          return;
        }
        
        // User is authenticated - fetch data
        const [matchesRes, teamsRes, playersRes] = await Promise.all([
          fetch("/api/matches"),
          fetch("/api/teams"),
          fetch("/api/players?page=1&limit=10"),
        ]);

        if (matchesRes.ok) {
          const matchesData = await matchesRes.json();
          if (matchesData.ok && Array.isArray(matchesData.matches)) {
            setMatches(matchesData.matches);
          }
        }

        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          if (teamsData.ok && Array.isArray(teamsData.teams)) {
            setTeams(teamsData.teams);
          }
        }

        if (playersRes.ok) {
          const playersData = await playersRes.json();
          if (playersData.ok && Array.isArray(playersData.players)) {
            setPlayers(playersData.players);
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    }

    fetchData();
  }, []);

  // Get upcoming matches (next 7 days) - only calculate after mount to avoid Date() hydration issues
  const upcomingMatches = useMemo(() => {
    if (!mounted) return [];
    const now = new Date();
    const next7Days = new Date();
    next7Days.setDate(now.getDate() + 7);
    return matches.filter((match) => {
      const matchDate = new Date(match.date);
      return matchDate >= now && matchDate <= next7Days && (match.scoreHome === null || match.scoreAway !== null);
    });
  }, [mounted, matches]);

  // Onboarding checklist
  const hasTeam = teams.length > 0;
  const hasPlayers = players.length >= 5;
  const hasMatchReport = matches.some((m) => m.scoreHome !== null && m.scoreAway !== null);

  // Show loading only if not mounted yet (consistent on server and client)
  if (!mounted) {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-white/60">{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:gap-8 md:grid-cols-3">
      {/* Main Content */}
      <div className="md:col-span-2 space-y-6 md:space-y-8">
        {/* Performance Overview Header - Enhanced */}
        <div className="relative space-y-4 overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/80 via-slate-950/90 to-slate-900/80 p-8 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-purple-500/5"></div>
          <div className="relative">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                    <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">{t("performanceOverview")}</h1>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                      {t("monitorKeyMetrics")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Fixtures - Premium Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 p-8 shadow-2xl transition-all hover:shadow-emerald-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                  <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">{t("upcomingFixtures")}</h2>
                  <p className="text-xs text-slate-400 mt-1 font-medium">{t("next7Days")}</p>
                </div>
              </div>
              <Link
                href="/calendar"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all hover:scale-105 hover:from-emerald-500 hover:to-emerald-400"
              >
                {t("viewCalendar")}
              </Link>
            </div>
            <div className="mt-6">
              {upcomingMatches.length > 0 ? (
                <div className="space-y-3">
                  {upcomingMatches.map((match) => (
                    <Link
                      key={match.id}
                      href={`/matches/${match.slug || match.id}`}
                      className="group/match block rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 p-5 transition-all hover:border-emerald-500/30 hover:bg-gradient-to-br hover:from-slate-900/70 hover:to-slate-950/70 hover:shadow-lg hover:shadow-emerald-500/5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white group-hover/match:text-emerald-400 transition-colors">
                            {match.homeTeam?.name || match.homeTeamName || t("home")} <span className="text-slate-500 mx-2">vs</span>{" "}
                            {match.awayTeam?.name || match.awayTeamName || t("away")}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <p className="text-xs text-slate-400 font-medium">
                              {new Date(match.date).toLocaleDateString("en-GB", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })}
                            </p>
                            <span className="text-slate-600">•</span>
                            <p className="text-xs text-slate-400 font-medium">{match.competition}</p>
                          </div>
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse"></div>
                          <svg className="h-4 w-4 text-slate-500 group-hover/match:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-800/50 flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <svg className="h-10 w-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-white font-semibold mb-1">{t("noUpcomingFixtures")}</p>
                  <p className="text-xs text-slate-400">{t("createFirstMatch")}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Squad Performance Snapshot - Premium */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 p-8 shadow-2xl transition-all hover:shadow-purple-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                  <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">{t("squadPerformanceSnapshot")}</h2>
              </div>
              <Link
                href="/statistics"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all hover:scale-105"
              >
                {t("openFullReport")}
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                href="/players"
                className="group/stat relative overflow-hidden rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/60 to-slate-950/60 p-6 transition-all hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 hover:scale-[1.02]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity"></div>
                <div className="relative text-center">
                  <p className="text-5xl font-bold bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent mb-3">{players.length}</p>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">{t("players")}</p>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 group-hover/stat:text-emerald-400 transition-colors">
                    <span className="font-medium">{t("viewAllPlayers")}</span>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
              <Link
                href="/matches"
                className="group/stat relative overflow-hidden rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/60 to-slate-950/60 p-6 transition-all hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 hover:scale-[1.02]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity"></div>
                <div className="relative text-center">
                  <p className="text-5xl font-bold bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent mb-3">{matches.length}</p>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">{t("matches")}</p>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 group-hover/stat:text-blue-400 transition-colors">
                    <span className="font-medium">{t("viewAllMatches")}</span>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
              <Link
                href="/teams"
                className="group/stat relative overflow-hidden rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/60 to-slate-950/60 p-6 transition-all hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 hover:scale-[1.02]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity"></div>
                <div className="relative text-center">
                  <p className="text-5xl font-bold bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent mb-3">{teams.length}</p>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">{t("teams")}</p>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 group-hover/stat:text-amber-400 transition-colors">
                    <span className="font-medium">{t("viewAllTeams")}</span>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Onboarding - Premium Style */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 p-8 shadow-2xl transition-all hover:shadow-cyan-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                <svg className="h-5 w-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">{t("onboarding")}</h2>
            </div>
            <div className="space-y-3">
              <div className={`group/item relative overflow-hidden flex items-center gap-4 p-4 rounded-xl border transition-all ${
                hasTeam 
                  ? "bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border-emerald-500/20" 
                  : "bg-gradient-to-br from-slate-900/50 to-slate-950/50 border-slate-800/50 hover:border-slate-700/50"
              }`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${
                  hasTeam 
                    ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30" 
                    : "bg-slate-800/50 text-slate-500 border border-slate-700/50"
                }`}>
                  {hasTeam ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-xs">1</span>
                  )}
                </div>
                <span className={`text-sm font-semibold flex-1 ${
                  hasTeam ? "text-emerald-300 line-through decoration-2" : "text-white"
                }`}>
                  {t("addFirstTeam")}
                </span>
                {hasTeam && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  </div>
                )}
              </div>
              <div className={`group/item relative overflow-hidden flex items-center gap-4 p-4 rounded-xl border transition-all ${
                hasPlayers 
                  ? "bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border-emerald-500/20" 
                  : "bg-gradient-to-br from-slate-900/50 to-slate-950/50 border-slate-800/50 hover:border-slate-700/50"
              }`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${
                  hasPlayers 
                    ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30" 
                    : "bg-slate-800/50 text-slate-500 border border-slate-700/50"
                }`}>
                  {hasPlayers ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-xs">2</span>
                  )}
                </div>
                <span className={`text-sm font-semibold flex-1 ${
                  hasPlayers ? "text-emerald-300 line-through decoration-2" : "text-white"
                }`}>
                  {t("add5Players")}
                </span>
                {hasPlayers && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  </div>
                )}
              </div>
              <div className={`group/item relative overflow-hidden flex items-center gap-4 p-4 rounded-xl border transition-all ${
                hasMatchReport 
                  ? "bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border-emerald-500/20" 
                  : "bg-gradient-to-br from-slate-900/50 to-slate-950/50 border-slate-800/50 hover:border-slate-700/50"
              }`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${
                  hasMatchReport 
                    ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30" 
                    : "bg-slate-800/50 text-slate-500 border border-slate-700/50"
                }`}>
                  {hasMatchReport ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-xs">3</span>
                  )}
                </div>
                <span className={`text-sm font-semibold flex-1 ${
                  hasMatchReport ? "text-emerald-300 line-through decoration-2" : "text-white"
                }`}>
                  {t("reviewMatchReport")}
                </span>
                {hasMatchReport && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Premium */}
      <div className="space-y-6">
        {/* KEY METRICS - Premium */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 p-6 shadow-2xl transition-all hover:shadow-blue-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
                <svg className="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight">{t("keyMetrics")}</h3>
            </div>
            <div className="space-y-3">
              <div className="group/metric flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-900/60 to-slate-950/60 border border-slate-800/50 hover:border-blue-500/30 transition-all hover:shadow-lg hover:shadow-blue-500/5">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{t("totalPlayers")}</span>
                <span className="text-xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">{players.length}</span>
              </div>
              <div className="group/metric flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-900/60 to-slate-950/60 border border-slate-800/50 hover:border-amber-500/30 transition-all hover:shadow-lg hover:shadow-amber-500/5">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{t("totalTeams")}</span>
                <span className="text-xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">{teams.length}</span>
              </div>
              <div className="group/metric flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-900/60 to-slate-950/60 border border-slate-800/50 hover:border-purple-500/30 transition-all hover:shadow-lg hover:shadow-purple-500/5">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{t("totalMatches")}</span>
                <span className="text-xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">{matches.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* LATEST ANALYSES - Premium */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 p-6 shadow-2xl transition-all hover:shadow-purple-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <svg className="h-4 w-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight">{t("latestAnalyses")}</h3>
            </div>
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="h-8 w-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                {matches.length > 0
                  ? t("recentMatchAnalyses")
                  : t("noAnalysisYet")}
              </p>
            </div>
          </div>
        </div>

        {/* ACTIVITY - Premium */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 p-6 shadow-2xl transition-all hover:shadow-amber-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                <svg className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight">{t("activity")}</h3>
            </div>
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                {matches.length > 0
                  ? t("recentActivity")
                  : t("noRecentActivity")}
              </p>
            </div>
          </div>
        </div>

        {/* Tips for professional setup - Premium */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 p-6 shadow-2xl transition-all hover:shadow-emerald-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight">{t("tipsForProfessionalSetup")}</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t("tipsDescription")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
