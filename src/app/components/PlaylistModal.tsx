"use client";

import { useState, FormEvent, useEffect } from "react";
import toast from "react-hot-toast";

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaylistSuccess?: () => void;
}

export function PlaylistModal({ isOpen, onClose, onPlaylistSuccess }: PlaylistModalProps) {
  const [creating, setCreating] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [description, setDescription] = useState("");
  const [matchId, setMatchId] = useState("");
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/matches")
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) {
            setMatches(data.matches || []);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!playlistName.trim()) {
      toast.error("Please enter a playlist name");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: playlistName,
          description,
          matchId: matchId ? parseInt(matchId) : null,
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        toast.success("Playlist created successfully!");
        onPlaylistSuccess?.();
        onClose();
        // Reset form
        setPlaylistName("");
        setDescription("");
        setMatchId("");
      } else {
        toast.error(data.message || "Failed to create playlist");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-lg rounded-xl border border-slate-800 bg-slate-950 p-6 text-xs text-slate-200 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-200 transition text-xl font-bold leading-none"
        >
          ×
        </button>

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">New Playlist</h2>
          <p className="text-[11px] text-slate-400 mt-1">
            Create a new playlist to organize video clips and key moments.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-300">Playlist Name *</label>
            <input
              type="text"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
              placeholder="e.g., High Press Moments"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-2 py-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60 resize-none"
              placeholder="Optional description..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-300">Match (Optional)</label>
            <select
              value={matchId}
              onChange={(e) => setMatchId(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            >
              <option value="">No specific match</option>
              {matches.map((match) => (
                <option key={match.id} value={match.id}>
                  {match.homeTeam?.name || "Home"} vs {match.awayTeam?.name || "Away"} - {new Date(match.date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 rounded-md border border-slate-700 bg-slate-900 text-[11px] font-semibold text-slate-200 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 h-9 rounded-md bg-emerald-500 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 transition"
            >
              {creating ? "Creating..." : "Create Playlist"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

