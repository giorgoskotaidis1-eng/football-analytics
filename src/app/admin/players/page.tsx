"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";

type PlayerStatus = {
  id: number;
  name: string;
  email: string | null;
  position: string;
  number: number | null;
  team: { id: number; name: string } | null;
  lastLoginAt: string | null;
  isOnline: boolean;
  status: string;
};

export default function AdminPlayersPage() {
  const { t } = useTranslation();
  const [players, setPlayers] = useState<PlayerStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlayers() {
      try {
        const res = await fetch("/api/admin/player-logins");
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.players) {
            setPlayers(data.players);
          }
        }
      } catch (error) {
        console.error("[AdminPlayers] Error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPlayers();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPlayers, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t("never");
    const date = new Date(dateString);
    return date.toLocaleString("el-GR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 text-xs text-slate-200">
        <div className="h-96 animate-pulse rounded-xl bg-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs text-slate-200">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 shadow-lg">
            <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Admin</p>
            <h1 className="text-lg font-semibold tracking-tight text-slate-50">{t("playerActivity")}</h1>
            <p className="text-[11px] text-slate-500">
              {t("monitorPlayerLogin")}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-slate-950/90 via-slate-900/95 to-slate-950/90 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-gradient-to-r from-emerald-950/60 via-teal-950/60 to-emerald-950/60 border-b border-emerald-500/30">
              <tr>
                <th className="px-5 py-4 text-left font-semibold text-slate-300 uppercase tracking-wider text-[10px]">{t("playerName")}</th>
                <th className="px-5 py-4 text-left font-semibold text-slate-300 uppercase tracking-wider text-[10px]">{t("playerPosition")}</th>
                <th className="px-5 py-4 text-left font-semibold text-slate-300 uppercase tracking-wider text-[10px]">{t("teamName")}</th>
                <th className="px-5 py-4 text-left font-semibold text-slate-300 uppercase tracking-wider text-[10px]">{t("status")}</th>
                <th className="px-5 py-4 text-left font-semibold text-slate-300 uppercase tracking-wider text-[10px]">Τελευταία Σύνδεση</th>
              </tr>
            </thead>
            <tbody>
              {players.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="h-12 w-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <p className="text-sm font-medium">{t("noPlayersFound")}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                players.map((player) => (
                  <tr
                    key={player.id}
                    className="border-b border-slate-800/30 hover:bg-gradient-to-r hover:from-slate-900/50 hover:to-slate-800/30 transition-all duration-200"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border border-blue-500/40 text-sm font-bold text-blue-300 shadow-lg">
                          {player.number || player.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{player.name}</div>
                          {player.email && (
                            <div className="text-[10px] text-slate-500 font-medium">{player.email}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-lg bg-slate-800/50 px-2.5 py-1 text-[10px] font-medium text-slate-300 border border-slate-700/50">
                        {player.position}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-slate-300 font-medium">{player.team?.name || "-"}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${
                            player.isOnline 
                              ? "bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" 
                              : "bg-slate-600"
                          }`}
                        />
                        <span
                          className={`font-semibold text-xs ${
                            player.isOnline 
                              ? "text-emerald-300" 
                              : "text-slate-400"
                          }`}
                        >
                          {player.isOnline ? t("online") : t("offline")}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-slate-400 font-medium text-[10px]">{formatDate(player.lastLoginAt)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-950/40 via-cyan-950/50 to-blue-950/40 p-6 shadow-xl hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-medium text-blue-400/90 uppercase tracking-wide">
              {t("totalPlayers")}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border border-blue-500/40 shadow-lg">
              <svg className="h-5 w-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold bg-gradient-to-br from-blue-300 via-cyan-300 to-blue-200 bg-clip-text text-transparent">{players.length}</div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-teal-950/50 to-emerald-950/40 p-6 shadow-xl hover:border-emerald-500/40 transition-all">
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
            {players.filter((p) => p.isOnline).length}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-950/90 via-slate-900/95 to-slate-950/90 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
              {t("offline")}
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500/20 to-slate-600/20 border border-slate-500/30">
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-400">
            {players.filter((p) => !p.isOnline).length}
          </div>
        </div>
      </div>
    </div>
  );
}

