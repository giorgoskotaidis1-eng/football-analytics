"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import toast from "react-hot-toast";
import { Toaster } from "react-hot-toast";
import { ExportModal } from "@/app/components/ExportModal";

type Video = {
  id: number;
  filename: string;
  phase: string;
  player: { id: number; name: string } | null;
  team: { id: number; name: string } | null;
  match: { id: number; slug: string } | null;
  uploadedAt: string;
};

export default function PlaylistPage() {
  const { t } = useTranslation();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [filters, setFilters] = useState({
    phase: "All",
    player: "All",
    team: "All",
  });

  useEffect(() => {
    async function fetchVideos() {
      try {
        const res = await fetch("/api/videos");
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.videos)) {
            setVideos(data.videos);
          }
        }
      } catch {
        // ignore errors
      } finally {
        setLoading(false);
      }
    }
    fetchVideos();
  }, []);

  const filteredVideos = videos.filter((video) => {
    if (filters.phase !== "All" && video.phase !== filters.phase) return false;
    if (filters.player !== "All" && video.player?.id.toString() !== filters.player) return false;
    if (filters.team !== "All" && video.team?.id.toString() !== filters.team) return false;
    return true;
  });

  const uniquePhases = Array.from(new Set(videos.map((v) => v.phase))).filter(Boolean);
  const uniquePlayers = Array.from(
    new Set(videos.filter((v) => v.player).map((v) => ({ id: v.player!.id, name: v.player!.name }))))
    .filter((p, i, arr) => arr.findIndex((p2) => p2.id === p.id) === i);
  const uniqueTeams = Array.from(
    new Set(videos.filter((v) => v.team).map((v) => ({ id: v.team!.id, name: v.team!.name }))))
    .filter((t, i, arr) => arr.findIndex((t2) => t2.id === t.id) === i);

  if (loading) {
    return (
      <div className="space-y-5 text-xs text-slate-700 dark:text-slate-200">
        <p className="text-slate-600 dark:text-slate-400">{t("loading")}</p>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <header className="border-b border-slate-200 dark:border-slate-900/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">{t("videoLibrary")}</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t("videoLibraryDescription")}</p>
              </div>
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all hover:bg-slate-200 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t("export")}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-8">
          <div className="mb-6 rounded-xl border border-slate-200/80 dark:border-slate-800/50 bg-gradient-to-br from-white dark:from-slate-900/50 via-slate-50/50 dark:via-slate-950/50 to-white dark:to-slate-950/50 p-6 shadow-lg">
            <div className="mb-4 flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t("phase")}</label>
                <select
                  value={filters.phase}
                  onChange={(e) => setFilters({ ...filters, phase: e.target.value })}
                  className="h-12 w-64 appearance-none rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 pr-10 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <option value="All">{t("allPhases")}</option>
                  {uniquePhases.map((phase) => (
                    <option key={phase} value={phase}>
                      {phase}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t("playerName")}</label>
                <select
                  value={filters.player}
                  onChange={(e) => setFilters({ ...filters, player: e.target.value })}
                  className="h-12 w-48 appearance-none rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 pr-10 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <option value="All">{t("allPlayers")}</option>
                  {uniquePlayers.map((player) => (
                    <option key={player.id} value={player.id.toString()}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 flex-1 min-w-[250px]">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t("search")}</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t("searchVideos")}
                    className="h-12 w-48 rounded-lg border border-slate-800 bg-slate-900/50 px-4 pr-10 text-sm font-medium text-white placeholder:text-slate-500 outline-none transition-all focus:border-emerald-500 focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-700"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <button className="h-12 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-6 text-sm font-semibold text-emerald-400 transition-all hover:bg-emerald-500/20">
                {t("filter")}
              </button>
            </div>

            {filteredVideos.length === 0 ? (
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/50 bg-gradient-to-br from-white dark:from-slate-900/30 via-slate-50/30 dark:via-slate-950/30 to-white dark:to-slate-950/30 p-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="rounded-full bg-slate-200 dark:bg-slate-800/50 p-4">
                    <svg className="h-10 w-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">{t("noVideosFound")}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-500">{t("uploadVideosToSee")}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/50 bg-gradient-to-br from-white dark:from-slate-900/50 via-slate-50/50 dark:via-slate-950/50 to-white dark:to-slate-950/50 overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                          <div className="flex items-center gap-2">
                            <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            {t("phase")}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                          <div className="flex items-center gap-2">
                            <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {t("playerName")}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                          <div className="flex items-center gap-2">
                            <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {t("teamName")}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                          <div className="flex items-center gap-2">
                            <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            {t("matches")}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                          <div className="flex items-center gap-2">
                            <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {t("uploaded")}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-400">{t("actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredVideos.map((video) => (
                        <tr key={video.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition">
                          <td className="px-6 py-4 text-slate-900 dark:text-white">
                            <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
                              {video.phase}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-900 dark:text-white">
                            {video.player ? video.player.name : "-"}
                          </td>
                          <td className="px-6 py-4 text-slate-900 dark:text-white">
                            {video.team ? video.team.name : "-"}
                          </td>
                          <td className="px-6 py-4 text-slate-900 dark:text-white">
                            {video.match ? (
                              <Link href={`/matches/${video.match.slug}`} className="text-emerald-400 hover:text-emerald-300">
                                {t("viewMatch")}
                              </Link>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                            {new Date(video.uploadedAt).toLocaleDateString("en-GB")}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Link
                              href={`/videos/${video.id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-emerald-400 hover:scale-105"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              {t("play")}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportSuccess={() => {
          toast.success(t("exportCompleted"));
        }}
      />
    </>
  );
}
