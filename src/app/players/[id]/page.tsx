"use client";

import { notFound, useParams } from "next/navigation";
import { useEffect, useState, FormEvent } from "react";
import { PlayerTrendsChart } from "@/app/components/PlayerTrendsChart";

type Player = {
  id: number;
  name: string;
  position: string;
  age: number | null;
  club: string | null;
  nationality: string | null;
  foot: string | null;
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
  team: { id: number; name: string } | null;
};

export default function PlayerDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerStats, setPlayerStats] = useState<{
    matches: number;
    minutes: number;
    goals: number;
    assists: number;
    shots: number;
    shotsOnTarget: number;
    totalXG: number;
    averageXG: number;
    xA: number;
    passes: number;
    successfulPasses: number;
    passAccuracy: number;
    keyPasses: number;
    progressivePasses: number;
    passesIntoFinalThird: number;
    passesIntoPenaltyArea: number;
    longPasses: number;
    touches: number;
    tackles: number;
    interceptions: number;
    clearances: number;
    blocks: number;
    fouls: number;
    goalsPer90: number;
    assistsPer90: number;
    shotsPer90: number;
    xGPer90: number;
    xAPer90: number;
    passesPer90: number;
    keyPassesPer90: number;
    progressivePassesPer90: number;
    touchesPer90: number;
    tacklesPer90: number;
    interceptionsPer90: number;
    conversionRate: number;
  } | null>(null);
  const [trends, setTrends] = useState<Array<{
    matchId: number;
    date: string;
    opponent: string;
    competition: string;
    goals: number;
    assists: number;
    xg: number;
    xa: number;
    shots: number;
    passes: number;
    touches: number;
  }>>([]);
  const [trendsLoading, setTrendsLoading] = useState(true);
  const [comments, setComments] = useState<
    { id: number; author: string; body: string; createdAt: string }[]
  >([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function fetchPlayer() {
      try {
        console.log("[PlayerDetail] Fetching player with id/slug:", id);
        const res = await fetch(`/api/players/${id}`);
        console.log("[PlayerDetail] Response status:", res.status);
        if (res.ok) {
          const data = await res.json();
          console.log("[PlayerDetail] Response data:", data);
          if (data.ok) {
            setPlayer(data.player);
            if (data.stats) {
              setPlayerStats(data.stats);
            }
          } else {
            console.error("[PlayerDetail] API returned ok: false, message:", data.message);
            notFound();
          }
        } else {
          const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
          console.error("[PlayerDetail] API error:", res.status, errorData);
          notFound();
        }
      } catch (error) {
        console.error("[PlayerDetail] Fetch error:", error);
        notFound();
      } finally {
        setLoading(false);
      }
    }
    fetchPlayer();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/comments?targetType=player&targetSlug=${encodeURIComponent(id as string)}`,
        );
        const data = (await res.json().catch(() => ({}))) as {
          comments?: { id: number; author: string; body: string; createdAt: string }[];
        };
        if (res.ok && data.comments) {
          setComments(data.comments);
        }
      } catch {
        // skeleton: ignore errors
      }
    })();
  }, [id]);

  // Fetch performance trends
  useEffect(() => {
    if (!id) return;
    async function fetchTrends() {
      try {
        const res = await fetch(`/api/players/${id}/trends`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.trends) {
            setTrends(data.trends);
          }
        }
      } catch (error) {
        console.error("[PlayerDetail] Error fetching trends:", error);
      } finally {
        setTrendsLoading(false);
      }
    }
    fetchTrends();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-5 text-xs text-slate-200">
        <p className="text-slate-400">Φόρτωση παίκτη...</p>
      </div>
    );
  }

  if (!player) {
    notFound();
  }

  async function handleSubmitComment(e: FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || !id) return;
    setIsSubmitting(true);
    try {
      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "player",
          targetSlug: id,
          body: newComment.trim(),
        }),
      });
      setNewComment("");
      // Skeleton: optimistically append to local state
      setComments((prev) => [
        ...prev,
        {
          id: prev.length ? prev[prev.length - 1].id + 1 : 1,
          author: "Εσείς",
          body: newComment.trim(),
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 text-xs text-slate-200">
      <header className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Προφίλ παίκτη</p>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50">{player.name}</h1>
          <p className="text-[11px] text-slate-500">
            {player.position}
            {player.age ? ` • ${player.age} ετών` : ""}
            {player.club || player.team?.name ? ` • ${player.club || player.team?.name}` : ""}
            {player.nationality ? ` • ${player.nationality}` : ""}
            {player.foot ? ` • ${player.foot === "Right" ? "Δεξιό" : player.foot === "Left" ? "Αριστερό" : player.foot}-πόδι` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px]">
          {player.xg !== null && (
            <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-right">
              <p className="text-[10px] text-slate-400">xG</p>
              <p className="text-base font-semibold text-emerald-400">{player.xg.toFixed(1)}</p>
            </div>
          )}
          {player.xag !== null && (
            <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-right">
              <p className="text-[10px] text-slate-400">xAG</p>
              <p className="text-base font-semibold text-sky-300">{player.xag.toFixed(1)}</p>
            </div>
          )}
          {player.goals !== null && (
            <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-right">
              <p className="text-[10px] text-slate-400">Γκολ</p>
              <p className="text-base font-semibold text-amber-400">{player.goals}</p>
            </div>
          )}
          {player.assists !== null && (
            <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-right">
              <p className="text-[10px] text-slate-400">Ασίστ</p>
              <p className="text-base font-semibold text-blue-400">{player.assists}</p>
            </div>
          )}
        </div>
      </header>

      {/* Professional Stats Overview - Instat Style */}
      {playerStats && (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Στατιστικά Επιδόσεων</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {playerStats.matches} αγώνες • {playerStats.minutes} λεπτά συμμετοχής
                </p>
              </div>
            </div>

            {/* Key Metrics - Professional Cards */}
            <div className="grid gap-3 md:grid-cols-4">
              <div className="group relative overflow-hidden rounded-lg border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-4 transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Γκολ</p>
                    <p className="mt-2 text-2xl font-bold text-amber-400">{playerStats.goals}</p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {playerStats.goalsPer90 > 0 ? `${playerStats.goalsPer90.toFixed(2)} / 90` : "0.00 / 90"}
                    </p>
                  </div>
                  <div className="rounded-full bg-amber-500/20 p-2">
                    <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-lg border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-4 transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Ασίστ</p>
                    <p className="mt-2 text-2xl font-bold text-blue-400">{playerStats.assists}</p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {playerStats.assistsPer90 > 0 ? `${playerStats.assistsPer90.toFixed(2)} / 90` : "0.00 / 90"}
                    </p>
                  </div>
                  <div className="rounded-full bg-blue-500/20 p-2">
                    <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-lg border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-4 transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">xG</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-400">{playerStats.totalXG.toFixed(2)}</p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {playerStats.xGPer90 > 0 ? `${playerStats.xGPer90.toFixed(2)} / 90` : "0.00 / 90"}
                    </p>
                  </div>
                  <div className="rounded-full bg-emerald-500/20 p-2">
                    <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-lg border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-4 transition-all hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">xA</p>
                    <p className="mt-2 text-2xl font-bold text-sky-400">{playerStats.xA.toFixed(2)}</p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {playerStats.xAPer90 > 0 ? `${playerStats.xAPer90.toFixed(2)} / 90` : "0.00 / 90"}
                    </p>
                  </div>
                  <div className="rounded-full bg-sky-500/20 p-2">
                    <svg className="h-5 w-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Stats Grid */}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="rounded bg-purple-500/20 p-1">
                    <svg className="h-3.5 w-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                  </div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Σουτ</p>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-purple-500/20 p-0.5">
                        <svg className="h-3 w-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Σουτ</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200">{playerStats.shots}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-emerald-500/20 p-0.5">
                        <svg className="h-3 w-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Στο Τέρμα</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200">{playerStats.shotsOnTarget}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-amber-500/20 p-0.5">
                        <svg className="h-3 w-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Μετατροπή</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-400">{playerStats.conversionRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-emerald-500/20 p-0.5">
                        <svg className="h-3 w-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Μ.Ο. xG</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200">{playerStats.averageXG.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-sky-500/20 p-0.5">
                        <svg className="h-3 w-3 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Σουτ / 90</span>
                    </div>
                    <span className="text-[11px] font-semibold text-sky-300">{playerStats.shotsPer90.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="rounded bg-blue-500/20 p-1">
                    <svg className="h-3.5 w-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Πάσες</p>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-blue-500/20 p-0.5">
                        <svg className="h-3 w-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Σύνολο</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200">{playerStats.passes}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-emerald-500/20 p-0.5">
                        <svg className="h-3 w-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Επιτυχημένες</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200">{playerStats.successfulPasses}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-emerald-500/20 p-0.5">
                        <svg className="h-3 w-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Ακρίβεια</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-400">{playerStats.passAccuracy.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-blue-500/20 p-0.5">
                        <svg className="h-3 w-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Κρίσιμες Πάσες</span>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-400">{playerStats.keyPasses}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-emerald-500/20 p-0.5">
                        <svg className="h-3 w-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Προοδευτικές</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-400">{playerStats.progressivePasses}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-slate-500/20 p-0.5">
                        <svg className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Στο Τελικό Τρίτο</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200">{playerStats.passesIntoFinalThird}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-slate-500/20 p-0.5">
                        <svg className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Στην Περιοχή</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200">{playerStats.passesIntoPenaltyArea}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-slate-500/20 p-0.5">
                        <svg className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Μακρινές Πάσες</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200">{playerStats.longPasses}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-sky-500/20 p-0.5">
                        <svg className="h-3 w-3 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Πάσες / 90</span>
                    </div>
                    <span className="text-[11px] font-semibold text-sky-300">{playerStats.passesPer90.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-blue-500/20 p-0.5">
                        <svg className="h-3 w-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Κρίσιμες Πάσες / 90</span>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-300">{playerStats.keyPassesPer90.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-emerald-500/20 p-0.5">
                        <svg className="h-3 w-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Προοδευτικές / 90</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-300">{playerStats.progressivePassesPer90.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="rounded bg-red-500/20 p-1">
                    <svg className="h-3.5 w-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Αμυντικά</p>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-orange-500/20 p-0.5">
                        <svg className="h-3 w-3 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Κλεψίματα</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200">{playerStats.tackles}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-emerald-500/20 p-0.5">
                        <svg className="h-3 w-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Αναχαίτισεις</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-400">{playerStats.interceptions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-slate-500/20 p-0.5">
                        <svg className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5l14 14M5 19L19 5" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Καθαρίσματα</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200">{playerStats.clearances}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-slate-500/20 p-0.5">
                        <svg className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Μπλοκ</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200">{playerStats.blocks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-amber-500/20 p-0.5">
                        <svg className="h-3 w-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Φάουλ</span>
                    </div>
                    <span className="text-[11px] font-semibold text-amber-400">{playerStats.fouls}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-sky-500/20 p-0.5">
                        <svg className="h-3 w-3 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Κλεψίματα / 90</span>
                    </div>
                    <span className="text-[11px] font-semibold text-sky-300">{playerStats.tacklesPer90.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-emerald-500/20 p-0.5">
                        <svg className="h-3 w-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Αναχαίτισεις / 90</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-300">{playerStats.interceptionsPer90.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-800 pt-2 mt-1">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-slate-500/20 p-0.5">
                        <svg className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Αγγίγματα</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200">{playerStats.touches}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-sky-500/20 p-0.5">
                        <svg className="h-3 w-3 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Αγγίγματα / 90</span>
                    </div>
                    <span className="text-[11px] font-semibold text-sky-300">{playerStats.touchesPer90.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-800 pt-2 mt-1">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-slate-500/20 p-0.5">
                        <svg className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Λεπτά</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200">{playerStats.minutes}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-slate-500/20 p-0.5">
                        <svg className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Αγώνες</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200">{playerStats.matches}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-sky-500/20 p-0.5">
                        <svg className="h-3 w-3 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <span className="text-[11px] text-slate-400">Μ.Ο. Λεπτά</span>
                    </div>
                    <span className="text-[11px] font-semibold text-sky-300">
                      {playerStats.matches > 0 ? Math.round(playerStats.minutes / playerStats.matches) : 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-[11px] text-slate-300">
          <div>
            <p className="font-medium text-slate-200">Προφίλ Παίκτη</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Λεπτομερείς πληροφορίες και μετρικές
            </p>
          </div>

          {/* Player Info Card */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500">Θέση</span>
              <span className="text-[11px] font-semibold text-slate-200">{player.position}</span>
            </div>
            {player.age && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Ηλικία</span>
                <span className="text-[11px] font-semibold text-slate-200">{player.age} ετών</span>
              </div>
            )}
            {player.number && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Φανέλα #</span>
                <span className="text-[11px] font-semibold text-slate-200">#{player.number}</span>
              </div>
            )}
            {player.team && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Ομάδα</span>
                <span className="text-[11px] font-semibold text-slate-200">{player.team.name}</span>
              </div>
            )}
            {player.nationality && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Εθνικότητα</span>
                <span className="text-[11px] font-semibold text-slate-200">{player.nationality}</span>
              </div>
            )}
            {player.foot && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Προτιμώμενο Πόδι</span>
                <span className="text-[11px] font-semibold text-slate-200">{player.foot}</span>
              </div>
            )}
          </div>

          {/* Performance Rating */}
          {playerStats && (
            <div className="rounded-lg border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-4">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-3">Αξιολόγηση Επιδόσεων</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Συνολική Αξιολόγηση</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {((playerStats.goalsPer90 * 1.2 + playerStats.assistsPer90 * 0.8 + playerStats.xGPer90 * 0.5 + playerStats.passAccuracy / 10) / 4).toFixed(1)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                    style={{ width: `${Math.min(100, ((playerStats.goalsPer90 * 1.2 + playerStats.assistsPer90 * 0.8 + playerStats.xGPer90 * 0.5 + playerStats.passAccuracy / 10) / 4) * 10)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Additional Database Metrics */}
          {(player.pressuresPer90 !== null || player.keyPassesPer90 !== null || player.progressivePassesPer90 !== null) && (
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-3">Επιπλέον Μετρικές</p>
              <div className="space-y-2">
                {player.pressuresPer90 !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Πιέσεις / 90</span>
                    <span className="text-[11px] font-semibold text-slate-200">{player.pressuresPer90.toFixed(1)}</span>
                  </div>
                )}
                {player.keyPassesPer90 !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Κρίσιμες Πάσες / 90</span>
                    <span className="text-[11px] font-semibold text-slate-200">{player.keyPassesPer90.toFixed(1)}</span>
                  </div>
                )}
                {player.progressivePassesPer90 !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Προοδευτικές Πάσες / 90</span>
                    <span className="text-[11px] font-semibold text-slate-200">{player.progressivePassesPer90.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        </section>
      )}

      {/* Performance Trends */}
      {trends.length > 0 && (
        <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-[11px] text-slate-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Τάσεις Επιδόσεων</p>
              <p className="text-[10px] text-slate-500">Επιδόσεις παίκτη με την πάροδο του χρόνου σε αγώνες</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <PlayerTrendsChart
              trends={trends}
              metric="goals"
              title="Γκολ"
            />
            <PlayerTrendsChart
              trends={trends}
              metric="assists"
              title="Ασίστ"
            />
            <PlayerTrendsChart
              trends={trends}
              metric="xg"
              title="Αναμενόμενα Γκολ (xG)"
            />
            <PlayerTrendsChart
              trends={trends}
              metric="xa"
              title="Αναμενόμενες Ασίστ (xA)"
            />
            <PlayerTrendsChart
              trends={trends}
              metric="shots"
              title="Σουτ"
            />
            <PlayerTrendsChart
              trends={trends}
              metric="passes"
              title="Πάσες"
            />
          </div>
        </section>
      )}

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-[11px] text-slate-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Σχόλια προπονητικού επιτελείου</p>
            <p className="text-[10px] text-slate-500">
              Μοιραστείτε σημειώσεις μεταξύ προπονητή, αναλυτών και σκάουτερ για αυτόν τον παίκτη.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {comments.length === 0 && (
            <p className="text-[10px] text-slate-500">Δεν υπάρχουν ακόμα σχόλια. Ξεκινήστε τη συζήτηση με το επιτελείο σας.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="space-y-1 rounded-lg border border-slate-800 bg-slate-950 p-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>{c.author}</span>
                <span>{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-[11px] text-slate-200">{c.body}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmitComment} className="space-y-2">
          <label className="text-[11px] text-slate-400">Νέο σχόλιο</label>
          <textarea
            className="min-h-[60px] w-full rounded-md border border-slate-800 bg-slate-900 p-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            placeholder="Τακτικές σημειώσεις, εστίαση ανάπτυξης, ID σημαντικών clips..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            className="h-8 w-full rounded-md bg-emerald-500 text-[11px] font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Αποστολή..." : "Προσθήκη σχολίου"}
          </button>
        </form>
      </section>
    </div>
  );
}
