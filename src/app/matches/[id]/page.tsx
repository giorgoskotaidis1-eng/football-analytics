"use client";

import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useRef, useMemo, FormEvent, Suspense } from "react";
import { MatchEventForm } from "@/app/components/MatchEventForm";
import { VideoUpload } from "@/app/components/VideoUpload";
import { MatchTimeline } from "@/app/components/MatchTimeline";
import toast, { Toaster } from "react-hot-toast";

// Lazy load heavy components - using dynamic from next/dynamic instead of lazy for better Next.js compatibility
import dynamic from "next/dynamic";

const Heatmap = dynamic(() => import("@/app/components/Heatmap").then(m => ({ default: m.Heatmap })), { ssr: false });
const LineupEditor = dynamic(() => import("@/app/components/LineupEditor").then(m => ({ default: m.LineupEditor })), { ssr: false });
const XGTimelineChart = dynamic(() => import("@/app/components/XGTimelineChart").then(m => ({ default: m.XGTimelineChart })), { ssr: false });
const ShotAnalytics = dynamic(() => import("@/app/components/analytics/ShotAnalytics").then(m => ({ default: m.ShotAnalytics })), { ssr: false });
const PossessionChart = dynamic(() => import("@/app/components/PossessionChart").then(m => ({ default: m.PossessionChart })), { ssr: false });
const NetworkAnalysis = dynamic(() => import("@/app/components/NetworkAnalysis").then(m => ({ default: m.NetworkAnalysis })), { ssr: false });
const SenseMatrix = dynamic(() => import("@/app/components/SenseMatrix").then(m => ({ default: m.SenseMatrix })), { ssr: false });
const DistributionMap = dynamic(() => import("@/app/components/DistributionMap").then(m => ({ default: m.DistributionMap })), { ssr: false });
const ActivityField = dynamic(() => import("@/app/components/ActivityField").then(m => ({ default: m.ActivityField })), { ssr: false });
const VectorField = dynamic(() => import("@/app/components/analytics/VectorField").then(m => ({ default: m.VectorField })), { ssr: false });
const Spotlight = dynamic(() => import("@/app/components/Spotlight").then(m => ({ default: m.Spotlight })), { ssr: false });
const MatchDynamics = dynamic(() => import("@/app/components/analytics/MatchDynamics").then(m => ({ default: m.MatchDynamics })), { ssr: false });
const AnalysisNotes = dynamic(() => import("@/app/components/AnalysisNotes").then(m => ({ default: m.AnalysisNotes })), { ssr: false });
const KPICards = dynamic(() => import("@/app/components/KPICards").then(m => ({ default: m.KPICards })), { ssr: false });
const MatchSummary = dynamic(() => import("@/app/components/MatchSummary").then(m => ({ default: m.MatchSummary })), { ssr: false });


type TabKey =
  | "summary"
  | "lineup"
  | "leaderboards"
  | "network"
  | "matrix"
  | "distribution"
  | "activity"
  | "vector"
  | "spotlight"
  | "dynamics"
  | "shot-analytics";

type Match = {
  id: number;
  slug: string;
  competition: string;
  venue: string | null;
  date: string;
  scoreHome: number | null;
  scoreAway: number | null;
  xgHome: number | null;
  xgAway: number | null;
  shotsHome: number | null;
  shotsAway: number | null;
  homeTeam: { id: number; name: string } | null;
  awayTeam: { id: number; name: string } | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  videoPath?: string | null; // Match video path
};

