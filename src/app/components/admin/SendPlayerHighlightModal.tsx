"use client";

import { useEffect, useState } from "react";

type Player = {
  id: number;
  name: string;
  team?: { id: number; name: string } | null;
};

type MatchOption = {
  id: number;
  competition: string;
  date: string;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  homeTeam?: { id: number; name: string } | null;
  awayTeam?: { id: number; name: string } | null;
};

interface SendPlayerHighlightModalProps {
  player: Player;
  onClose: () => void;
}

export function SendPlayerHighlightModal({ player, onClose }: SendPlayerHighlightModalProps) {
  const [matches, setMatches] = useState<MatchOption[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [minute, setMinute] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [includeHeatmap, setIncludeHeatmap] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMatches() {
      try {
        setLoadingMatches(true);
        const teamId = player.team?.id;
        const url = teamId ? `/api/matches?limit=50&teamId=${teamId}` : "/api/matches?limit=50";
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && Array.isArray(data.matches)) {
          setMatches(data.matches);
        }
      } catch (e) {
        console.error("[SendPlayerHighlightModal] Failed to load matches", e);
      } finally {
        setLoadingMatches(false);
      }
    }
    fetchMatches();
  }, [player.team?.id]);

  function handleSelectMatch(id: number) {
    setSelectedMatchId(id);
    const match = matches.find((m) => m.id === id);
    if (match) {
      const homeName = match.homeTeam?.name || match.homeTeamName || "Home";
      const awayName = match.awayTeam?.name || match.awayTeamName || "Away";
      const dateStr = new Date(match.date).toLocaleDateString("el-GR");
      setDescription(
        `Highlight για ${player.name} από τον αγώνα ${homeName} - ${awayName} (${match.competition}, ${dateStr})`,
      );
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      if (!selectedMatchId) {
        setError("Επίλεξε αγώνα");
        return;
      }

      const minuteNum = minute ? parseInt(minute, 10) : 0;
      const timestamp = Math.max(0, isNaN(minuteNum) ? 0 : minuteNum * 60);

      const res = await fetch("/api/admin/player-highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player.id,
          matchId: selectedMatchId,
          timestamp,
          description: description || `Highlight για ${player.name}`,
          outcome: "CoachHighlight",
          includeHeatmap,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message || "Αποτυχία αποστολής highlight");
        return;
      }

      setSuccess("Το highlight στάλθηκε στο player dashboard");
      setTimeout(onClose, 1200);
    } catch (e) {
      console.error("[SendPlayerHighlightModal] Save error", e);
      setError("Απρόσμενο σφάλμα. Προσπάθησε ξανά.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
              <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Αποστολή highlight στον {player.name}
              </h2>
              {player.team?.name && (
                <p className="text-[11px] text-slate-400">{player.team.name}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto subtle-scrollbar">
          {/* Match select */}
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-slate-300">Αγώνας</label>
            {loadingMatches ? (
              <div className="h-10 rounded-lg bg-slate-900 animate-pulse" />
            ) : matches.length === 0 ? (
              <p className="text-xs text-slate-500">
                Δεν βρέθηκαν αγώνες. Πρόσθεσε αγώνες πρώτα.
              </p>
            ) : (
              <select
                value={selectedMatchId ?? ""}
                onChange={(e) => handleSelectMatch(parseInt(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              >
                <option value="">Επίλεξε αγώνα…</option>
                {matches.map((m) => {
                  const homeName = m.homeTeam?.name || m.homeTeamName || "Home";
                  const awayName = m.awayTeam?.name || m.awayTeamName || "Away";
                  const dateStr = new Date(m.date).toLocaleDateString("el-GR");
                  return (
                    <option key={m.id} value={m.id}>
                      {homeName} - {awayName} · {m.competition} · {dateStr}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Minute */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-slate-300">
                Λεπτό φάσης (προαιρετικό)
              </label>
              <input
                type="number"
                min={0}
                max={130}
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                placeholder="π.χ. 23"
              />
              <p className="text-[10px] text-slate-500">
                Θα γίνει προσέγγιση σε δευτερόλεπτα (λεπτό × 60).
              </p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
                <input
                  type="checkbox"
                  checked={includeHeatmap}
                  onChange={(e) => setIncludeHeatmap(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500/40"
                />
                Συμπερίληψη heatmap αγώνα
              </label>
              <p className="text-[10px] text-slate-500">
                Στο player dashboard ο παίκτης θα δει το highlight μαζί με heatmap του αγώνα.
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-slate-300">Περιγραφή</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              placeholder={`Σύντομη περιγραφή για τον ${player.name}…`}
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
          {success && <p className="text-xs text-emerald-400">{success}</p>}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700/50 bg-slate-900/50 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800/60 hover:border-slate-600/50"
            disabled={saving}
          >
            Κλείσιμο
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loadingMatches || matches.length === 0}
            className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:from-emerald-400 hover:to-teal-400 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Αποστολή..." : "Αποστολή στο player"}
          </button>
        </div>
      </div>
    </div>
  );
}







