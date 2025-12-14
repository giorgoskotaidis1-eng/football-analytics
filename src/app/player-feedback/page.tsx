"use client";

import { useState, useEffect } from "react";
import { FeedbackModal } from "../components/FeedbackModal";
import { Toaster } from "react-hot-toast";
import { useTranslation } from "@/lib/i18n";

type Team = {
  id: number;
  name: string;
};

export default function PlayerFeedbackPage() {
  const { t } = useTranslation();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch teams
        const teamsRes = await fetch("/api/teams");
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          if (teamsData.ok && Array.isArray(teamsData.teams)) {
            setTeams(teamsData.teams);
          }
        }

        // Fetch players to get unique positions
        const playersRes = await fetch("/api/players");
        if (playersRes.ok) {
          const playersData = await playersRes.json();
          if (playersData.ok && Array.isArray(playersData.players)) {
            const uniquePositions = Array.from(
              new Set(playersData.players.map((p: any) => p.position).filter(Boolean))
            ).sort() as string[];
            setPositions(uniquePositions);
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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
                  Team
                </label>
                <div className="relative">
                  <select 
                    className="h-12 w-64 appearance-none rounded-lg border border-border bg-card px-4 pr-10 text-sm font-medium text-text outline-none transition-all focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20 hover:border-border/80"
                    disabled={loading}
                  >
                    <option className="bg-card text-text">All teams</option>
                    {teams.length > 0 ? (
                      teams.map((team) => (
                        <option key={team.id} value={team.id} className="bg-card text-text">
                          {team.name}
                        </option>
                      ))
                    ) : (
                      <option disabled className="bg-card text-muted">
                        {loading ? t("loading") : t("noTeamsAvailable")}
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
                  Position
                </label>
                <div className="relative">
                  <select 
                    className="h-12 w-48 appearance-none rounded-lg border border-border bg-card px-4 pr-10 text-sm font-medium text-text outline-none transition-all focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20 hover:border-border/80"
                    disabled={loading}
                  >
                    <option className="bg-card text-text">All positions</option>
                    {positions.length > 0 ? (
                      positions.map((position) => (
                        <option key={position} value={position} className="bg-card text-text">
                          {position}
                        </option>
                      ))
                    ) : (
                      <option disabled className="bg-card text-muted">
                        {loading ? t("loading") : t("noPositionsAvailable")}
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
            </div>
          </div>

          {/* Feedback Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {true ? (
              <div className="col-span-2 rounded-xl border border-border bg-card p-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="rounded-full bg-card border border-border p-4">
                    <svg className="h-10 w-10 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-text mb-1">{t("noPlayerFeedbackYet")}</p>
                    <p className="text-sm text-muted">
                      {t("thisFeatureWillBeAvailable")}
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
              [].map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 p-6"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
                        <span className="text-lg font-bold text-emerald-400">
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-base font-bold text-white">{p.name}</p>
                        <p className="text-xs text-slate-400">
                          {p.position} • {p.team}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 mb-1">Sense score</p>
                      <div className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 border border-emerald-500/30">
                        <span className="text-sm font-bold text-emerald-400">
                          {p.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 mb-4">
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">Strengths</p>
                      </div>
                      <ul className="space-y-1.5 text-sm text-slate-300">
                        {p.strengths.map((s) => (
                          <li key={s} className="flex items-start gap-2">
                            <span className="text-emerald-400 mt-0.5">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <svg className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">Focus for next block</p>
                      </div>
                      <ul className="space-y-1.5 text-sm text-slate-300">
                        {p.improvements.map((s) => (
                          <li key={s} className="flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <span className="text-xs text-slate-500">Last updated: -</span>
                    <button className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 text-xs font-medium text-slate-300 transition-all hover:bg-slate-800 hover:border-slate-600">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Open report
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>

        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          onFeedbackSuccess={() => {
            // Refresh page or update feedback list
            window.location.reload();
          }}
        />
      </div>
    </>
  );
}

                  <select 
                    className="h-12 w-48 appearance-none rounded-lg border border-border bg-card px-4 pr-10 text-sm font-medium text-text outline-none transition-all focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20 hover:border-border/80"
                    disabled={loading}
                  >
                    <option className="bg-card text-text">All positions</option>
                    {positions.length > 0 ? (
                      positions.map((position) => (
                        <option key={position} value={position} className="bg-card text-text">
                          {position}
                        </option>
                      ))
                    ) : (
                      <option disabled className="bg-card text-muted">
                        {loading ? t("loading") : t("noPositionsAvailable")}
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
            </div>
          </div>

          {/* Feedback Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {true ? (
              <div className="col-span-2 rounded-xl border border-border bg-card p-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="rounded-full bg-card border border-border p-4">
                    <svg className="h-10 w-10 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-text mb-1">{t("noPlayerFeedbackYet")}</p>
                    <p className="text-sm text-muted">
                      {t("thisFeatureWillBeAvailable")}
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
              [].map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 p-6"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
                        <span className="text-lg font-bold text-emerald-400">
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-base font-bold text-white">{p.name}</p>
                        <p className="text-xs text-slate-400">
                          {p.position} • {p.team}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 mb-1">Sense score</p>
                      <div className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 border border-emerald-500/30">
                        <span className="text-sm font-bold text-emerald-400">
                          {p.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 mb-4">
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">Strengths</p>
                      </div>
                      <ul className="space-y-1.5 text-sm text-slate-300">
                        {p.strengths.map((s) => (
                          <li key={s} className="flex items-start gap-2">
                            <span className="text-emerald-400 mt-0.5">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <svg className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">Focus for next block</p>
                      </div>
                      <ul className="space-y-1.5 text-sm text-slate-300">
                        {p.improvements.map((s) => (
                          <li key={s} className="flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <span className="text-xs text-slate-500">Last updated: -</span>
                    <button className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 text-xs font-medium text-slate-300 transition-all hover:bg-slate-800 hover:border-slate-600">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Open report
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>

        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          onFeedbackSuccess={() => {
            // Refresh page or update feedback list
            window.location.reload();
          }}
        />
      </div>
    </>
  );
}
