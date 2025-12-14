"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PlayerRadarChart } from "@/app/components/PlayerRadarChart";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "@/lib/i18n";

type Player = {
  id: number;
  name: string;
  position: string;
  age: number | null;
  number: number | null;
  team: { id: number; name: string } | null;
};

type PlayerStats = {
  id: number;
  name: string;
  position: string;
  age: number | null;
  number: number | null;
  team: { id: number; name: string } | null;
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
  touches: number;
  goalsPer90: number;
  assistsPer90: number;
  shotsPer90: number;
  xGPer90: number;
  xAPer90: number;
  passesPer90: number;
  touchesPer90: number;
  radarMetrics: {
    shooting: number;
    creativity: number;
    passing: number;
    involvement: number;
    efficiency: number;
  };
};

export default function PlayerComparePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPer90, setShowPer90] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [statCategory, setStatCategory] = useState<"all" | "attacking" | "passing" | "defending">("all");
  
  // Fix hydration mismatch by only rendering dynamic content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load player IDs from URL query params or localStorage
  useEffect(() => {
    const idsParam = searchParams.get("ids");
    console.log("[PlayerCompare] URL ids param:", idsParam, "searchParams:", searchParams.toString());
    
    let ids: number[] = [];
    
    if (idsParam) {
      // Priority 1: Use URL params if available
      ids = idsParam.split(",").map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      console.log("[PlayerCompare] Parsed IDs from URL:", ids, "count:", ids.length);
      
      // Save to localStorage for persistence
      if (ids.length >= 1 && ids.length <= 4) {
        try {
          localStorage.setItem("playerComparisonIds", JSON.stringify(ids));
          console.log("[PlayerCompare] Saved to localStorage:", ids);
        } catch (e) {
          console.warn("[PlayerCompare] Failed to save to localStorage:", e);
        }
      }
    } else {
      // Priority 2: Try to load from localStorage (for server reloads)
      try {
        const stored = localStorage.getItem("playerComparisonIds");
        if (stored) {
          const parsedIds = JSON.parse(stored);
          if (Array.isArray(parsedIds) && parsedIds.length >= 1 && parsedIds.length <= 4) {
            ids = parsedIds.map(id => parseInt(String(id))).filter(id => !isNaN(id) && id > 0);
            console.log("[PlayerCompare] Loaded from localStorage:", ids);
            
            // Update URL to match localStorage
            if (ids.length >= 1) {
              router.replace(`/players/compare?ids=${ids.join(",")}`);
            }
          }
        }
      } catch (e) {
        console.warn("[PlayerCompare] Failed to load from localStorage:", e);
      }
    }
    
    if (ids.length >= 1 && ids.length <= 4) {
      console.log("[PlayerCompare] Setting selected players:", ids);
      // Remove duplicates
      const uniqueIds = Array.from(new Set(ids));
      console.log("[PlayerCompare] Unique IDs:", uniqueIds);
      setSelectedPlayers(uniqueIds);
    } else if (ids.length === 0) {
      // If no IDs in URL or localStorage, redirect to players page
      console.log("[PlayerCompare] No IDs found, redirecting to /players");
      router.push("/players");
    } else {
      console.warn("[PlayerCompare] Invalid number of players:", ids.length);
      toast.error("Please select 1-4 players to compare");
      router.push("/players");
    }
  }, [searchParams, router]);

  useEffect(() => {
    // Fetch all players for selection (with pagination to get all)
    const fetchAllPlayers = async () => {
      try {
        console.log("[PlayerCompare] Starting to fetch all players...");
        let allPlayersList: Player[] = [];
        let page = 1;
        let hasMore = true;
        
        while (hasMore) {
          const res = await fetch(`/api/players?page=${page}&limit=50`);
          const data = await res.json();
          
          if (data.ok && Array.isArray(data.players)) {
            allPlayersList = [...allPlayersList, ...data.players];
            console.log(`[PlayerCompare] Loaded page ${page}: ${data.players.length} players (total: ${allPlayersList.length})`);
            hasMore = data.pagination?.hasMore || false;
            page++;
          } else {
            hasMore = false;
          }
        }
        
        console.log("[PlayerCompare] ✅ Loaded ALL players:", allPlayersList.length);
        console.log("[PlayerCompare] Player IDs:", allPlayersList.map(p => `${p.id}: ${p.name}`));
        setAllPlayers(allPlayersList);
      } catch (error) {
        console.error("[PlayerCompare] Failed to load players:", error);
        toast.error("Failed to load players");
      }
    };
    
    fetchAllPlayers();
  }, []);

  useEffect(() => {
    console.log("[PlayerCompare] selectedPlayers changed:", selectedPlayers, "length:", selectedPlayers.length);
    console.log("[PlayerCompare] allPlayers count:", allPlayers.length);
    if (selectedPlayers.length >= 1 && selectedPlayers.length <= 4) {
      // Wait a bit to ensure allPlayers are loaded, but don't wait too long
      const timer = setTimeout(() => {
        console.log("[PlayerCompare] Calling fetchComparison with selectedPlayers:", selectedPlayers);
        console.log("[PlayerCompare] allPlayers available:", allPlayers.length > 0);
        fetchComparison();
      }, 200); // Increased timeout to ensure allPlayers are loaded
      return () => clearTimeout(timer);
    } else {
      setPlayerStats([]);
    }
  }, [selectedPlayers, allPlayers.length]); // Add allPlayers.length as dependency

  async function fetchComparison() {
    if (selectedPlayers.length < 1) {
      console.warn("[PlayerCompare] fetchComparison called but selectedPlayers is empty");
      return;
    }
    
    // Wait for allPlayers to be loaded if not ready
    if (allPlayers.length === 0) {
      console.warn("[PlayerCompare] allPlayers not loaded yet, waiting...");
      setTimeout(() => fetchComparison(), 500);
      return;
    }
    
    setLoading(true);
    try {
      // Remove duplicates and ensure we have valid IDs
      const uniqueIds = Array.from(new Set(selectedPlayers)).filter(id => id > 0);
      console.log("[PlayerCompare] Fetching comparison for players:", uniqueIds, "count:", uniqueIds.length);
      console.log("[PlayerCompare] allPlayers available:", allPlayers.length, "players");
      console.log("[PlayerCompare] Checking if all selected players exist in allPlayers:");
      uniqueIds.forEach(id => {
        const exists = allPlayers.some(p => p.id === id);
        const player = allPlayers.find(p => p.id === id);
        console.log(`[PlayerCompare]   ID ${id}: ${exists ? `YES (${player?.name})` : 'NO'}`);
      });
      
      if (uniqueIds.length === 0) {
        console.warn("[PlayerCompare] No valid player IDs");
        setLoading(false);
        return;
      }
      
      const res = await fetch("/api/players/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerIds: uniqueIds }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (jsonError) {
        console.error("[PlayerCompare] Failed to parse JSON:", jsonError);
        toast.error("Invalid response from server");
        setPlayerStats([]);
        return;
      }
      
      console.log("[PlayerCompare] API response:", { 
        status: res.status, 
        ok: res.ok, 
        dataOk: data.ok, 
        hasPlayers: !!data.players,
        playersCount: data.players?.length 
      });
      
      if (res.ok && data.ok && Array.isArray(data.players)) {
        console.log("[PlayerCompare] ✅ Successfully received", data.players.length, "players from API");
        console.log("[PlayerCompare] Player stats data:", data.players.map((p: any) => ({ id: p.id, name: p.name })));
        console.log("[PlayerCompare] Expected", uniqueIds.length, "players, got", data.players.length);
        
        // ALWAYS ensure we have stats for ALL selected players (like Instat/Wyscout)
        // Create a map of received players
        const receivedPlayersMap = new Map(data.players.map((p: any) => [p.id, p]));
        
        console.log("[PlayerCompare] Building final stats for", uniqueIds.length, "selected players");
        console.log("[PlayerCompare] API returned", data.players.length, "players");
        console.log("[PlayerCompare] allPlayers available:", allPlayers.length);
        
        // Build final stats array with ALL selected players in the correct order
        const finalStats: any[] = [];
        for (const id of uniqueIds) {
          // If API returned stats for this player, use them
          if (receivedPlayersMap.has(id)) {
            finalStats.push(receivedPlayersMap.get(id));
            console.log("[PlayerCompare] ✅ Using API stats for player ID:", id);
            continue;
          }
          
          // Otherwise, create placeholder stats from allPlayers
          const player = allPlayers.find(p => p.id === id);
          if (!player) {
            console.error("[PlayerCompare] ❌ Player not found in allPlayers:", id);
            console.error("[PlayerCompare] Available player IDs:", allPlayers.map(p => p.id));
            // Still create placeholder with minimal info
            finalStats.push({
              id: id,
              name: `Player ${id}`,
              position: "N/A",
              age: null,
              number: null,
              team: null,
              matches: 0,
              minutes: 0,
              goals: 0,
              assists: 0,
              shots: 0,
              shotsOnTarget: 0,
              totalXG: 0,
              averageXG: 0,
              xA: 0,
              passes: 0,
              successfulPasses: 0,
              passAccuracy: 0,
              touches: 0,
              goalsPer90: 0,
              assistsPer90: 0,
              shotsPer90: 0,
              xGPer90: 0,
              xAPer90: 0,
              passesPer90: 0,
              touchesPer90: 0,
              radarMetrics: {
                shooting: 0,
                creativity: 0,
                passing: 0,
                involvement: 0,
                efficiency: 0,
              },
            });
            continue;
          }
          
          console.log("[PlayerCompare] Creating placeholder stats for:", player.name, "ID:", id);
          finalStats.push({
            id: player.id,
            name: player.name,
            position: player.position,
            age: player.age,
            number: player.number,
            team: player.team,
            matches: 0,
            minutes: 0,
            goals: 0,
            assists: 0,
            shots: 0,
            shotsOnTarget: 0,
            totalXG: 0,
            averageXG: 0,
            xA: 0,
            passes: 0,
            successfulPasses: 0,
            passAccuracy: 0,
            touches: 0,
            goalsPer90: 0,
            assistsPer90: 0,
            shotsPer90: 0,
            xGPer90: 0,
            xAPer90: 0,
            passesPer90: 0,
            touchesPer90: 0,
            radarMetrics: {
              shooting: 0,
              creativity: 0,
              passing: 0,
              involvement: 0,
              efficiency: 0,
            },
          });
        }
        
        const validFinalStats = finalStats.filter(Boolean);
        console.log("[PlayerCompare] ===== FINAL STATS =====");
        console.log("[PlayerCompare] Final stats array:", validFinalStats.length, "players");
        console.log("[PlayerCompare] Final player names:", validFinalStats.map((p: any) => `${p.id}: ${p.name}`));
        console.log("[PlayerCompare] Final player IDs:", validFinalStats.map((p: any) => p.id));
        
        if (validFinalStats.length !== uniqueIds.length) {
          console.error("[PlayerCompare] ❌ MISMATCH! Expected", uniqueIds.length, "but got", validFinalStats.length);
          console.error("[PlayerCompare] Expected IDs:", uniqueIds);
          console.error("[PlayerCompare] Got IDs:", validFinalStats.map((p: any) => p.id));
        } else {
          console.log("[PlayerCompare] ✅ All players included in final stats!");
        }
        
        setPlayerStats(validFinalStats);
      } else {
        console.error("[PlayerCompare] Failed:", { 
          resOk: res.ok, 
          dataOk: data.ok, 
          message: data.message,
          status: res.status 
        });
        toast.error(data.message || `Failed to fetch comparison data (Status: ${res.status})`);
        setPlayerStats([]);
      }
    } catch (error) {
      console.error("[PlayerCompare] Network error:", error);
      toast.error("Network error. Please try again.");
      setPlayerStats([]);
    } finally {
      setLoading(false);
    }
  }

  function handlePlayerSelect(playerId: number) {
    if (selectedPlayers.includes(playerId)) {
      const newSelected = selectedPlayers.filter((id) => id !== playerId);
      setSelectedPlayers(newSelected);
      // Update URL and localStorage
      if (newSelected.length >= 1) {
        const idsParam = newSelected.join(",");
        router.push(`/players/compare?ids=${idsParam}`);
        try {
          localStorage.setItem("playerComparisonIds", JSON.stringify(newSelected));
          console.log("[PlayerCompare] Updated localStorage:", newSelected);
        } catch (e) {
          console.warn("[PlayerCompare] Failed to update localStorage:", e);
        }
      } else {
        router.push("/players");
        try {
          localStorage.removeItem("playerComparisonIds");
          console.log("[PlayerCompare] Cleared localStorage");
        } catch (e) {
          console.warn("[PlayerCompare] Failed to clear localStorage:", e);
        }
      }
    } else {
      if (selectedPlayers.length < 4) {
        const newSelected = [...selectedPlayers, playerId];
        setSelectedPlayers(newSelected);
        // Update URL and localStorage
        const idsParam = newSelected.join(",");
        router.push(`/players/compare?ids=${idsParam}`);
        try {
          localStorage.setItem("playerComparisonIds", JSON.stringify(newSelected));
          console.log("[PlayerCompare] Updated localStorage:", newSelected);
        } catch (e) {
          console.warn("[PlayerCompare] Failed to update localStorage:", e);
        }
      } else {
        toast.error("Maximum 4 players can be compared");
      }
    }
  }

  function getSelectedPlayerNames() {
    return selectedPlayers
      .map((id) => allPlayers.find((p) => p.id === id)?.name)
      .filter(Boolean);
  }

  // Icon component for stats
  function StatIcon({ statKey }: { statKey: string }) {
    const iconClass = "h-4 w-4 text-slate-400";
    switch (statKey) {
      case "matches":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case "minutes":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "goals":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
      case "assists":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case "shots":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        );
      case "shotsOnTarget":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case "totalXG":
      case "averageXG":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case "xA":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "passes":
      case "successfulPasses":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case "passAccuracy":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "touches":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        );
      default:
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
    }
  }

  const allStats = [
    { label: "Matches", key: "matches", per90: false, category: "all" as const },
    { label: "Minutes", key: "minutes", per90: false, category: "all" as const },
    { label: "Goals", key: "goals", per90Key: "goalsPer90", category: "attacking" as const },
    { label: "Assists", key: "assists", per90Key: "assistsPer90", category: "attacking" as const },
    { label: "Shots", key: "shots", per90Key: "shotsPer90", category: "attacking" as const },
    { label: "Shots on Target", key: "shotsOnTarget", per90: false, category: "attacking" as const },
    { label: "Total xG", key: "totalXG", per90Key: "xGPer90", category: "attacking" as const },
    { label: "Average xG", key: "averageXG", per90: false, category: "attacking" as const },
    { label: "xA", key: "xA", per90Key: "xAPer90", category: "attacking" as const },
    { label: "Passes", key: "passes", per90Key: "passesPer90", category: "passing" as const },
    { label: "Successful Passes", key: "successfulPasses", per90: false, category: "passing" as const },
    { label: "Pass Accuracy", key: "passAccuracy", per90: false, format: (v: number) => `${v.toFixed(1)}%`, category: "passing" as const },
    { label: "Touches", key: "touches", per90Key: "touchesPer90", category: "all" as const },
  ];

  const comparisonStats = statCategory === "all" 
    ? allStats 
    : allStats.filter(s => s.category === statCategory || s.category === "all");

  return (
    <>
      <Toaster position="top-right" />
      <div className="space-y-5 text-xs text-slate-200">
        {/* Header */}
        <header className="flex items-center justify-between rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 px-4 py-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Link href="/players" className="text-slate-400 hover:text-slate-200 transition" suppressHydrationWarning>
                ← Back to Players
              </Link>
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">{t("playerComparison")}</h1>
            <p className="text-[11px] text-slate-600 dark:text-slate-500">
              {mounted && selectedPlayers.length > 0 ? (
                <>{t("playerComparisonDescription")}</>
              ) : (
                <>{t("playerComparisonDescription")}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/players"
              className="h-8 rounded-md bg-slate-800 px-4 text-[11px] font-medium text-slate-200 hover:bg-slate-700 transition"
            >
              Change Selection
            </Link>
          </div>
        </header>

        {/* Quick Add More Players - Only show if less than 4 selected */}
        {selectedPlayers.length < 4 && selectedPlayers.length >= 2 && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-200">Add More Players ({selectedPlayers.length}/4)</p>
              <Link
                href="/players"
                className="text-[11px] text-emerald-400 hover:text-emerald-300 transition"
              >
                Select from Players →
              </Link>
            </div>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 max-h-48 overflow-y-auto">
              {allPlayers
                .filter(p => !selectedPlayers.includes(p.id))
                .slice(0, 6)
                .map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handlePlayerSelect(player.id)}
                    className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-left text-[11px] text-slate-300 transition hover:bg-slate-800"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-semibold text-emerald-300">
                      {player.number || player.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{player.name}</p>
                      <p className="text-[10px] text-slate-500">{player.position}</p>
                    </div>
                    <span className="text-slate-400">+</span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Selected Players Display (like Instat/Wyscout) */}
        {selectedPlayers.length >= 1 && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <p className="mb-3 text-sm font-medium text-slate-200">Select Players ({selectedPlayers.length}/4)</p>
            <div className="flex flex-wrap gap-3">
              {selectedPlayers.map((playerId) => {
                const player = allPlayers.find((p) => p.id === playerId);
                if (!player) {
                  console.warn("[PlayerCompare] Player not found in allPlayers:", playerId);
                  return null;
                }
                return (
                  <div
                    key={playerId}
                    className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-semibold text-emerald-300">
                      {player.number || player.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-slate-100">{player.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {player.position} {player.team ? `• ${player.team.name}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => handlePlayerSelect(playerId)}
                      className="ml-2 text-slate-400 hover:text-red-400 transition"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
            {selectedPlayers.length < 2 && (
              <p className="mt-3 text-center text-[11px] text-slate-500">
                Select 1-4 players to view their statistics
              </p>
            )}
          </div>
        )}

        {/* Comparison Results */}
        {loading && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-8 text-center">
            <p className="text-slate-400">Loading comparison data...</p>
          </div>
        )}

        {!loading && selectedPlayers.length < 2 && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-8 text-center">
            <p className="text-slate-400 mb-2">Please select at least 2 players to compare</p>
            <Link
              href="/players"
              className="inline-block rounded-md bg-emerald-500 px-4 py-2 text-[11px] font-medium text-white hover:bg-emerald-400 transition"
            >
              Go to Players →
            </Link>
          </div>
        )}

        {/* Show comparison if we have at least 1 player with stats OR if we have selected players but no stats yet */}
        {!loading && (playerStats.length >= 1 || (selectedPlayers.length >= 1 && playerStats.length === 0)) && (
          <>
            {/* Player Header Cards - Instat/StepOut Style */}
            {playerStats.length >= 1 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {playerStats.map((player, idx) => {
                  const colorClasses = [
                    { bg: "from-emerald-500/20 to-emerald-600/10", text: "text-emerald-300", border: "border-emerald-500/40", accent: "text-emerald-400", bar: "bg-emerald-500", cardBg: "bg-emerald-500/5" },
                    { bg: "from-emerald-500/20 to-emerald-600/10", text: "text-emerald-300", border: "border-emerald-500/40", accent: "text-emerald-400", bar: "bg-emerald-500", cardBg: "bg-emerald-500/5" },
                    { bg: "from-purple-500/20 to-purple-600/10", text: "text-purple-300", border: "border-purple-500/40", accent: "text-purple-400", bar: "bg-purple-500", cardBg: "bg-purple-500/5" },
                    { bg: "from-orange-500/20 to-orange-600/10", text: "text-orange-300", border: "border-orange-500/40", accent: "text-orange-400", bar: "bg-orange-500", cardBg: "bg-orange-500/5" },
                  ];
                  const color = colorClasses[idx % colorClasses.length];
                  
                  return (
                    <div key={player.id} className={`rounded-xl border-2 ${color.border} bg-gradient-to-br ${color.bg} p-4 backdrop-blur-sm`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-full ${color.cardBg} text-lg font-bold ${color.text} border-2 ${color.border} shadow-lg`}>
                          {player.number || player.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base text-white truncate">{player.name}</p>
                          <p className="text-[11px] text-slate-400">{player.position}</p>
                          {player.team && (
                            <p className="text-[10px] text-slate-500 truncate">{player.team.name}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className={`rounded-lg ${color.cardBg} p-2.5 border ${color.border}/30`}>
                          <p className="text-[10px] text-slate-400 mb-1">Matches</p>
                          <p className={`text-xl font-bold ${color.accent}`}>{player.matches}</p>
                        </div>
                        <div className={`rounded-lg ${color.cardBg} p-2.5 border ${color.border}/30`}>
                          <p className="text-[10px] text-slate-400 mb-1">Minutes</p>
                          <p className={`text-xl font-bold ${color.accent}`}>{player.minutes}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/50">
                        <div className="text-center">
                          <p className="text-[9px] text-slate-400 mb-0.5">Goals</p>
                          <p className={`text-sm font-bold ${color.accent}`}>{player.goals}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] text-slate-400 mb-0.5">Assists</p>
                          <p className={`text-sm font-bold ${color.accent}`}>{player.assists}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] text-slate-400 mb-0.5">xG</p>
                          <p className={`text-sm font-bold ${color.text}`}>{player.totalXG.toFixed(1)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Controls Bar - Toggle and Category Tabs */}
            {playerStats.length >= 1 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">Categories:</span>
                  <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
                    {(["all", "attacking", "passing"] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setStatCategory(cat)}
                        className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition ${
                          statCategory === cat
                            ? "bg-emerald-500 text-white shadow-lg"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                        }`}
                      >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPer90}
                    onChange={(e) => setShowPer90(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-2 focus:ring-emerald-500/50 transition"
                  />
                  Show per 90 minutes
                </label>
              </div>
            )}

            {/* Info message if no events */}
            {playerStats.length > 0 && playerStats.every((p) => p.matches === 0) && (
              <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-center">
                <p className="text-sm text-yellow-400">
                  ⚠️ Selected players have no match events yet.
                </p>
                <p className="mt-1 text-[11px] text-yellow-300/80">
                  Add events to matches to see detailed statistics. Go to a match and add shots, passes, and touches.
                </p>
              </div>
            )}

            {/* Radar Chart - Only show if 2+ players with stats */}
            {playerStats.length >= 2 && playerStats.some(p => p.matches > 0) && (
              <PlayerRadarChart players={playerStats} />
            )}

            {/* Stats Comparison Table - Enhanced Instat/StepOut Style */}
            <div className="overflow-hidden rounded-xl border-2 border-slate-800 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 shadow-2xl">
              <div className="border-b-2 border-slate-800 bg-gradient-to-r from-slate-900/80 to-slate-950/80 px-6 py-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-white">Statistics Comparison</p>
                    <p className="text-[11px] text-slate-400 mt-1">Side-by-side performance metrics</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-800 bg-slate-900/60">
                      <th className="px-6 py-5 text-left font-bold text-slate-200 uppercase tracking-wider text-[12px] sticky left-0 z-10 bg-slate-900/95 backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                          <span>Statistic</span>
                        </div>
                      </th>
                      {playerStats.map((player, idx) => {
                        const colorClasses = [
                          "border-emerald-500/40",
                          "border-emerald-500/40",
                          "border-purple-500/40",
                          "border-orange-500/40",
                        ];
                        return (
                          <th key={player.id} className={`px-6 py-5 text-center border-l-2 ${colorClasses[idx % colorClasses.length]} bg-slate-900/40`}>
                            <div>
                              <p className="font-bold text-base text-white">{player.name}</p>
                              <p className="text-[10px] text-slate-400 mt-1">{player.position}</p>
                              {player.team && (
                                <p className="text-[9px] text-slate-500 mt-0.5">{player.team.name}</p>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonStats.map((stat, statIdx) => {
                      const valueKey = showPer90 && stat.per90Key ? stat.per90Key : stat.key;
                      const format = stat.format || ((v: number) => v.toFixed(stat.per90 ? 2 : 1));
                      
                      // Get all values for this stat to find min/max
                      const values = playerStats.map((p) => (p as any)[valueKey] || 0);
                      const maxValue = Math.max(...values);
                      const minValue = Math.min(...values);
                      const hasVariation = maxValue !== minValue && maxValue > 0;
                      
                      return (
                        <tr 
                          key={stat.key} 
                          className={`border-b border-slate-800/50 hover:bg-slate-900/40 transition-all group ${
                            statIdx % 2 === 0 ? 'bg-slate-950/30' : 'bg-slate-950/10'
                          }`}
                        >
                          <td className="px-6 py-4 sticky left-0 z-10 bg-inherit backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0">
                                <StatIcon statKey={stat.key} />
                              </div>
                              <span className="font-semibold text-slate-200 text-sm">{stat.label}</span>
                              {showPer90 && stat.per90Key && (
                                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                  per 90
                                </span>
                              )}
                            </div>
                          </td>
                          {playerStats.map((player, idx) => {
                            const value = (player as any)[valueKey] || 0;
                            const isBest = hasVariation && value === maxValue && value > 0;
                            const isWorst = hasVariation && value === minValue && maxValue > 0 && playerStats.length > 1;
                            const percentage = hasVariation && maxValue > 0 ? (value / maxValue) * 100 : 0;
                            
                            const colorClasses = [
                              { best: "text-emerald-400", worst: "text-red-400", bar: "bg-emerald-500", border: "border-emerald-500/40" },
                              { best: "text-emerald-400", worst: "text-red-400", bar: "bg-emerald-500", border: "border-emerald-500/40" },
                              { best: "text-purple-400", worst: "text-red-400", bar: "bg-purple-500", border: "border-purple-500/40" },
                              { best: "text-orange-400", worst: "text-red-400", bar: "bg-orange-500", border: "border-orange-500/40" },
                            ];
                            const color = colorClasses[idx % colorClasses.length];
                            
                            return (
                              <td key={player.id} className={`px-6 py-4 text-center border-l-2 ${color.border} bg-slate-950/20`}>
                                <div className="flex flex-col items-center gap-2">
                                  <span className={`text-center font-bold text-lg transition-all ${
                                    isBest 
                                      ? color.best
                                      : isWorst 
                                      ? color.worst 
                                      : "text-slate-200"
                                  }`}>
                                    {typeof value === "number" ? format(value) : value}
                                  </span>
                                  {hasVariation && (
                                    <div className="w-full max-w-[100px] h-2 overflow-hidden rounded-full bg-slate-900 border border-slate-800">
                                      <div
                                        className={`h-full transition-all duration-500 ${color.bar} shadow-lg ${
                                          isBest ? 'shadow-emerald-500/30' : ''
                                        }`}
                                        style={{ width: `${Math.max(8, percentage)}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Show message only if we have selected players but NO stats at all */}
        {!loading && selectedPlayers.length >= 1 && playerStats.length === 0 && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center">
            <p className="text-yellow-400 mb-2">⏳ Loading comparison data...</p>
            <p className="text-[11px] text-yellow-300/80">
              Fetching statistics for {selectedPlayers.length} player{selectedPlayers.length > 1 ? "s" : ""}...
            </p>
          </div>
        )}
      </div>
    </>
  );
}

