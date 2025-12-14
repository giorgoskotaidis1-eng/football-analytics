"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "@/lib/i18n";

type WatchlistPlayer = {
  id: number;
  player: {
    id: number;
    name: string;
    position: string;
    age: number | null;
    club: string | null;
    team: { id: number; name: string } | null;
    goals: number | null;
    assists: number | null;
    xg: number | null;
  };
  notes: string | null;
  addedAt: string;
};

export default function WatchlistPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<WatchlistPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWatchlist() {
      setLoading(true);
      try {
        const res = await fetch("/api/watchlist");
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            setWatchlist(data.watchlist);
          }
        }
      } catch (err) {
        console.error("Failed to fetch watchlist", err);
      } finally {
        setLoading(false);
      }
    }
    fetchWatchlist();
  }, []);

  async function handleRemoveFromWatchlist(playerId: number) {
    try {
      const res = await fetch(`/api/watchlist?playerId=${playerId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setWatchlist(watchlist.filter((w) => w.player.id !== playerId));
        toast.success(t("removedFromWatchlist"));
      } else {
        toast.error(t("failedToRemoveFromWatchlist"));
      }
    } catch (err) {
      toast.error(t("networkError"));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-slate-600 dark:text-slate-400">{t("loading")}</p>
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
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30">
                  <svg className="h-6 w-6 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">{t("watchlist")}</h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {watchlist.length} {watchlist.length === 1 ? t("players").toLowerCase() : t("players").toLowerCase()} {t("watchlistDescription")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-8">
          {watchlist.length === 0 ? (
            /* Empty State */
            <div className="rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 shadow-xl overflow-hidden">
              <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-800/50 bg-slate-900/30">
                <h2 className="text-base font-bold text-white">{t("yourWatchlist")}</h2>
              </div>
              <div className="px-6 py-16 text-center">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/50 border border-slate-700">
                    <svg className="h-8 w-8 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-white">{t("yourWatchlistIsEmpty")}</p>
                    <p className="text-sm text-slate-400">
                      {t("addPlayersToYourWatchlist")}
                    </p>
                  </div>
                  <Link
                    href="/players"
                    className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:scale-105"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
{t("goToPlayers")}
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Watchlist Table */
            <div className="rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 shadow-xl overflow-hidden">
              <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-800/50 bg-slate-900/30">
                <h2 className="text-base font-bold text-white">Watchlist players</h2>
              </div>
              <div className="overflow-x-auto hide-scrollbar" style={{ overflowY: 'visible' }}>
                <table className="w-full border-collapse text-sm text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-xs font-semibold uppercase tracking-wide">Player</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          <span className="text-xs font-semibold uppercase tracking-wide">Position</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="text-xs font-semibold uppercase tracking-wide">Team</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          <span className="text-xs font-semibold uppercase tracking-wide">Goals</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="text-xs font-semibold uppercase tracking-wide">Assists</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span className="text-xs font-semibold uppercase tracking-wide">xG</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-semibold uppercase tracking-wide">Added</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center">
                        <span className="text-xs font-semibold uppercase tracking-wide">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchlist.map((item) => (
                      <tr key={item.id} className="border-t border-slate-800/50 hover:bg-slate-900/30 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30">
                              <span className="text-sm font-semibold text-purple-400">
                                {item.player.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-white font-medium">{item.player.name}</p>
                              {item.player.age && (
                                <p className="text-xs text-slate-500">Age: {item.player.age}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                            {item.player.position}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {item.player.team ? (
                            <span className="text-white">{item.player.team.name}</span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-white font-medium">
                            {item.player.goals !== null ? item.player.goals : "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-white font-medium">
                            {item.player.assists !== null ? item.player.assists : "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-white font-medium">
                            {item.player.xg !== null ? item.player.xg.toFixed(2) : "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-400 text-sm">
                            {new Date(item.addedAt).toLocaleDateString("en-GB")}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/players/${item.player.id}`}
                              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/50"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => handleRemoveFromWatchlist(item.player.id)}
                              className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-all hover:bg-slate-800 hover:border-slate-600"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
