"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import toast from "react-hot-toast";
import { Toaster } from "react-hot-toast";
import { PlaylistModal } from "@/app/components/PlaylistModal";

type Playlist = {
  id: number;
  name: string;
  description: string | null;
  updatedAt: string;
  match: {
    id: number;
    slug: string;
    date: string;
    homeTeam: { name: string } | null;
    awayTeam: { name: string } | null;
    homeTeamName: string | null;
    awayTeamName: string | null;
  } | null;
  _count: { clips: number };
};

export default function PlaylistPage() {
  const { t } = useTranslation();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function loadPlaylists() {
    try {
      const res = await fetch("/api/playlists");
      if (!res.ok) {
        setPlaylists([]);
        return;
      }
      const data = await res.json();
      if (data?.ok && Array.isArray(data.playlists)) {
        setPlaylists(data.playlists);
      } else {
        setPlaylists([]);
      }
    } catch {
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlaylists();
  }, []);

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
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
                  {t("playlists") || "Playlists"}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t("organizeClipsAndMoments") || "Organize important clips and moments by match or tactical theme."}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-500 transition-all hover:bg-emerald-500/20"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t("newPlaylist") || "New Playlist"}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-8">
          {playlists.length === 0 ? (
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/50 bg-gradient-to-br from-white dark:from-slate-900/30 via-slate-50/30 dark:via-slate-950/30 to-white dark:to-slate-950/30 p-12 text-center">
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("noPlaylistsYet") || "No playlists yet"}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-500 mb-5">
                {t("createFirstPlaylistPrompt") || "Create your first playlist to organize clips from matches."}
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-500 transition hover:bg-emerald-500/20"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t("newPlaylist") || "New Playlist"}
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {playlists.map((playlist) => {
                const homeName = playlist.match?.homeTeam?.name || playlist.match?.homeTeamName || "Home";
                const awayName = playlist.match?.awayTeam?.name || playlist.match?.awayTeamName || "Away";
                return (
                  <Link
                    key={playlist.id}
                    href={`/playlist/${playlist.id}`}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 transition hover:border-emerald-400/60 hover:shadow-lg"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h2 className="line-clamp-1 text-base font-semibold text-slate-900 dark:text-white">
                        {playlist.name}
                      </h2>
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                        {playlist._count.clips} {playlist._count.clips === 1 ? "clip" : "clips"}
                      </span>
                    </div>
                    <p className="mb-4 min-h-[34px] line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                      {playlist.description || (t("noDescription") || "No description")}
                    </p>
                    {playlist.match ? (
                      <div className="mb-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-2 text-[11px] text-slate-600 dark:text-slate-300">
                        {homeName} vs {awayName} · {new Date(playlist.match.date).toLocaleDateString("en-GB")}
                      </div>
                    ) : (
                      <div className="mb-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-2 text-[11px] text-slate-500">
                        {t("noSpecificMatch") || "No specific match"}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500">
                      {t("updated") || "Updated"} {new Date(playlist.updatedAt).toLocaleDateString("en-GB")}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <PlaylistModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPlaylistSuccess={() => {
          toast.success(t("playlistCreated") || "Playlist created");
          setLoading(true);
          void loadPlaylists();
        }}
      />
    </>
  );
}
