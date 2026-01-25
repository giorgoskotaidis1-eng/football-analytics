"use client";

import { useEffect, useState } from "react";
import { PlayerStatsModal } from "@/app/components/admin/PlayerStatsModal";
import { SendPlayerHighlightModal } from "@/app/components/admin/SendPlayerHighlightModal";
import { PlayerAccountModal } from "@/app/components/admin/PlayerAccountModal";
import { useTranslation } from "@/lib/i18n";

type Player = {
  id: number;
  name: string;
  position: string;
  number: number | null;
  team: { id: number; name: string } | null;
  email?: string | null;
  goals: number | null;
  assists: number | null;
  xg: number | null;
  xag: number | null;
  shotsPer90: number | null;
  keyPassesPer90: number | null;
  pressuresPer90: number | null;
  progressivePassesPer90: number | null;
  carriesIntoFinalThirdPer90: number | null;
  defensiveDuelsWonPer90: number | null;
};

export default function PlayerStatsAdminPage() {
  const { t } = useTranslation();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "goals" | "assists" | "xg">("name");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [highlightPlayer, setHighlightPlayer] = useState<Player | null>(null);
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [accountPlayer, setAccountPlayer] = useState<Player | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, []);

  async function fetchPlayers() {
    try {
      setLoading(true);
      const res = await fetch("/api/players?limit=1000");
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.players) {
          setPlayers(data.players);
        }
      }
    } catch (error) {
      console.error("[PlayerStatsAdmin] Error:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredPlayers = players
    .filter((p) => {
      const query = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(query) ||
        p.position.toLowerCase().includes(query) ||
        p.team?.name.toLowerCase().includes(query) ||
        (p.number && p.number.toString().includes(query))
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "goals":
          return (b.goals || 0) - (a.goals || 0);
        case "assists":
          return (b.assists || 0) - (a.assists || 0);
        case "xg":
          return (b.xg || 0) - (a.xg || 0);
        default:
          return a.name.localeCompare(b.name);
      }
    });

  function handleOpenModal(player: Player) {
    setSelectedPlayer(player);
    setShowModal(true);
  }

  function handleOpenHighlightModal(player: Player) {
    setHighlightPlayer(player);
    setShowHighlightModal(true);
  }

  function handleOpenAccountModal(player: Player) {
    setAccountPlayer(player);
    setShowAccountModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
    setSelectedPlayer(null);
    fetchPlayers(); // Refresh after update
  }

  async function handleCSVUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload-stats", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          alert(`Successfully uploaded stats for ${data.updated} players`);
          fetchPlayers();
        } else {
          alert(`Error: ${data.message}`);
        }
      } else {
        const error = await res.json();
        alert(`Error: ${error.message || "Upload failed"}`);
      }
    } catch (error) {
      console.error("[CSV Upload] Error:", error);
      alert("Failed to upload CSV file");
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = "";
    }
  }

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
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 shadow-lg">
            <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Admin</p>
            <h1 className="text-lg font-semibold tracking-tight text-slate-50">{t("playerStatisticsManagement")}</h1>
            <p className="text-[11px] text-slate-500">
              {t("manageAndUpdateStats")}
            </p>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={t("searchPlayers")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-blue-500/20 bg-slate-950/80 px-10 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-xl border border-blue-500/20 bg-slate-950/80 px-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          >
            <option value="name">{t("sortByName")}</option>
            <option value="goals">{t("sortByGoals")}</option>
            <option value="assists">{t("sortByAssists")}</option>
            <option value="xg">{t("sortByXg")}</option>
          </select>
        </div>

        {/* CSV Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (recalculating) return;
              try {
                setRecalculating(true);
                const res = await fetch("/api/admin/recalculate-player-stats", {
                  method: "POST",
                });
                const data = await res.json();
                if (data.ok) {
                  alert(t("statsRecalculated") + ` (${data.successful || data.message})`);
                  fetchPlayers(); // Refresh player list
                } else {
                  alert(t("statsRecalculationFailed") + ": " + (data.message || "Unknown error"));
                }
              } catch (error) {
                console.error("[Recalculate] Error:", error);
                alert(t("statsRecalculationFailed"));
              } finally {
                setRecalculating(false);
              }
            }}
            disabled={recalculating}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 px-4 py-2.5 text-sm font-semibold text-emerald-200 cursor-pointer transition-all hover:from-emerald-500/30 hover:to-teal-500/30 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {recalculating ? t("recalculating") : t("recalculateStats")}
          </button>
          <button
            onClick={() => {
              // Create CSV template
              const csv = "Player ID,Goals,Assists,xG,xAG,Shots per 90,Key Passes per 90,Pressures per 90,Progressive Passes per 90,Carries into Final Third per 90,Defensive Duels Won per 90\n1,6,2,0.45,0.12,3.2,1.8,12.5,4.2,2.1,3.5\n2,3,5,0.75,0.25,2.8,2.5,10.2,5.1,1.8,2.9";
              const blob = new Blob([csv], { type: "text/csv" });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "player-stats-template.csv";
              a.click();
              window.URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-all hover:bg-slate-800/50 hover:border-slate-600/50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t("downloadTemplate")}
          </button>
          <label className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 px-4 py-2.5 text-sm font-semibold text-blue-200 cursor-pointer transition-all hover:from-blue-500/30 hover:to-cyan-500/30 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {uploading ? t("uploading") : t("uploadCsv")}
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleCSVUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Players Table */}
      <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-slate-950/90 via-slate-900/95 to-slate-950/90 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-gradient-to-r from-blue-950/60 via-cyan-950/60 to-blue-950/60 border-b border-blue-500/30">
              <tr>
                <th className="px-5 py-4 text-left font-semibold text-slate-300 uppercase tracking-wider text-[10px]">{t("playerName")}</th>
                <th className="px-5 py-4 text-left font-semibold text-slate-300 uppercase tracking-wider text-[10px]">{t("teamName")}</th>
                <th className="px-5 py-4 text-center font-semibold text-slate-300 uppercase tracking-wider text-[10px]">{t("goals")}</th>
                <th className="px-5 py-4 text-center font-semibold text-slate-300 uppercase tracking-wider text-[10px]">{t("assists")}</th>
                <th className="px-5 py-4 text-center font-semibold text-slate-300 uppercase tracking-wider text-[10px]">{t("xg")}</th>
                <th className="px-5 py-4 text-center font-semibold text-slate-300 uppercase tracking-wider text-[10px]">xAG</th>
                <th className="px-5 py-4 text-center font-semibold text-slate-300 uppercase tracking-wider text-[10px]">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="h-12 w-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <p className="text-sm font-medium">{t("noPlayersFound")}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player) => (
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
                          <div className="text-[10px] text-slate-500 font-medium">{player.position}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-slate-300 font-medium">{player.team?.name || "-"}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center rounded-lg bg-yellow-500/10 px-2.5 py-1 text-[10px] font-semibold text-yellow-400 border border-yellow-500/20">
                        {player.goals ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center rounded-lg bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
                        {player.assists ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center rounded-lg bg-purple-500/10 px-2.5 py-1 text-[10px] font-semibold text-purple-400 border border-purple-500/20">
                        {(player.xg ?? 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center rounded-lg bg-green-500/10 px-2.5 py-1 text-[10px] font-semibold text-green-400 border border-green-500/20">
                        {(player.xag ?? 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(player)}
                          className="rounded-lg border border-blue-500/30 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 px-3 py-1.5 text-[10px] font-semibold text-blue-200 transition-all hover:from-blue-500/30 hover:to-cyan-500/30 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20"
                        >
                          {t("editStats")}
                        </button>
                        <button
                          onClick={() => handleOpenHighlightModal(player)}
                          className="rounded-lg border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 px-3 py-1.5 text-[10px] font-semibold text-emerald-200 transition-all hover:from-emerald-500/25 hover:to-teal-500/25 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/20"
                          title="Αποστολή highlights και heatmap στον παίκτη"
                        >
                          Highlights
                        </button>
                        <button
                          onClick={() => handleOpenAccountModal(player)}
                          className="rounded-lg border border-slate-600/70 bg-slate-900/60 px-3 py-1.5 text-[10px] font-semibold text-slate-200 transition-all hover:bg-slate-800 hover:border-slate-500"
                          title="Ρύθμιση email & κωδικού για τον παίκτη"
                        >
                          Account
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Modal */}
      {showModal && selectedPlayer && (
        <PlayerStatsModal player={selectedPlayer} onClose={handleCloseModal} onSave={handleCloseModal} />
      )}

      {showHighlightModal && highlightPlayer && (
        <SendPlayerHighlightModal player={highlightPlayer} onClose={() => setShowHighlightModal(false)} />
      )}

      {showAccountModal && accountPlayer && (
        <PlayerAccountModal
          player={accountPlayer}
          onClose={() => setShowAccountModal(false)}
          onSaved={fetchPlayers}
        />
      )}
    </div>
  );
}

