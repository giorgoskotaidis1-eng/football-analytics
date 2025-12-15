"use client";

import React, { Suspense } from "react";
import { MatchTimeline } from "./MatchTimeline";
import dynamic from "next/dynamic";

const XGTimelineChart = dynamic(() => import("./XGTimelineChart").then(m => ({ default: m.XGTimelineChart })), { ssr: false });
const PossessionChart = dynamic(() => import("./PossessionChart").then(m => ({ default: m.PossessionChart })), { ssr: false });
const KPICards = dynamic(() => import("./KPICards").then(m => ({ default: m.KPICards })), { ssr: false });

interface MatchSummaryProps {
  match: {
    id: number;
    homeTeam: { id: number; name: string } | null;
    awayTeam: { id: number; name: string } | null;
    homeTeamName?: string | null;
    awayTeamName?: string | null;
    homeTeamId?: number | null;
    awayTeamId?: number | null;
    date: string;
    competition: string;
    scoreHome: number | null;
    scoreAway: number | null;
  };
  events: Array<{
    id: number;
    type: string;
    minute: number | null;
    player?: { name: string } | null;
    team: string;
  }>;
  analytics: {
    xg?: { home: number; away: number };
    shots?: {
      home: { total: number; onTarget: number; goals: number };
      away: { total: number; onTarget: number; goals: number };
    };
    possession?: { home: number; away: number };
    passAccuracy?: { home: number; away: number };
    progressivePasses?: { home: number; away: number };
    xa?: { home: number; away: number };
    ppda?: { home: number; away: number };
    highRegains?: { home: number; away: number };
  } | null;
  xgTimelineData: Array<{ minute: number; home: number; away: number }>;
  homeTeamName: string;
  awayTeamName: string;
}

export function MatchSummary({
  match,
  events,
  analytics,
  xgTimelineData,
  homeTeamName,
  awayTeamName,
}: MatchSummaryProps) {
  const getTeamName = (team: { name: string } | null, opponentName: string | null | undefined) => {
    return team?.name || opponentName || "Unknown";
  };

  // Calculate summary stats
  const totalEvents = events.length;
  const shotsCount = events.filter(e => e.type?.toLowerCase().includes("shot")).length;
  const passesCount = events.filter(e => e.type?.toLowerCase().includes("pass")).length;
  const goalsCount = events.filter(e => e.type?.toLowerCase().includes("goal")).length;

  return (
    <div className="space-y-6">
      {/* Hero Stats Section - Beautiful gradient cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Events Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-transparent p-6 shadow-xl backdrop-blur-sm transition-all hover:border-emerald-500/40 hover:shadow-emerald-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30">
                <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-400/80">Συνολικά Events</p>
                <p className="text-3xl font-bold text-white mt-1">{totalEvents}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-white/60">
              <span className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                {shotsCount} Σουτ
              </span>
              <span className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                {passesCount} Πάσες
              </span>
              {goalsCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-yellow-400" />
                  {goalsCount} Γκολ
                </span>
              )}
            </div>
          </div>
        </div>

        {/* xG Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-600/5 to-transparent p-6 shadow-xl backdrop-blur-sm transition-all hover:border-blue-500/40 hover:shadow-blue-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30">
                <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-blue-400/80">Expected Goals</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-3xl font-bold text-white">
                    {analytics?.xg?.home ? analytics.xg.home.toFixed(2) : "0.00"}
                  </p>
                  <span className="text-lg text-white/50">vs</span>
                  <p className="text-3xl font-bold text-white">
                    {analytics?.xg?.away ? analytics.xg.away.toFixed(2) : "0.00"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-white/60">
              <span>{homeTeamName}</span>
              <span>{awayTeamName}</span>
            </div>
          </div>
        </div>

        {/* Possession Card */}
        {analytics?.possession && (
          <div className="group relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-purple-600/5 to-transparent p-6 shadow-xl backdrop-blur-sm transition-all hover:border-purple-500/40 hover:shadow-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30">
                  <svg className="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-purple-400/80">Κατοχή</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-bold text-white">
                      {Math.round((analytics.possession.home || 0) * 10) / 10}%
                    </p>
                    <span className="text-lg text-white/50">vs</span>
                    <p className="text-3xl font-bold text-white">
                      {Math.round((analytics.possession.away || 0) * 10) / 10}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full bg-slate-900/50 mt-2">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600"
                  style={{ width: `${(analytics.possession.home || 0) * 10}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-purple-400 to-purple-500"
                  style={{ width: `${(analytics.possession.away || 0) * 10}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Section */}
      {analytics && (
        <div className="rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
              <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Κλειδί Μετρικές</h3>
              <p className="text-[10px] text-white/60">Συνοπτική ανάλυση των βασικών στατιστικών</p>
            </div>
          </div>
          <KPICards
            analytics={analytics}
            homeTeamName={homeTeamName}
            awayTeamName={awayTeamName}
            matchDuration={90}
          />
        </div>
      )}

      {/* Charts Grid - Beautiful layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* xG Timeline */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 p-6 shadow-2xl transition-all hover:border-slate-700/50 hover:shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Χρονοδιάγραμμα xG</h3>
                <p className="text-[10px] text-white/60">Εξέλιξη των expected goals κατά τη διάρκεια του αγώνα</p>
              </div>
            </div>
            <div className="h-64">
              <React.Suspense fallback={<div className="h-full animate-pulse bg-slate-900/50 rounded-lg" />}>
                <XGTimelineChart
                  data={xgTimelineData}
                  homeTeamName={homeTeamName}
                  awayTeamName={awayTeamName}
                />
              </React.Suspense>
            </div>
          </div>
        </div>

        {/* Possession Chart */}
        {analytics?.possession && (
          <div className="group relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 p-6 shadow-2xl transition-all hover:border-slate-700/50 hover:shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30">
                  <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Κατοχή</h3>
                  <p className="text-[10px] text-white/60">Κατανομή κατοχής μπάλας ανά ομάδα</p>
                </div>
              </div>
              <div className="h-64">
                <React.Suspense fallback={<div className="h-full animate-pulse bg-slate-900/50 rounded-lg" />}>
                  <PossessionChart
                    home={analytics.possession.home}
                    away={analytics.possession.away}
                    homeTeamName={homeTeamName}
                    awayTeamName={awayTeamName}
                  />
                </React.Suspense>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Match Timeline */}
      {events.length > 0 && (
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 p-6 shadow-2xl transition-all hover:border-slate-700/50 hover:shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Timeline Events</h3>
                <p className="text-[10px] text-white/60">Χρονολογική ακολουθία των events στον αγώνα</p>
              </div>
            </div>
            <MatchTimeline
              events={events}
              matchDuration={90}
              onEventClick={(event) => {
                // Handle click
              }}
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {events.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 p-12 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 mb-4">
            <svg className="h-10 w-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Δεν έχουν καταγραφεί events</h3>
          <p className="text-sm text-white/60 max-w-md">
            Κάντε κλικ στο "Προσθήκη Event" για να ξεκινήσετε την καταγραφή σουτ, πασών και αγγιγμάτων.
            Τα στατιστικά θα υπολογιστούν αυτόματα από τα events σας.
          </p>
        </div>
      )}
    </div>
  );
}

