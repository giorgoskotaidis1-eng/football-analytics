"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

type Match = {
  id: number;
  slug: string;
  competition: string;
  date: string;
  scoreHome: number | null;
  scoreAway: number | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
};

export default function AdminMatchesPage() {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMatches() {
      try {
        const res = await fetch("/api/matches?limit=100");
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.matches) {
            setMatches(data.matches);
          }
        }
      } catch (error) {
        console.error("[AdminMatches] Error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMatches();
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
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 shadow-lg">
            <svg className="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Admin</p>
            <h1 className="text-lg font-semibold tracking-tight text-slate-50">{t("matchesAnalysis")}</h1>
            <p className="text-[11px] text-slate-500">
              {t("viewAndAnalyzeMatches")}
            </p>
          </div>
        </div>
      </div>

      {/* Matches Table */}
      <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-slate-950/90 via-slate-900/95 to-slate-950/90 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-gradient-to-r from-purple-950/60 via-pink-950/60 to-purple-950/60 border-b border-purple-500/30">
              <tr>
                <th className="px-5 py-4 text-left font-semibold text-slate-300 uppercase tracking-wider text-[10px]">{t("competition")}</th>
                <th className="px-5 py-4 text-left font-semibold text-slate-300 uppercase tracking-wider text-[10px]">{t("date")}</th>
                <th className="px-5 py-4 text-left font-semibold text-slate-300 uppercase tracking-wider text-[10px]">{t("match")}</th>
                <th className="px-5 py-4 text-center font-semibold text-slate-300 uppercase tracking-wider text-[10px]">{t("scoreline")}</th>
                <th className="px-5 py-4 text-center font-semibold text-slate-300 uppercase tracking-wider text-[10px]">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {matches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="h-12 w-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      <p className="text-sm font-medium">{t("noMatchesFound")}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                matches.map((match) => (
                  <tr
                    key={match.id}
                    className="border-b border-slate-800/30 hover:bg-gradient-to-r hover:from-slate-900/50 hover:to-slate-800/30 transition-all duration-200"
                  >
                    <td className="px-5 py-4">
                      <span className="text-slate-300 font-medium">{match.competition}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-slate-400 text-[10px]">
                        {new Date(match.date).toLocaleDateString("el-GR")}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-white font-semibold">
                        {match.homeTeamName || "Home"} vs {match.awayTeamName || "Away"}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center rounded-lg bg-slate-800/50 px-3 py-1 text-[10px] font-bold text-white border border-slate-700/50">
                        {match.scoreHome ?? "-"} - {match.scoreAway ?? "-"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/matches/${match.id}`}
                        className="rounded-lg border border-purple-500/30 bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-3 py-1.5 text-[10px] font-semibold text-purple-200 transition-all hover:from-purple-500/30 hover:to-pink-500/30 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20"
                      >
                        {t("view")}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

