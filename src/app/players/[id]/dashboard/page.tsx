"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatsCards } from "@/app/components/player/StatsCards";
import { HighlightCarousel } from "@/app/components/player/HighlightCarousel";
import { PlayerHeatmap } from "@/app/components/player/PlayerHeatmap";
import { PlayerHeader } from "@/app/components/player/PlayerHeader";

type Player = {
  id: number;
  name: string;
  position: string;
  age: number | null;
  number: number | null;
  team: { id: number; name: string } | null;
  avatarUrl: string | null;
};

type PlayerStats = {
  goals: number;
  assists: number;
  xGTotal: number;
  shotsTotal: number;
  shotsOnTarget: number;
  passesCompleted: number;
  tacklesMade: number;
};

type Highlight = {
  id: string;
  description: string;
  timestamp: number;
  outcome: string;
  x: number;
  y: number;
  videoUrl?: string;
  matchId?: number;
  matchDate?: string;
  competition?: string;
};

export default function PlayerDashboardPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [heatmapData, setHeatmapData] = useState<Array<{ x: number; y: number }>>([]);
  const [heatmapType, setHeatmapType] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Heartbeat to keep player online status active
  useEffect(() => {
    if (!id || !dataLoaded) return;

    const heartbeat = setInterval(async () => {
      try {
        await fetch(`/api/admin/log-player-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId: parseInt(id),
            timestamp: new Date().toISOString(),
          }),
        });
      } catch {
        // ignore heartbeat errors
      }
    }, 60000); // Every 60 seconds

    return () => clearInterval(heartbeat);
  }, [id, dataLoaded]);

  // Initial data load - only once
  useEffect(() => {
    if (!id || dataLoaded) return;

    async function fetchInitialData() {
      try {
        setLoading(true);
        const [playerRes, statsRes, highlightsRes] = await Promise.all([
          fetch(`/api/player/${id}`),
          fetch(`/api/player/${id}/stats`),
          fetch(`/api/player/${id}/highlights`),
        ]);

        if (playerRes.ok) {
          const playerData = await playerRes.json();
          if (playerData.ok) {
            setPlayer(playerData.player);
          }
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData.ok) {
            setStats(statsData.stats);
          }
        }

        if (highlightsRes.ok) {
          const highlightsData = await highlightsRes.json();
          if (highlightsData.ok) {
            setHighlights(highlightsData.highlights);
          }
        }
      } catch (error) {
        console.error("[PlayerDashboard] Error:", error);
      } finally {
        setLoading(false);
        setDataLoaded(true);
      }
    }

    fetchInitialData();
  }, [id, dataLoaded]);

  // Heatmap data - separate effect that updates when heatmapType changes
  useEffect(() => {
    if (!id || !dataLoaded) return;

    async function fetchHeatmap() {
      try {
        const heatmapRes = await fetch(`/api/player/${id}/heatmap?type=${heatmapType}`);
        if (heatmapRes.ok) {
          const heatmapData = await heatmapRes.json();
          if (heatmapData.ok) {
            setHeatmapData(heatmapData.heatmap);
          }
        }
      } catch (error) {
        console.error("[PlayerDashboard] Heatmap error:", error);
      }
    }

    fetchHeatmap();
  }, [id, heatmapType, dataLoaded]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0c1f2f] via-[#0f1923] to-[#0c1f2f] p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="h-96 animate-pulse rounded-xl bg-[#142f43]" />
        </div>
      </div>
    );
  }

  if (!player || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0c1f2f] via-[#0f1923] to-[#0c1f2f] p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-xl border border-[#1a2f3f] bg-gradient-to-br from-[#0b1220] to-[#0f1620] p-8 text-center">
            <p className="text-white/60">Player not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c1f2f] via-[#0f1923] to-[#0c1f2f]">
      {/* Main Content - Player-focused, no general content */}
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="space-y-8">
          {/* Player Header */}
          <PlayerHeader player={player} stats={stats} />

          {/* Stats Section */}
          <section>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/25 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent">Personal Statistics</h2>
                <p className="text-sm text-white/60 font-medium">Detailed performance metrics</p>
              </div>
            </div>
            <StatsCards stats={stats} />
          </section>

          {/* Highlights Section */}
          <section>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/25 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent">Match Highlights</h2>
                <p className="text-sm text-white/60 font-medium">Key moments and actions</p>
              </div>
            </div>
            <HighlightCarousel highlights={highlights} />
          </section>

          {/* Heatmap Section */}
          <section>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/25 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent">Activity Heatmap</h2>
                  <p className="text-sm text-white/60 font-medium">Position and movement analysis</p>
                </div>
              </div>
              <select
                value={heatmapType}
                onChange={(e) => setHeatmapType(e.target.value)}
                className="rounded-xl border border-[#1a2f3f] bg-gradient-to-r from-[#0c1f2f] to-[#0f1923] px-4 py-2.5 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all hover:border-[#2a4f5f]"
              >
                <option value="all">All Events</option>
                <option value="shot">Shots</option>
                <option value="pass">Passes</option>
                <option value="touch">Touches</option>
              </select>
            </div>
            <PlayerHeatmap data={heatmapData} eventType={heatmapType} />
          </section>
        </div>
      </div>
    </div>
  );
}