export default function MatchDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper function to get team name (from registered team or opponent name)
  const getTeamName = (team: { name: string } | null, opponentName: string | null | undefined) => {
    return team?.name || opponentName || "Unknown";
  };
  
  // All hooks must be declared before any conditional returns
  const [comments, setComments] = useState<
    { id: number; author: string; body: string; createdAt: string }[]
  >([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load activeTab from localStorage
  const loadActiveTab = (): TabKey => {
    if (typeof window === "undefined") return "summary";
    try {
      const stored = localStorage.getItem(`match_${id}_activeTab`);
      if (stored && ["summary", "lineup", "leaderboards", "network", "matrix", "distribution", "activity", "vector", "spotlight", "dynamics", "shot-analytics"].includes(stored)) {
        return stored as TabKey;
      }
    } catch (e) {
      console.warn("[MatchDetail] Failed to load activeTab:", e);
    }
    return "summary";
  };
  
  const [activeTab, setActiveTab] = useState<TabKey>(loadActiveTab());
  
  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === "undefined" || !id) return;
    try {
      localStorage.setItem(`match_${id}_activeTab`, activeTab);
    } catch (e) {
      console.warn("[MatchDetail] Failed to save activeTab:", e);
    }
  }, [activeTab, id]);
  
  // Analytics state
  const [analytics, setAnalytics] = useState<{
    xg: { home: number; away: number };
    possession: { home: number; away: number };
    shots: {
      home: { total: number; onTarget: number; goals: number; totalXG: number; averageXG: number; conversionRate: number };
      away: { total: number; onTarget: number; goals: number; totalXG: number; averageXG: number; conversionRate: number };
    };
    heatmaps: { home: number[][]; away: number[][] };
    shotMaps: { home: number[][]; away: number[][] };
    ppda?: { home: number; away: number };
    highRegains?: { home: number; away: number };
    progressivePasses?: { home: number; away: number };
    xa?: { home: number; away: number };
    passAccuracy?: { home: number; away: number };
    events?: {
      total: number;
      byType: {
        shots: number;
        passes: number;
        touches: number;
        passesHomeSuccess?: number;
        passesAwaySuccess?: number;
        touchesHome?: number;
        touchesAway?: number;
      };
      passAccuracyHome?: number;
      passAccuracyAway?: number;
    };
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [players, setPlayers] = useState<Array<{ id: number; name: string; position: string; number?: number | null; teamId?: number | null }>>([]);
  const [events, setEvents] = useState<Array<{
    id: number;
    type: string;
    team: string;
    x: number | null;
    y: number | null;
    minute: number | null;
    xg: number | null;
    player: { id: number; name: string } | null;
    metadata: string | null;
  }>>([]);
  const [generatingHighlight, setGeneratingHighlight] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [highlights, setHighlights] = useState<Array<{
    minute: number;
    type: string;
    description: string;
    player?: string;
    team: string;
    xg?: number;
  }> | null>(null);
  const [showHighlightsModal, setShowHighlightsModal] = useState(false);

  // Fetch critical data first, then load non-critical data
  useEffect(() => {
    if (!id) return;
    
    async function fetchCriticalData() {
      try {
        // First, fetch only critical data: match and events
        const [matchRes, eventsRes] = await Promise.allSettled([
          fetch(`/api/matches/${id}`),
          fetch(`/api/matches/${id}/events`),
        ]);

        // Process match
        if (matchRes.status === "fulfilled" && matchRes.value.ok) {
          const matchData = await matchRes.value.json();
          if (matchData.ok) {
            setMatch(matchData.match);
          } else {
            notFound();
            return;
          }
        } else {
          notFound();
          return;
        }

        // Process events
        if (eventsRes.status === "fulfilled") {
          if (eventsRes.value.ok) {
            const eventsData = await eventsRes.value.json();
            if (eventsData.ok && eventsData.events) {
              setEvents(eventsData.events);
            } else {
              console.warn("[MatchDetailPage] Events response not ok:", eventsData);
              setEvents([]);
            }
          } else {
            // Handle error response
            const errorData = await eventsRes.value.json().catch(() => ({ message: "Unknown error" }));
            console.error(`[MatchDetailPage] Events fetch failed (${eventsRes.value.status}):`, errorData);
            setEvents([]);
            // Show error to user (optional - you can add a toast notification here)
          }
        } else {
          // Promise rejected
          console.error("[MatchDetailPage] Events fetch rejected:", eventsRes.reason);
          setEvents([]);
        }

        setLoading(false);

        // Now fetch non-critical data in background
        Promise.allSettled([
          fetch(`/api/comments?targetType=match&targetSlug=${encodeURIComponent(id as string)}`),
          fetch("/api/players"),
        ]).then(([commentsRes, playersRes]) => {
          // Process comments
          if (commentsRes.status === "fulfilled" && commentsRes.value.ok) {
            commentsRes.value.json().then((commentsData: any) => {
              if (commentsData.comments) {
                setComments(commentsData.comments);
              }
            }).catch(() => {});
          }

          // Process players
          if (playersRes.status === "fulfilled" && playersRes.value.ok) {
            playersRes.value.json().then((playersData: any) => {
              if (playersData.ok && playersData.players) {
                const mappedPlayers = playersData.players.map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  position: p.position || "",
                  number: p.number || null,
                  teamId: p.teamId || null,
                }));
                setPlayers(mappedPlayers);
              }
            }).catch(() => {});
          }
        });

        // Analytics will be loaded when needed (see useEffect below)
        setAnalyticsLoading(false);
      } catch (error) {
        console.error("[MatchDetail] Error fetching data:", error);
        notFound();
      } finally {
        setLoading(false);
      }
    }
    
    fetchCriticalData();
  }, [id, activeTab]);

  // Fetch analytics separately when events change (after initial load)
  async function fetchAnalytics() {
    if (!match?.id) return;
    try {
      const res = await fetch(`/api/matches/${match.id}/analytics`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.analytics) {
          setAnalytics(data.analytics);
        }
      }
    } catch {
      // Ignore errors
    } finally {
      setAnalyticsLoading(false);
    }
  }

  // Load analytics when events are available (needed for Summary tab)
  const eventsLengthRef = useRef(0);
  useEffect(() => {
    if (!match?.id) return;
    
    // Load analytics if we don't have it yet (regardless of active tab)
    // This ensures analytics are ready when user switches to Summary tab
    if (!analytics && !analyticsLoading && events.length >= 0) {
      setAnalyticsLoading(true);
      fetch(`/api/matches/${match.id}/analytics`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.ok && data.analytics) {
            setAnalytics(data.analytics);
          }
        })
        .catch(() => {})
        .finally(() => setAnalyticsLoading(false));
    }
    
    // Refetch analytics if events count changed (e.g., after video analysis or manual event addition)
    if (events.length !== eventsLengthRef.current) {
      fetchAnalytics();
      eventsLengthRef.current = events.length;
    }
  }, [match?.id, events.length, analytics, analyticsLoading]);

  // Prepare chart data - memoized to avoid recalculation on every render
  // IMPORTANT: All hooks must be declared before any conditional returns
  const xgTimelineData = useMemo(() => {
    if (!events || events.length === 0) return [];
    const shots = events.filter((e) => e.type === "shot" && e.minute !== null);
    const timeline: { [minute: number]: { home: number; away: number } } = {};
    
    shots.forEach((shot) => {
      const minute = shot.minute || 0;
      if (!timeline[minute]) {
        timeline[minute] = { home: 0, away: 0 };
      }
      const xg = shot.xg || 0;
      if (shot.team === "home") {
        timeline[minute].home += xg;
      } else {
        timeline[minute].away += xg;
      }
    });
    
    // Convert to array and accumulate
    let homeTotal = 0;
    let awayTotal = 0;
    return Object.keys(timeline)
      .map(Number)
      .sort((a, b) => a - b)
      .map((minute) => {
        homeTotal += timeline[minute].home;
        awayTotal += timeline[minute].away;
        return { minute, home: homeTotal, away: awayTotal };
      });
  }, [events]);

  // Shot Analytics data transformation
  const shotAnalyticsData = useMemo(() => {
    return events
      .filter((e) => e && e.type === "shot")
      .map((shot) => {
        const x = Number(shot.x);
        const y = Number(shot.y);
        
        // Parse outcome from metadata
        let outcome: "OnGoal" | "Wide" | "Blocked" | "Goal" | undefined = undefined;
        let goal = false;
        
        try {
          const metadata = shot.metadata ? JSON.parse(shot.metadata) : {};
          if (metadata && typeof metadata === "object") {
            const metaOutcome = String(metadata.outcome || "").toLowerCase();
            if (metaOutcome === "goal") {
              outcome = "Goal";
              goal = true;
            } else if (metaOutcome === "saved" || metaOutcome === "ongoal") {
              outcome = "OnGoal";
            } else if (metaOutcome === "blocked") {
              outcome = "Blocked";
            } else if (metaOutcome === "off_target" || metaOutcome === "wide") {
              outcome = "Wide";
            }
          }
        } catch {
          // Invalid JSON, use default
        }

        // Determine team ID
        const teamId = shot.team === "home" 
          ? String(match?.homeTeamId || "")
          : String(match?.awayTeamId || "");

        // Extract shot type from metadata if available
        let shotType: string | undefined = undefined;
        try {
          const metadata = shot.metadata ? JSON.parse(shot.metadata) : {};
          if (metadata && typeof metadata === "object" && metadata.shotType) {
            shotType = String(metadata.shotType);
          }
        } catch {
          // Invalid JSON, ignore
        }

        return {
          playerId: String(shot.player?.id || shot.id || ""),
          playerName: shot.player?.name || "Unknown",
          teamId,
          timeSec: (shot.minute || 0) * 60,
          x: Math.max(0, Math.min(1, x / 100)), // Convert 0-100 to 0-1
          y: Math.max(0, Math.min(1, y / 100)),
          goal,
          xg: shot.xg !== null && !isNaN(Number(shot.xg)) ? Number(shot.xg) : undefined,
          shotType,
          outcome,
        };
      })
      .filter((s) => s.x >= 0 && s.x <= 1 && s.y >= 0 && s.y <= 1);
  }, [events, match?.homeTeamId, match?.awayTeamId]);

  // Conditional returns must come after all hooks
  if (loading) {
    return (
      <div className="space-y-5 text-xs text-white/80">
        <p className="text-white/60">Loading match...</p>
      </div>
    );
  }

  if (!match) {
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
          targetType: "match",
          targetSlug: id,
          body: newComment.trim(),
        }),
      });
      setNewComment("");
      setComments((prev) => [
        ...prev,
        {
          id: prev.length ? prev[prev.length - 1].id + 1 : 1,
          author: "You",
          body: newComment.trim(),
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGenerateHighlight() {
    if (!match?.id) return;
    setGeneratingHighlight(true);
    try {
      const res = await fetch(`/api/matches/${match.id}/highlight`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to generate highlight" }));
        toast.error(errorData.message || `Error ${res.status}: Failed to generate highlight`);
        return;
      }
      
      const data = await res.json();
      if (data.ok) {
        setHighlights(data.highlight?.highlights || []);
        setShowHighlightsModal(true);
        toast.success("AI Highlight generated!", {
          duration: 3000,
        });
      } else {
        toast.error(data.message || "Failed to generate highlight");
      }
    } catch (error) {
      console.error("Generate highlight error:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setGeneratingHighlight(false);
    }
  }

  async function handleDownloadReport() {
    if (!match?.id) return;
    setDownloadingReport(true);
    try {
      const res = await fetch(`/api/matches/${match.id}/report`);
      const data = await res.json();
      if (res.ok && data.ok && data.downloadUrl) {
        // Ensure absolute URL for window.open
        const absoluteUrl = data.downloadUrl.startsWith("http") 
          ? data.downloadUrl 
          : `${window.location.origin}${data.downloadUrl}`;
        
        // Open report in new tab
        const newWindow = window.open(absoluteUrl, "_blank");
        if (!newWindow) {
          toast.error("Popup blocked. Please allow popups for this site.");
        } else {
          toast.success("Match report generated! Opening in new tab...");
        }
      } else {
        toast.error(data.message || "Failed to generate report");
      }
    } catch (error) {
      console.error("Download report error:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setDownloadingReport(false);
    }
  }

  // Conditional returns must come after all hooks
  if (loading) {
    return (
      <div className="space-y-5 text-xs text-white/80">
        <p className="text-white/60">Loading match...</p>
      </div>
    );
  }

  if (!match) {
    notFound();
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="space-y-5 text-xs text-slate-200">
      {/* Top Header Bar - iPad optimized */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-[#1a1f2e] bg-[#0b1220] px-4 py-3 gap-3 md:gap-0">
        <div className="flex items-center gap-3">
          <Link href="/matches" className="text-white/60 hover:text-white transition touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center">
            ←
          </Link>
          <h1 className="text-base md:text-lg font-semibold text-white">
            {getTeamName(match.homeTeam, match.homeTeamName)} vs {getTeamName(match.awayTeam, match.awayTeamName)}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleGenerateHighlight}
            disabled={generatingHighlight || !match}
            className="rounded-md bg-blue-500 px-4 py-2.5 text-[11px] md:text-[10px] font-medium text-white hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
          >
            {generatingHighlight ? "Δημιουργία..." : "Δημιουργία AI Highlight"}
          </button>
          <button
            onClick={handleDownloadReport}
            disabled={downloadingReport || !match}
            className="rounded-md bg-blue-500 px-4 py-2.5 text-[11px] md:text-[10px] font-medium text-white hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
          >
            {downloadingReport ? "Δημιουργία..." : "Λήψη Αναφοράς Αγώνα"}
          </button>
          <button className="rounded-md border border-[#1a1f2e] bg-[#0b1220] px-4 py-2.5 text-[11px] md:text-[10px] font-medium text-white/80 hover:bg-[#1a1f2e] transition touch-manipulation min-h-[44px]">
            Export ▼
          </button>
        </div>
      </header>

      {/* Match Header - Scoreline Section */}
      <header className="flex flex-col gap-4 rounded-xl border border-[#1a1f2e] bg-[#0b1220] p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] text-white/70">
              {new Date(match.date).toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })} • {match.competition}
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[#1a1f2e] border border-[#1a1f2e]" />
                <div>
                  <span className="text-lg font-semibold text-white">
                    {match.homeTeam?.name || (match as any).homeTeamName || "Unknown"}
                  </span>
                  {!match.homeTeam && (match as any).homeTeamName && (
                    <span className="text-[10px] text-white/50 ml-2">(Opponent)</span>
                  )}
                </div>
              </div>
              {match.scoreHome !== null && match.scoreAway !== null && (
                <div className="rounded-lg bg-green-500/20 border border-green-500/30 px-4 py-2">
                  <p className="text-xl font-bold text-green-400">
                    {match.scoreHome} - {match.scoreAway}
                  </p>
                  <p className="text-[10px] text-green-300">Full Time</p>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-lg font-semibold text-white">
                    {match.awayTeam?.name || (match as any).awayTeamName || "Unknown"}
                  </span>
                  {!match.awayTeam && (match as any).awayTeamName && (
                    <span className="text-[10px] text-white/50 ml-2">(Opponent)</span>
                  )}
                </div>
                <div className="h-12 w-12 rounded-full bg-[#1a1f2e] border border-[#1a1f2e]" />
              </div>
            </div>
          </div>
          {match.xgHome !== null && match.xgAway !== null && (
            <div className="rounded-lg border border-[#1a1f2e] bg-[#0b1220] px-4 py-2 text-right">
              <p className="text-[10px] text-white/70">xG home / away</p>
              <p className="text-lg font-semibold text-emerald-400">
                {match.xgHome.toFixed(2)}
                <span className="text-white/50"> / </span>
                <span className="text-sky-300">{match.xgAway.toFixed(2)}</span>
              </p>
            </div>
          )}
        </div>
      </header>

      <div className="rounded-xl border border-[#1a1f2e] bg-[#0b1220]">
        {/* Navigation Tabs - iPad optimized */}
        <div className="flex items-center border-b border-[#1a1f2e] bg-[#0b1220] px-2 md:px-4 overflow-x-auto subtle-scrollbar">
          <div className="flex gap-0 min-w-full">
            {[
              { key: "summary" as TabKey, label: "Summary" },
              { key: "lineup" as TabKey, label: "Match Line Up" },
              { key: "leaderboards" as TabKey, label: "Leaderboards" },
              { key: "network" as TabKey, label: "Network Analysis" },
              { key: "matrix" as TabKey, label: "Sense Matrix" },
              { key: "distribution" as TabKey, label: "Distribution Map" },
              { key: "activity" as TabKey, label: "Activity Field" },
              { key: "vector" as TabKey, label: "Vector Field" },
              { key: "spotlight" as TabKey, label: "Spotlight" },
              { key: "dynamics" as TabKey, label: "Match Dynamics" },
              { key: "shot-analytics" as TabKey, label: "Shot Analytics" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap px-4 md:px-4 py-3 md:py-2.5 text-[12px] md:text-[11px] font-medium transition-all border-b-2 touch-manipulation min-h-[44px] flex items-center ${
                  activeTab === tab.key
                    ? "border-yellow-400 text-yellow-400 bg-[#1a1f2e]"
                    : "border-transparent text-white/60 hover:text-white hover:border-[#1a1f2e] active:bg-[#1a1f2e]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 p-4 md:p-6">
          {activeTab === "summary" && (
            <>
              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 mb-6">
                {match && (
                  <>
                    <VideoUpload
                      matchId={match.id}
                      homeTeamId={match.homeTeamId}
                      awayTeamId={match.awayTeamId}
                      homeTeamName={getTeamName(match.homeTeam, match.homeTeamName)}
                      awayTeamName={getTeamName(match.awayTeam, match.awayTeamName)}
                      onAnalysisComplete={() => {
                        fetch(`/api/matches/${match.id}/events`)
                          .then((r) => r.json())
                          .then((d) => {
                            if (d.ok && d.events) setEvents(d.events);
                          });
                        fetchAnalytics();
                      }}
                    />
                    <MatchEventForm
                      matchId={match.id}
                      homeTeamName={getTeamName(match.homeTeam, match.homeTeamName)}
                      awayTeamName={getTeamName(match.awayTeam, match.awayTeamName)}
                      players={players}
                      onEventAdded={() => {
                        fetch(`/api/matches/${match.id}/events`)
                          .then((r) => r.json())
                          .then((d) => {
                            if (d.ok && d.events) setEvents(d.events);
                          });
                        fetchAnalytics();
                      }}
                    />
                  </>
                )}
              </div>

              {/* Beautiful Summary Component */}
              <Suspense fallback={<div className="h-96 animate-pulse bg-slate-900 rounded-2xl" />}>
                <MatchSummary
                  match={match}
                  events={events}
                  analytics={analytics}
                  xgTimelineData={xgTimelineData}
                  homeTeamName={getTeamName(match.homeTeam, match.homeTeamName)}
                  awayTeamName={getTeamName(match.awayTeam, match.awayTeamName)}
                />
              </Suspense>

              {/* Comments Section */}
              <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-[11px] text-slate-300 mt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Σχόλια προπονητικού επιτελείου</p>
                    <p className="text-[10px] text-slate-500">
                      Κεντρικοποιήστε τις παρατηρήσεις του αγώνα μεταξύ των μελών του επιτελείου. Αυτή η ενότητα είναι συνδεδεμένη με το API σχολίων.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {comments.length === 0 && (
                    <p className="text-[10px] text-slate-500">Δεν υπάρχουν σχόλια ακόμα. Προσθέστε την πρώτη σας τακτική σημείωση.</p>
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
                    placeholder="Κρίσιμες στιγμές, πίεση, άμυνα κατά την ανάπαυση..."
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
            </>
          )}

          {activeTab === "lineup" && (
            <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-[11px] text-slate-300">
              <div className="flex items-center justify-between">
                <p className="font-medium">Match Line Up</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Suspense fallback={<div className="h-96 animate-pulse bg-slate-900 rounded" />}>
                  <LineupEditor
                    matchId={match.id}
                    teamId={match.homeTeamId ?? null}
                    teamName={getTeamName(match.homeTeam, match.homeTeamName)}
                    players={players.filter((p) => p.teamId === match.homeTeamId)}
                    onSave={() => {
                      // Refresh or update UI
                    }}
                    onPlayerAdded={(newPlayer) => {
                      // Add new player to the players list
                      setPlayers([...players, newPlayer]);
                    }}
                  />
                </Suspense>
                <Suspense fallback={<div className="h-96 animate-pulse bg-slate-900 rounded" />}>
                  <LineupEditor
                    matchId={match.id}
                    teamId={match.awayTeamId || null}
                    teamName={getTeamName(match.awayTeam, match.awayTeamName)}
                    players={match.awayTeamId ? players.filter((p) => p.teamId === match.awayTeamId) : players.filter((p) => !p.teamId || p.teamId === null)}
                    onSave={() => {
                      // Refresh or update UI
                    }}
                    onPlayerAdded={(newPlayer) => {
                      // Add new player to the players list
                      setPlayers([...players, newPlayer]);
                    }}
                  />
                </Suspense>
              </div>
            </section>
          )}

          {activeTab === "leaderboards" && (() => {
            // Calculate Sense Score for each player with guards
            const playerScores = players
              .map((player) => {
                if (!player || !player.id) return null;
                
                const playerEvents = events.filter((e) => e && e.player?.id === player.id);
                const shots = Number(playerEvents.filter((e) => e.type === "shot").length) || 0;
                const passes = Number(playerEvents.filter((e) => e.type === "pass").length) || 0;
                const touches = Number(playerEvents.filter((e) => e.type === "touch").length) || 0;
                const tackles = Number(playerEvents.filter((e) => e.type === "tackle").length) || 0;
                const goals = Number(playerEvents.filter((e) => e.type === "goal").length) || 0;

                // Calculate Sense Score (same formula as SenseMatrix) with guards
                const senseScore = Math.min(
                  10,
                  Math.max(0, (shots * 2 + passes * 0.5 + touches * 0.3 + tackles * 1.5 + goals * 3) / 10)
                );

                // Determine team
                const isHomeTeam = match.homeTeamId && player.teamId === match.homeTeamId;
                const isAwayTeam = match.awayTeamId && player.teamId === match.awayTeamId;
                const teamName = isHomeTeam 
                  ? getTeamName(match.homeTeam, match.homeTeamName)
                  : isAwayTeam
                  ? getTeamName(match.awayTeam, match.awayTeamName)
                  : "Unknown";

                return {
                  player,
                  senseScore: Number(Math.round(senseScore * 10) / 10) || 0,
                  teamName,
                  isHome: isHomeTeam,
                  totalActions: Number(playerEvents.length) || 0,
                };
              })
              .filter((p): p is NonNullable<typeof p> => p !== null && p.totalActions > 0) // Only players with events
              .sort((a, b) => (b.senseScore || 0) - (a.senseScore || 0)) // Sort by Sense Score descending
              .slice(0, 20); // Top 20 players

            return (
              <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-[11px] text-slate-300">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Κατάταξη</p>
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400">Κορυφαίος Sense score</span>
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                  <table className="w-full border-collapse text-[11px] text-slate-300">
                    <thead className="bg-slate-900 text-slate-400">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Θέση</th>
                        <th className="px-3 py-2 text-left font-medium">Παίκτης</th>
                        <th className="px-3 py-2 text-left font-medium">Ομάδα</th>
                        <th className="px-3 py-2 text-left font-medium">Θέση</th>
                        <th className="px-3 py-2 text-right font-medium">Sense score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerScores.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                            Δεν υπάρχουν δεδομένα παικτών. Προσθέστε events για να δείτε την κατάταξη.
                          </td>
                        </tr>
                      ) : (
                        playerScores.map((item, idx) => (
                          <tr
                            key={item.player.id}
                            className={`border-t border-slate-800 ${
                              idx === 0
                                ? "bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950"
                                : idx === 1
                                ? "bg-slate-900/80"
                                : "bg-slate-900/50"
                            } hover:bg-slate-800/50`}
                          >
                            <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                            <td className="px-3 py-2">
                              {item.player.number ? `#${item.player.number} ` : ""}
                              {item.player.name}
                            </td>
                            <td className="px-3 py-2">{item.teamName}</td>
                            <td className="px-3 py-2">{item.player.position || "-"}</td>
                            <td className="px-3 py-2 text-right">
                              <span className="font-semibold text-emerald-400">{(item.senseScore || 0).toFixed(1)}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })()}

          {activeTab === "network" && (
            <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-[11px] text-slate-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Ανάλυση Δικτύου</p>
                  <p className="text-[10px] text-slate-500">Συνδέσεις πασών και αλληλεπιδράσεις παικτών</p>
                </div>
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400">Γράφος πασών</span>
              </div>
              <Suspense fallback={<div className="h-96 animate-pulse bg-slate-900 rounded" />}>
                <NetworkAnalysis
                  events={events.map(e => ({ ...e, playerId: e.player?.id || null }))}
                  players={players}
                  team="home"
                  teamName={getTeamName(match.homeTeam, match.homeTeamName)}
                  homeTeamId={match.homeTeamId}
                  awayTeamId={match.awayTeamId}
                  homeTeamName={getTeamName(match.homeTeam, match.homeTeamName)}
                  awayTeamName={getTeamName(match.awayTeam, match.awayTeamName)}
                />
              </Suspense>
            </section>
          )}

          {activeTab === "matrix" && (
            <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-[11px] text-slate-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sense Matrix</p>
                  <p className="text-[10px] text-slate-500">Απόδοση παικτών και ένταση αλληλεπίδρασης</p>
                </div>
              </div>
              <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
                <div style={{ minWidth: 200, minHeight: 200 }}>
                  <Suspense fallback={<div className="h-96 animate-pulse bg-slate-900 rounded" style={{ minWidth: 200, minHeight: 200 }} />}>
                    <SenseMatrix events={events.map(e => ({ ...e, playerId: e.player?.id || null }))} players={players} team="home" />
                  </Suspense>
                </div>
                <div style={{ minWidth: 200, minHeight: 200 }}>
                  <Suspense fallback={<div className="h-96 animate-pulse bg-slate-900 rounded" style={{ minWidth: 200, minHeight: 200 }} />}>
                    <SenseMatrix events={events.map(e => ({ ...e, playerId: e.player?.id || null }))} players={players} team="away" />
                  </Suspense>
                </div>
              </div>
            </section>
          )}
          {activeTab === "distribution" && (
            <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-[11px] text-slate-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Χάρτης Κατανομής</p>
                  <p className="text-[10px] text-slate-500">Κατανομή events σε ζώνες γηπέδου</p>
                </div>
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400">Όγκος πασών ανά ζώνη</span>
              </div>
              <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
                <div style={{ minWidth: 200, minHeight: 200 }}>
                  <Suspense fallback={<div className="h-96 animate-pulse bg-slate-900 rounded" style={{ minWidth: 200, minHeight: 200 }} />}>
                    <DistributionMap events={events} team="home" teamName={getTeamName(match.homeTeam, match.homeTeamName)} />
                  </Suspense>
                </div>
                <div style={{ minWidth: 200, minHeight: 200 }}>
                  <Suspense fallback={<div className="h-96 animate-pulse bg-slate-900 rounded" style={{ minWidth: 200, minHeight: 200 }} />}>
                    <DistributionMap events={events} team="away" teamName={getTeamName(match.awayTeam, match.awayTeamName)} />
                  </Suspense>
                </div>
              </div>
            </section>
          )}
          {activeTab === "activity" && (
            <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-[11px] text-slate-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Πεδίο Δραστηριότητας</p>
                  <p className="text-[10px] text-slate-500">Οπτικοποίηση χάρτη θερμότητας ζωνών δραστηριότητας παικτών</p>
                </div>
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400">Χάρτης θερμότητας ζώνης</span>
              </div>
              <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
                <div style={{ minWidth: 200, minHeight: 200 }}>
                  <Suspense fallback={<div className="h-96 animate-pulse bg-slate-900 rounded" style={{ minWidth: 200, minHeight: 200 }} />}>
                    <ActivityField events={events} team="home" teamName={getTeamName(match.homeTeam, match.homeTeamName)} />
                  </Suspense>
                </div>
                <div style={{ minWidth: 200, minHeight: 200 }}>
                  <Suspense fallback={<div className="h-96 animate-pulse bg-slate-900 rounded" style={{ minWidth: 200, minHeight: 200 }} />}>
                    <ActivityField events={events} team="away" teamName={getTeamName(match.awayTeam, match.awayTeamName)} />
                  </Suspense>
                </div>
              </div>
            </section>
          )}
          {activeTab === "vector" && (
            <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-[11px] text-slate-300">
              <Suspense fallback={<div className="h-96 animate-pulse bg-slate-900 rounded" />}>
                <VectorField
                  events={events.map(e => ({ ...e, playerId: e.player?.id || null }))}
                  players={players}
                  homeTeamId={match.homeTeamId}
                  awayTeamId={match.awayTeamId}
                  homeTeamName={getTeamName(match.homeTeam, match.homeTeamName)}
                  awayTeamName={getTeamName(match.awayTeam, match.awayTeamName)}
                />
              </Suspense>
            </section>
          )}
          {activeTab === "dynamics" && (
            <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-[11px] text-slate-300">
              <Suspense fallback={<div className="h-96 animate-pulse bg-slate-900 rounded" />}>
                <MatchDynamics
                  events={events}
                  homeTeamId={match.homeTeamId}
                  awayTeamId={match.awayTeamId}
                  homeTeamName={getTeamName(match.homeTeam, match.homeTeamName)}
                  awayTeamName={getTeamName(match.awayTeam, match.awayTeamName)}
                />
              </Suspense>
            </section>
          )}

          {activeTab === "shot-analytics" && (
            <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-[11px] text-slate-300">
              <Suspense fallback={<div className="h-96 animate-pulse bg-slate-900 rounded" />}>
                <ShotAnalytics
                  shots={shotAnalyticsData}
                  homeTeamName={getTeamName(match.homeTeam, match.homeTeamName)}
                  awayTeamName={getTeamName(match.awayTeam, match.awayTeamName)}
                  homeTeamId={String(match.homeTeamId || "")}
                  awayTeamId={String(match.awayTeamId || "")}
                />
              </Suspense>
            </section>
          )}

          {activeTab === "spotlight" && (
            <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-[11px] text-slate-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Spotlight</p>
                  <p className="text-[10px] text-slate-500">Κρίσιμες στιγμές και highlights από τον αγώνα</p>
                </div>
                <div className="flex gap-2 text-[10px]">
                  <button className="rounded-full bg-emerald-500 px-3 py-1 font-medium text-slate-950 hover:bg-emerald-400 transition">
                    Δημιουργία AI highlight
                  </button>
                  <button className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 font-medium text-slate-200 hover:bg-slate-800 transition">
                    Λήψη αναφοράς αγώνα
                  </button>
                </div>
              </div>
              <Suspense fallback={<div className="h-96 animate-pulse bg-slate-900 rounded" />}>
                <Spotlight 
                  events={events as any} 
                  matchId={match.id}
                  videoUrl={match.videoPath ? (() => {
                    // Handle different path formats
                    if (match.videoPath.startsWith('http')) {
                      return match.videoPath;
                    }
                    // Convert absolute or relative path to relative format (videos/match-X/file.mp4)
                    let relPath = match.videoPath;
                    // If absolute path, extract relative part
                    if (relPath.match(/^[A-Za-z]:\\/) || relPath.startsWith('/')) {
                      // Extract videos/match-X/... part
                      const matchPath = relPath.match(/uploads[\/\\]videos[\/\\]match-\d+[\/\\](.+)$/i);
                      if (matchPath) {
                        relPath = `videos/match-${match.id}/${matchPath[1]}`;
                      } else {
                        // Try to get relative from process.cwd()
                        const uploadsIndex = relPath.indexOf('uploads');
                        if (uploadsIndex !== -1) {
                          relPath = relPath.substring(uploadsIndex + 8).replace(/\\/g, '/');
                        }
                      }
                    } else {
                      // Already relative - ensure it starts with videos/ not uploads/
                      relPath = relPath.replace(/^uploads[\/\\]?/i, '').replace(/\\/g, '/');
                    }
                    return `/api/matches/${match.id}/video?path=${encodeURIComponent(relPath)}`;
                  })() : null}
                  homeTeamId={match.homeTeamId}
                  awayTeamId={match.awayTeamId}
                />
              </Suspense>
            </section>
          )}
        </div>
      </div>
    </div>

    {/* AI Highlights Modal */}
    {showHighlightsModal && highlights && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950/95 p-6 text-xs text-slate-200 shadow-2xl max-h-[80vh] overflow-y-auto">
          <div className="mb-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">AI Highlights</p>
              <h2 className="text-lg font-semibold tracking-tight text-slate-50">
                {getTeamName(match?.homeTeam || null, match?.homeTeamName)} vs {getTeamName(match?.awayTeam || null, match?.awayTeamName)}
              </h2>
            </div>
            <button
              onClick={() => setShowHighlightsModal(false)}
              className="h-8 w-8 rounded-full bg-slate-900 text-[11px] text-slate-400 hover:bg-slate-800 transition"
            >
              ×
            </button>
          </div>
          <div className="space-y-2">
            {highlights.length > 0 ? (
              highlights.map((highlight, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-xs font-semibold text-blue-300">
                    {highlight.minute}'
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${
                        highlight.type === "goal" ? "text-emerald-400" :
                        highlight.type === "chance" ? "text-yellow-400" :
                        "text-blue-400"
                      }`}>
                        {highlight.type === "goal" ? "⚽ GOAL" :
                         highlight.type === "chance" ? "🎯 BIG CHANCE" :
                         "🎯 ASSIST"}
                      </span>
                      {highlight.xg && (
                        <span className="text-[10px] text-slate-500">xG: {highlight.xg.toFixed(2)}</span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-200">{highlight.description}</p>
                    {highlight.player && (
                      <p className="mt-1 text-[10px] text-slate-400">Player: {highlight.player} • Team: {highlight.team === "home" ? getTeamName(match?.homeTeam || null, match?.homeTeamName) : getTeamName(match?.awayTeam || null, match?.awayTeamName)}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-[11px] text-slate-500 py-4">No highlights found for this match.</p>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setShowHighlightsModal(false)}
              className="h-8 rounded-md bg-emerald-500 px-4 text-[11px] font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

