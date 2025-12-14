"use client";

import { useState, FormEvent, useEffect } from "react";
import toast from "react-hot-toast";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportSuccess?: () => void;
}

export function ExportModal({ isOpen, onClose, onExportSuccess }: ExportModalProps) {
  const [exporting, setExporting] = useState(false);
  const [source, setSource] = useState("matches");
  const [format, setFormat] = useState("csv");
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState("");

  useEffect(() => {
    if (isOpen && source === "matches") {
      fetch("/api/matches")
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) {
            setMatches(data.matches || []);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, source]);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setExporting(true);

    try {
      const params = new URLSearchParams({
        source,
        format,
        ...(selectedMatch ? { matchId: selectedMatch } : {}),
      });

      const res = await fetch(`/api/exports/create?${params}`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        // Download the file
        if (data.downloadUrl) {
          window.open(data.downloadUrl, "_blank");
        }
        toast.success("Export created successfully!");
        onExportSuccess?.();
        onClose();
      } else {
        toast.error(data.message || "Failed to create export");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setExporting(false);
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
          <h2 className="text-lg font-semibold text-white">New Export</h2>
          <p className="text-[11px] text-slate-400 mt-1">
            Export match data, analytics, or reports in various formats.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-300">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            >
              <option value="matches">Matches</option>
              <option value="players">Players</option>
              <option value="statistics">Statistics</option>
              <option value="squad">Squad metrics</option>
            </select>
          </div>

          {source === "matches" && (
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-300">Match (Optional)</label>
              <select
                value={selectedMatch}
                onChange={(e) => setSelectedMatch(e.target.value)}
                className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
              >
                <option value="">All matches</option>
                {matches.map((match) => (
                  <option key={match.id} value={match.id}>
                    {match.homeTeam?.name || "Home"} vs {match.awayTeam?.name || "Away"} - {new Date(match.date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-300">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            >
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
              <option value="json">JSON</option>
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
              disabled={exporting}
              className="flex-1 h-9 rounded-md bg-emerald-500 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 transition"
            >
              {exporting ? "Exporting..." : "Create Export"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

