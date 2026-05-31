"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FeedbackModal } from "../components/FeedbackModal";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "@/lib/i18n";

type Team = {
  id: number;
  name: string;
};

type FeedbackPlayer = {
  id: number;
  name: string;
  position: string;
  club: string | null;
  team: { id: number; name: string } | null;
};

type FeedbackEntry = {
  id: number;
  playerId: number;
  strengths: string[];
  improvements: string[];
  rating: number | null;
  createdAt: string;
  updatedAt: string;
  player: FeedbackPlayer | null;
};

export default function PlayerFeedbackPage() {
  const { t } = useTranslation();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [filterTeamId, setFilterTeamId] = useState<string>("");
  const [filterPosition, setFilterPosition] = useState<string>("");
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchMeta() {
      try {
        const [teamsRes, playersRes] = await Promise.all([
          fetch("/api/teams"),
          fetch("/api/players"),
        ]);
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          if (!cancelled && teamsData.ok && Array.isArray(teamsData.teams)) {
            setTeams(teamsData.teams);
          }
        }
        if (playersRes.ok) {
          const playersData = await playersRes.json();
          if (!cancelled && playersData.ok && Array.isArray(playersData.players)) {
            const uniquePositions = Array.from(
              new Set(playersData.players.map((p: any) => p.position).filter(Boolean))
            ).sort() as string[];
            setPositions(uniquePositions);
          }
        }
      } catch (error) {
        console.error("Failed to fetch metadata:", error);
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    }
    fetchMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadFeedback = useCallback(async () => {
    setLoadingFeedback(true);
    try {
      const params = new URLSearchParams();
      if (filterTeamId) params.set("teamId", filterTeamId);
      if (filterPosition) params.set("position", filterPosition);
      const url = `/api/player-feedback${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.message || t("failedToLoadFeedback") || "Failed to load feedback");
        setFeedback([]);
        return;
      }
      setFeedback(Array.isArray(data.feedback) ? data.feedback : []);
    } catch {
      toast.error(t("failedToLoadFeedback") || "Failed to load feedback");
      setFeedback([]);
    } finally {
      setLoadingFeedback(false);
    }
  }, [filterTeamId, filterPosition, t]);

  useEffect(() => {
    void loadFeedback();
  }, [loadFeedback]);

  async function deleteFeedback(id: number) {
    if (!confirm(t("confirmDeleteFeedback") || "Delete this feedback?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/player-feedback?id=${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.message || t("failedToDeleteFeedback") || "Failed to delete feedback");
        return;
      }
      toast.success(t("feedbackDeleted") || "Feedback deleted");
      await loadFeedback();
    } catch {
      toast.error(t("anErrorOccurred") || "An error occurred");
    } finally {
      setDeletingId(null);
    }
  }

  const hasFilters = useMemo(
    () => Boolean(filterTeamId || filterPosition),
    [filterTeamId, filterPosition]
  );

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-bg">
        {/* Professional Header */}
        <header className="border-b border-border bg-bg/80 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t("tools")}</p>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-text mb-2">{t("playerNotes")}</h1>
                <p className="text-sm text-muted">
                  {t("playerNotesDescription")}
                </p>
              </div>
              <button
                onClick={() => setShowFeedbackModal(true)}
                className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-90 hover:scale-105"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t("newFeedback")}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-8">
          {/* Filters Panel */}
          <div className="mb-6 rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-text">
                  {t("team") || "Team"}
                </label>
                <div className="relative">
                  <select
                    value={filterTeamId}
                    onChange={(e) => setFilterTeamId(e.target.value)}
                    className="h-12 w-64 appearance-none rounded-lg border border-border bg-card px-4 pr-10 text-sm font-medium text-text outline-none transition-all focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20 hover:border-border/80"
                    disabled={loadingMeta}
                  >
                    <option value="" className="bg-card text-text">
                      {t("allTeams") || "All teams"}
                    </option>
                    {teams.length > 0 ? (
                      teams.map((team) => (
                        <option key={team.id} value={team.id} className="bg-card text-text">
                          {team.name}
                        </option>
                      ))
                    ) : (
                      <option disabled className="bg-card text-muted">
                        {loadingMeta ? t("loading") : t("noTeamsAvailable")}
                      </option>
                    )}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                    <svg className="h-5 w-5 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-text">
                  {t("position") || "Position"}
                </label>
                <div className="relative">
                  <select
                    value={filterPosition}
                    onChange={(e) => setFilterPosition(e.target.value)}
                    className="h-12 w-48 appearance-none rounded-lg border border-border bg-card px-4 pr-10 text-sm font-medium text-text outline-none transition-all focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20 hover:border-border/80"
                    disabled={loadingMeta}
                  >
                    <option value="" className="bg-card text-text">
                      {t("allPositions") || "All positions"}
                    </option>
                    {positions.length > 0 ? (
                      positions.map((position) => (
                        <option key={position} value={position} className="bg-card text-text">
                          {position}
                        </option>
                      ))
                    ) : (
                      <option disabled className="bg-card text-muted">
                        {loadingMeta ? t("loading") : t("noPositionsAvailable")}
                      </option>
                    )}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                    <svg className="h-5 w-5 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterTeamId("");
                    setFilterPosition("");
                  }}
                  className="h-12 rounded-lg border border-border bg-card px-4 text-xs font-semibold text-muted transition hover:border-border/80 hover:text-text"
                >
                  {t("clearFilters") || "Clear filters"}
                </button>
              )}
            </div>
          </div>

          {/* Feedback Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {loadingFeedback ? (
              <div className="col-span-2 rounded-xl border border-border bg-card p-12 text-center text-sm text-muted">
                {t("loading")}
              </div>
            ) : feedback.length === 0 ? (
              <div className="col-span-2 rounded-xl border border-border bg-card p-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="rounded-full bg-card border border-border p-4">
                    <svg className="h-10 w-10 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-text mb-1">
                      {hasFilters
                        ? t("noFeedbackForFilter") || "No feedback matches the selected filters."
                        : t("noPlayerFeedbackYet")}
                    </p>
                    <p className="text-sm text-muted">
                      {hasFilters
                        ? t("tryClearingFilters") || "Try clearing filters or create new feedback."
                        : t("createFirstFeedbackPrompt") || "Create the first feedback to see it appear here."}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowFeedbackModal(true)}
                    className="mt-2 flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-105"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t("createFirstFeedback")}
                  </button>
                </div>
              </div>
            ) : (
              feedback.map((entry) => {
                const playerName = entry.player?.name || `Player #${entry.playerId}`;
                const playerPosition = entry.player?.position || "—";
                const playerTeamLabel = entry.player?.team?.name || entry.player?.club || "—";
                const ratingDisplay = entry.rating != null ? entry.rating.toFixed(1) : "—";
                return (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-border bg-card p-6"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
                          <span className="text-lg font-bold text-emerald-400">
                            {playerName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-base font-bold text-text">{playerName}</p>
                          <p className="text-xs text-muted">
                            {playerPosition} • {playerTeamLabel}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted mb-1">{t("senseScore") || "Sense score"}</p>
                        <div className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 border border-emerald-500/30">
                          <span className="text-sm font-bold text-emerald-400">{ratingDisplay}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 mb-4">
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                            {t("strengths")}
                          </p>
                        </div>
                        {entry.strengths.length > 0 ? (
                          <ul className="space-y-1.5 text-sm text-text">
                            {entry.strengths.map((s, i) => (
                              <li key={`${entry.id}-s-${i}`} className="flex items-start gap-2">
                                <span className="text-emerald-400 mt-0.5">•</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted">—</p>
                        )}
                      </div>
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <svg className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
                            {t("focusForNextBlock")}
                          </p>
                        </div>
                        {entry.improvements.length > 0 ? (
                          <ul className="space-y-1.5 text-sm text-text">
                            {entry.improvements.map((s, i) => (
                              <li key={`${entry.id}-i-${i}`} className="flex items-start gap-2">
                                <span className="text-amber-400 mt-0.5">•</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted">—</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <span className="text-xs text-muted">
                        {(t("lastUpdated") || "Last updated")}:{" "}
                        {new Date(entry.updatedAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => deleteFeedback(entry.id)}
                        disabled={deletingId === entry.id}
                        className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-200 transition-all hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === entry.id
                          ? t("deleting") || "Deleting..."
                          : t("deleteFeedback") || "Delete feedback"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>

        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          onFeedbackSuccess={() => {
            void loadFeedback();
          }}
        />
      </div>
    </>
  );
}
