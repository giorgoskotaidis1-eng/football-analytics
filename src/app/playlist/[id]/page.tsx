"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import toast, { Toaster } from "react-hot-toast";

type PlaylistClip = {
  id: number;
  title: string;
  startSec: number;
  endSec: number;
  position: number;
  match: {
    slug: string;
    date: string;
    homeTeam: { name: string } | null;
    awayTeam: { name: string } | null;
    homeTeamName: string | null;
    awayTeamName: string | null;
  };
  matchEvent: {
    id: number;
    type: string;
    minute: number | null;
    x: number | null;
    y: number | null;
  } | null;
};

type PlaylistPayload = {
  id: number;
  name: string;
  description: string | null;
  updatedAt: string;
  match: {
    slug: string;
    date: string;
    homeTeam: { name: string } | null;
    awayTeam: { name: string } | null;
    homeTeamName: string | null;
    awayTeamName: string | null;
  } | null;
  clips: PlaylistClip[];
  _count: { clips: number };
};

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function PlaylistDetailPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const playlistId = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingClipId, setRemovingClipId] = useState<number | null>(null);
  const [downloadingClipId, setDownloadingClipId] = useState<number | null>(null);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [selectedClipIds, setSelectedClipIds] = useState<Set<number>>(new Set());
  const [playlist, setPlaylist] = useState<PlaylistPayload | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const matchLabel = useMemo(() => {
    if (!playlist?.match) return null;
    const home = playlist.match.homeTeam?.name || playlist.match.homeTeamName || "Home";
    const away = playlist.match.awayTeam?.name || playlist.match.awayTeamName || "Away";
    return `${home} vs ${away}`;
  }, [playlist]);

  async function loadPlaylist() {
    if (!playlistId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/playlists/${playlistId}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok || !data.playlist) {
        toast.error(data?.message || "Playlist not found.");
        router.replace("/playlist");
        return;
      }
      setPlaylist(data.playlist);
      setEditName(data.playlist.name ?? "");
      setEditDescription(data.playlist.description ?? "");
    } catch {
      toast.error("Failed to load playlist.");
      router.replace("/playlist");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlaylist();
  }, [playlistId]);

  useEffect(() => {
    if (!playlist) {
      setSelectedClipIds(new Set());
      return;
    }
    const allowedIds = new Set(playlist.clips.map((clip) => clip.id));
    setSelectedClipIds((prev) => {
      const next = new Set([...prev].filter((id) => allowedIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [playlist]);

  async function saveMeta() {
    if (!playlistId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.message || "Could not update playlist.");
        return;
      }
      toast.success(t("saved") || "Saved");
      await loadPlaylist();
    } catch {
      toast.error(t("anErrorOccurred") || "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  async function deletePlaylist() {
    if (!playlistId) return;
    if (!confirm(t("deletePlaylistConfirm") || "Delete this playlist?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.message || "Could not delete playlist.");
        return;
      }
      toast.success(t("playlistDeleted") || "Playlist deleted");
      router.replace("/playlist");
    } catch {
      toast.error(t("anErrorOccurred") || "An error occurred");
    } finally {
      setDeleting(false);
    }
  }

  async function removeClip(clipId: number) {
    if (!playlistId) return;
    if (!confirm(t("removeClipConfirm") || "Remove this clip?")) return;
    setRemovingClipId(clipId);
    try {
      const res = await fetch(`/api/playlists/${playlistId}/clips?clipId=${clipId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.message || "Could not remove clip.");
        return;
      }
      await loadPlaylist();
    } catch {
      toast.error(t("anErrorOccurred") || "An error occurred");
    } finally {
      setRemovingClipId(null);
    }
  }

  async function downloadClip(clipId: number) {
    if (!playlistId) return;
    setDownloadingClipId(clipId);
    try {
      const payload = await getClipDownloadPayload(clipId, true);
      if (!payload) return;
      triggerBrowserDownload(payload.blob, payload.filename);
    } catch {
      toast.error(t("anErrorOccurred") || "An error occurred");
    } finally {
      setDownloadingClipId(null);
    }
  }

  function toggleClipSelection(clipId: number) {
    setSelectedClipIds((prev) => {
      const next = new Set(prev);
      if (next.has(clipId)) {
        next.delete(clipId);
      } else {
        next.add(clipId);
      }
      return next;
    });
  }

  function toggleSelectAllClips() {
    if (!playlist) return;
    setSelectedClipIds((prev) => {
      if (prev.size === playlist.clips.length) {
        return new Set();
      }
      return new Set(playlist.clips.map((clip) => clip.id));
    });
  }

  async function getClipDownloadPayload(clipId: number, showErrorToast: boolean) {
    if (!playlistId) return null;
    const res = await fetch(`/api/playlists/${playlistId}/clips/${clipId}/download`, {
      method: "GET",
    });

    if (!res.ok) {
      if (showErrorToast) {
        const errorData = await res.json().catch(() => null);
        toast.error(errorData?.message || "Could not download clip.");
      }
      return null;
    }

    const blob = await res.blob();
    const contentDisposition = res.headers.get("Content-Disposition") || "";
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    const filename = filenameMatch?.[1] || `playlist-clip-${clipId}.mp4`;
    return { blob, filename };
  }

  function triggerBrowserDownload(blob: Blob, filename: string) {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }

  async function downloadMany(clipIds: number[], mode: "selected" | "all") {
    if (!playlist) return;
    if (clipIds.length === 0) {
      toast.error(t("selectAtLeastOneClip") || "Select at least one clip.");
      return;
    }

    setBulkDownloading(true);
    setBulkProgress({ done: 0, total: clipIds.length });
    let okCount = 0;
    let failCount = 0;

    try {
      for (let index = 0; index < clipIds.length; index += 1) {
        const clipId = clipIds[index];
        const payload = await getClipDownloadPayload(clipId, false);
        if (payload) {
          triggerBrowserDownload(payload.blob, payload.filename);
          okCount += 1;
        } else {
          failCount += 1;
        }
        setBulkProgress({ done: index + 1, total: clipIds.length });
      }

      if (failCount === 0) {
        toast.success(
          mode === "all"
            ? t("downloadedAllClips") || "Downloaded all clips."
            : t("downloadedSelectedClips") || "Downloaded selected clips."
        );
      } else {
        toast.error(
          `${t("downloadCompletedWithFailures") || "Download completed with failures."} (${okCount}/${clipIds.length})`
        );
      }
    } catch {
      toast.error(t("anErrorOccurred") || "An error occurred");
    } finally {
      setBulkDownloading(false);
      setBulkProgress(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6 text-xs text-slate-200">
        <p className="text-slate-400">{t("loading")}</p>
      </div>
    );
  }

  if (!playlist) return null;

  const selectedCount = selectedClipIds.size;
  const allSelected = playlist.clips.length > 0 && selectedCount === playlist.clips.length;
  const isDownloading = bulkDownloading || downloadingClipId !== null;

  return (
    <>
      <Toaster position="top-right" />
      <div className="mx-auto max-w-5xl space-y-6 p-6 text-xs text-slate-200">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Link href="/playlist" className="text-slate-400 hover:text-slate-200">
              ← {t("back") || "Back"}
            </Link>
            <h1 className="text-2xl font-semibold text-white">{playlist.name}</h1>
            {matchLabel && (
              <p className="text-[11px] text-slate-400">
                {matchLabel}
                {playlist.match?.date ? ` · ${new Date(playlist.match.date).toLocaleDateString("en-GB")}` : ""}
              </p>
            )}
          </div>
          <button
            onClick={deletePlaylist}
            disabled={deleting}
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] font-semibold text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? t("deleting") || "Deleting..." : t("deletePlaylist") || "Delete playlist"}
          </button>
        </div>

        <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <h2 className="text-sm font-semibold text-slate-100">{t("playlistDetails") || "Playlist details"}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400">{t("name") || "Name"}</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-800 bg-slate-900 px-3 text-[12px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400">{t("description") || "Description"}</label>
              <input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-800 bg-slate-900 px-3 text-[12px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
              />
            </div>
          </div>
          <button
            onClick={saveMeta}
            disabled={saving}
            className="rounded-md bg-emerald-500 px-3 py-2 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? t("saving") || "Saving..." : t("saveChanges") || "Save changes"}
          </button>
        </section>

        <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <h2 className="text-sm font-semibold text-slate-100">
            {(t("clips") || "Clips")} ({playlist._count.clips})
          </h2>
          {playlist.clips.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-700 px-3 py-4 text-[11px] text-slate-400">
              {t("noClipsInPlaylistYet") || "No clips in this playlist yet. Add clips from the match page in a next step."}
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-900/50 px-3 py-2">
                <label className="flex items-center gap-2 text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAllClips}
                    disabled={isDownloading}
                    className="h-3.5 w-3.5 min-h-0 min-w-0 shrink-0 rounded border-slate-600 bg-slate-900 accent-emerald-500"
                  />
                  {t("selectAllClips") || "Select all clips"}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">
                    {selectedCount} {t("selected") || "selected"}
                  </span>
                  <button
                    onClick={() => downloadMany([...selectedClipIds], "selected")}
                    disabled={isDownloading || selectedCount === 0}
                    className="rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-[11px] font-semibold text-blue-200 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {bulkDownloading && bulkProgress
                      ? `${t("downloading") || "Downloading..."} ${bulkProgress.done}/${bulkProgress.total}`
                      : t("downloadSelectedClips") || "Download selected"}
                  </button>
                  <button
                    onClick={() => downloadMany(playlist.clips.map((clip) => clip.id), "all")}
                    disabled={isDownloading || playlist.clips.length === 0}
                    className="rounded-md border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-[11px] font-semibold text-indigo-200 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t("downloadAllClips") || "Download all"}
                  </button>
                </div>
              </div>
              {playlist.clips.map((clip) => (
                <div
                  key={clip.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedClipIds.has(clip.id)}
                      onChange={() => toggleClipSelection(clip.id)}
                      disabled={isDownloading}
                      className="mt-1 h-3.5 w-3.5 min-h-0 min-w-0 shrink-0 rounded border-slate-600 bg-slate-900 accent-emerald-500"
                    />
                    <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-100">{clip.title}</p>
                    <p className="text-[11px] text-slate-400">
                      {formatSeconds(clip.startSec)} - {formatSeconds(clip.endSec)}
                      {clip.matchEvent
                        ? ` · ${clip.matchEvent.type}${clip.matchEvent.minute != null ? ` (${clip.matchEvent.minute}')` : ""}`
                        : ""}
                    </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/matches/${clip.match.slug}?t=${clip.startSec}`}
                      className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20"
                    >
                      {t("watchInMatch") || "Watch in match"}
                    </Link>
                    <button
                      onClick={() => downloadClip(clip.id)}
                      disabled={isDownloading}
                      className="rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-[11px] font-semibold text-blue-200 hover:bg-blue-500/20"
                    >
                      {downloadingClipId === clip.id
                        ? t("downloading") || "Downloading..."
                        : t("downloadClip") || "Download clip"}
                    </button>
                    <button
                      onClick={() => removeClip(clip.id)}
                      disabled={removingClipId === clip.id}
                      className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {removingClipId === clip.id ? t("removing") || "Removing..." : t("remove") || "Remove"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
