"use client";

import Link from "next/link";
import { useState, FormEvent, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { playerSchema, type PlayerFormData } from "@/lib/validations";
import toast, { Toaster } from "react-hot-toast";
import { ExportModal } from "@/app/components/ExportModal";
import { useTranslation } from "@/lib/i18n";

type Player = {
  id: number;
  slug: string;
  name: string;
  position: string;
  age: number | null;
  club: string | null;
  number: number | null;
  xg: number | null;
  shotsPer90: number | null;
  team: { id: number; name: string } | null;
  matchesCount?: number;
  totalGameTime?: number;
};

type Team = {
  id: number;
  name: string;
};

export default function PlayersPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [openActionsMenu, setOpenActionsMenu] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({});
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [watchlistIds, setWatchlistIds] = useState<number[]>([]);
  
  // Pagination state (like Instat/Wyscout)
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPlayers, setTotalPlayers] = useState(0);
  
  // Use useMemo for filtered players instead of useEffect + state
  const filteredPlayers = useMemo(() => {
    console.log("[useMemo] Filtering players:", { 
      searchQuery, 
      playersCount: players.length,
      playerNames: players.map(p => p.name)
    });
    
    if (!searchQuery.trim()) {
      console.log("[useMemo] No search query, returning all", players.length, "players");
      return players;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = players.filter((player) => {
      const nameMatch = player.name?.toLowerCase().includes(query);
      const idMatch = player.id?.toString().includes(query);
      const positionMatch = player.position?.toLowerCase().includes(query);
      const teamMatch = player.team?.name?.toLowerCase().includes(query);
      const clubMatch = player.club?.toLowerCase().includes(query);
      
      return nameMatch || idMatch || positionMatch || teamMatch || clubMatch;
    });
    
    console.log("[useMemo] Filtered players:", filtered.length, "matching:", filtered.map(p => p.name));
    return filtered;
  }, [searchQuery, players]);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<PlayerFormData>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      name: "",
      position: "",
      age: "",
      club: "",
      nationality: "",
      foot: "Right",
      teamId: "",
      number: "",
    },
  });

  // Fetch players with pagination (like Instat/Wyscout)
  const fetchPlayers = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const searchParam = searchQuery.trim() ? `&search=${encodeURIComponent(searchQuery.trim())}` : "";
      const playersUrl = `/api/players?page=${pageNum}&limit=50&t=${Date.now()}${searchParam}`;
      
      const playersRes = await fetch(playersUrl);
      console.log("[fetchPlayers] Response status:", playersRes.status, "page:", pageNum);

      if (playersRes.ok) {
        const playersData = await playersRes.json();
        console.log("[fetchPlayers] Received data:", {
          ok: playersData.ok,
          playersCount: playersData.players?.length,
          pagination: playersData.pagination,
        });

        if (playersData.ok && Array.isArray(playersData.players)) {
          const playersWithIds = playersData.players.map((p: any, index: number) => ({
            ...p,
            id: p.id || index + 1,
            matchesCount: p.matchesCount ?? 0,
            totalGameTime: p.totalGameTime ?? 0,
            // Keep original slug from DB, don't create fallback (we'll use id in links if slug is missing)
            slug: p.slug || null,
            name: p.name || "Unknown",
            position: p.position || "N/A",
          }));

          if (append) {
            // Append new players (infinite scroll) - MERGE with existing
            setPlayers((prev) => {
              const existingMap = new Map(prev.map((p) => [p.id, p]));
              // Add/update with new players from server
              playersWithIds.forEach((p: any) => {
                existingMap.set(p.id, p);
              });
              const merged = Array.from(existingMap.values()).sort((a, b) => b.id - a.id);
              console.log("[fetchPlayers] Appended players. Previous:", prev.length, "New from server:", playersWithIds.length, "Total:", merged.length);
              return merged;
            });
          } else {
            // ALWAYS merge - NEVER replace completely (like Instat/Wyscout)
            setPlayers((prev) => {
              // Create map of existing players (preserve all current players)
              const existingMap = new Map(prev.map((p) => [p.id, p]));
              
              // Add/update with new players from server
              playersWithIds.forEach((p: any) => {
                existingMap.set(p.id, p);
              });
              
              // Convert to array and sort by ID descending (newest first)
              const merged = Array.from(existingMap.values()).sort((a, b) => b.id - a.id);
              
              // Safety check: ensure we didn't lose any players
              if (prev.length > 0 && merged.length < prev.length) {
                console.warn("[fetchPlayers] ⚠️ WARNING: Lost players during merge!", {
                  before: prev.length,
                  after: merged.length,
                  prevIds: prev.map(p => p.id),
                  mergedIds: merged.map(p => p.id),
                  missing: prev.filter(p => !merged.some(m => m.id === p.id)).map(p => `${p.id}: ${p.name}`)
                });
                
                // Re-add any missing players
                prev.forEach(prevPlayer => {
                  if (!merged.some(m => m.id === prevPlayer.id)) {
                    console.log("[fetchPlayers] Re-adding missing player:", prevPlayer.id, prevPlayer.name);
                    merged.push(prevPlayer);
                  }
                });
                
                // Re-sort after re-adding
                merged.sort((a, b) => b.id - a.id);
              }
              
              console.log("[fetchPlayers] ✅ Merged players. Previous:", prev.length, "From server:", playersWithIds.length, "Total:", merged.length);
              console.log("[fetchPlayers] Player IDs:", merged.map((p: any) => `${p.id}: ${p.name}`));
              return merged;
            });
          }

          // Update pagination state
          if (playersData.pagination) {
            setHasMore(playersData.pagination.hasMore);
            setTotalPlayers(playersData.pagination.total);
            setPage(pageNum);
          }
        } else {
          console.error("[fetchPlayers] Invalid response format:", playersData);
          toast.error("Failed to load players: Invalid response format");
        }
      } else {
        const errorText = await playersRes.text();
        console.error("[fetchPlayers] Failed:", playersRes.status, errorText);
        toast.error(`Failed to load players: ${playersRes.status}`);
      }
    } catch (err) {
      console.error("[fetchPlayers] Error:", err);
        toast.error(t("loadingPlayers"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Track if this is the initial mount
  const [isInitialMount, setIsInitialMount] = useState(true);
  
  // Check authentication first
  useEffect(() => {
    async function checkAuth() {
      try {
        const userRes = await fetch("/api/account/me");
        if (!userRes.ok) {
          router.push("/auth/login");
          return;
        }
        const userData = await userRes.json();
        if (!userData.ok) {
          router.push("/auth/login");
          return;
        }
      } catch {
        router.push("/auth/login");
      }
    }
    checkAuth();
  }, [router]);
  
  // Initial load and when search changes
  useEffect(() => {
    if (isInitialMount) {
      // First load - just fetch
      console.log("[useEffect] Initial mount - loading players");
      setIsInitialMount(false);
      setPage(1);
      setPlayers([]);
      fetchPlayers(1, false);
    } else {
      // Search changed - reset and fetch
      console.log("[useEffect] Search query changed:", searchQuery);
      setPage(1);
      setPlayers([]);
      fetchPlayers(1, false);
    }
  }, [searchQuery]); // Re-fetch when search changes

  // Load teams once
  useEffect(() => {
    fetch("/api/teams")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.teams) {
          setTeams(data.teams);
        }
      })
      .catch(() => {
        console.error("Failed to load teams");
      });
  }, []);

  // Load watchlist once
  useEffect(() => {
    fetch("/api/watchlist")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.players)) {
          setWatchlistIds(data.players.map((p: any) => p.id));
        }
      })
      .catch(() => {
        console.error("Failed to load watchlist");
      });
  }, []);

  // Load selected players from localStorage on mount (for persistence across reloads)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("playerComparisonIds");
      if (stored) {
        const parsedIds = JSON.parse(stored);
        if (Array.isArray(parsedIds) && parsedIds.length >= 1 && parsedIds.length <= 4) {
          const validIds = parsedIds.map(id => parseInt(String(id))).filter(id => !isNaN(id) && id > 0);
          if (validIds.length > 0) {
            console.log("[PlayersPage] Restored selected players from localStorage:", validIds);
            setSelectedPlayers(validIds);
          }
        }
      }
    } catch (e) {
      console.warn("[PlayersPage] Failed to load selected players from localStorage:", e);
    }
  }, []);

  // Infinite scroll handler (like Instat/Wyscout)
  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore || loading) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Load more when user is 200px from bottom
      if (scrollTop + windowHeight >= documentHeight - 200) {
        console.log("[InfiniteScroll] Loading more players, page:", page + 1);
        fetchPlayers(page + 1, true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [page, hasMore, loadingMore, loading, searchQuery]);

  // Filter is now handled by useMemo above

  async function handleAddPlayer(data: PlayerFormData) {
    try {
      const isEditing = editingPlayer !== null;
      const url = isEditing ? `/api/players/${editingPlayer.slug}` : "/api/players";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          position: data.position,
          age: data.age ? parseInt(data.age) : undefined,
          club: data.club || undefined,
          nationality: data.nationality || undefined,
          foot: data.foot || "Right",
          teamId: data.teamId ? parseInt(data.teamId) : undefined,
          number: data.number ? parseInt(data.number) : undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.ok) {
        toast.error(result.message || (isEditing ? t("failedToUpdatePlayer") : t("failedToAddPlayer")));
        return;
      }

      toast.success(isEditing ? t("playerUpdatedSuccessfully") : t("playerAddedSuccessfully"));
      setShowAddPlayer(false);
      setEditingPlayer(null);
      reset();
      
      if (isEditing) {
        // Update existing player in list
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === result.player?.id
              ? {
                  ...result.player,
                  id: result.player.id,
                  matchesCount: result.player.matchesCount ?? 0,
                  totalGameTime: result.player.totalGameTime ?? 0,
                  slug: result.player.slug || `player-${result.player.id}`,
                  name: result.player.name || "Unknown",
                  position: result.player.position || "N/A",
                }
              : p
          )
        );
      } else {
        // Add new player at the beginning (newest first, like Instat/Wyscout)
        if (result.player) {
          const newPlayer: Player = {
            ...result.player,
            id: result.player.id,
            matchesCount: result.player.matchesCount ?? 0,
            totalGameTime: result.player.totalGameTime ?? 0,
            slug: result.player.slug || `player-${result.player.id}`,
            name: result.player.name || "Unknown",
            position: result.player.position || "N/A",
          };
          
          // Add player to list IMMEDIATELY and ensure it stays
          setPlayers((prev) => {
            const existingMap = new Map(prev.map((p) => [p.id, p]));
            existingMap.set(newPlayer.id, newPlayer);
            const merged = Array.from(existingMap.values()).sort((a, b) => b.id - a.id);
            console.log("[handleAddPlayer] ✅ Added player IMMEDIATELY. Previous:", prev.length, "Total:", merged.length);
            console.log("[handleAddPlayer] Player IDs:", merged.map(p => `${p.id}: ${p.name}`));
            console.log("[handleAddPlayer] New player in list?", merged.some(p => p.id === newPlayer.id));
            return merged;
          });
          
          // Update total count
          setTotalPlayers((prev) => prev + 1);
          
          // DON'T refresh immediately - it might cause race conditions
          // The player is already added locally and will be included in next natural refresh
          // Only refresh if user explicitly searches or navigates
          
          // Scroll to top to show new player
          window.scrollTo({ top: 0, behavior: "smooth" });
          
          // Highlight the new player
          setTimeout(() => {
            const row = document.querySelector(`[data-player-id="${newPlayer.id}"]`);
            if (row) {
              row.scrollIntoView({ behavior: "smooth", block: "center" });
              row.classList.add("bg-emerald-500/20", "border-emerald-500/50");
              setTimeout(() => {
                row.classList.remove("bg-emerald-500/20", "border-emerald-500/50");
              }, 3000);
            }
          }, 800);
        }
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
    }
  }

  function handlePlayerSelect(playerId: number) {
    let newSelected: number[];
    if (selectedPlayers.includes(playerId)) {
      newSelected = selectedPlayers.filter((id) => id !== playerId);
    } else {
      if (selectedPlayers.length < 4) {
        newSelected = [...selectedPlayers, playerId];
      } else {
        toast.error("Maximum 4 players can be compared");
        return;
      }
    }
    
    setSelectedPlayers(newSelected);
    
    // Save to localStorage for persistence
    try {
      if (newSelected.length > 0) {
        localStorage.setItem("playerComparisonIds", JSON.stringify(newSelected));
        console.log("[PlayersPage] Saved selected players to localStorage:", newSelected);
      } else {
        localStorage.removeItem("playerComparisonIds");
        console.log("[PlayersPage] Cleared selected players from localStorage");
      }
    } catch (e) {
      console.warn("[PlayersPage] Failed to save to localStorage:", e);
    }
  }

  function handleSelectAll() {
    let newSelected: number[];
    if (selectedPlayers.length === filteredPlayers.length && filteredPlayers.length > 0) {
      newSelected = [];
    } else {
      newSelected = filteredPlayers.slice(0, 4).map((p) => p.id);
    }
    
    setSelectedPlayers(newSelected);
    
    // Save to localStorage for persistence
    try {
      if (newSelected.length > 0) {
        localStorage.setItem("playerComparisonIds", JSON.stringify(newSelected));
        console.log("[PlayersPage] Saved selected players to localStorage:", newSelected);
      } else {
        localStorage.removeItem("playerComparisonIds");
        console.log("[PlayersPage] Cleared selected players from localStorage");
      }
    } catch (e) {
      console.warn("[PlayersPage] Failed to save to localStorage:", e);
    }
  }

  async   function handleCompare() {
    if (selectedPlayers.length < 2) {
      toast.error(t("selectAtLeast2Players"));
      return;
    }

    // Save to localStorage before navigating (for persistence across reloads)
    try {
      localStorage.setItem("playerComparisonIds", JSON.stringify(selectedPlayers));
      console.log("[PlayersPage] Saved selected players to localStorage before navigation:", selectedPlayers);
    } catch (e) {
      console.warn("[PlayersPage] Failed to save to localStorage:", e);
    }

    // Redirect to compare page with selected player IDs
    const idsParam = selectedPlayers.join(",");
    console.log("[PlayersPage] Redirecting to compare with IDs:", idsParam, "selectedPlayers:", selectedPlayers);
    router.push(`/players/compare?ids=${idsParam}`);
  }

  async function handleToggleWatchlist(playerId: number) {
    try {
      const isInWatchlist = watchlistIds.includes(playerId);
      
      if (isInWatchlist) {
        // Remove from watchlist
        const res = await fetch(`/api/watchlist?playerId=${playerId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setWatchlistIds(watchlistIds.filter((id) => id !== playerId));
          toast.success(t("removedFromWatchlist"));
        } else {
          toast.error(t("failedToRemoveFromWatchlist"));
        }
      } else {
        // Add to watchlist
        const res = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId }),
        });
        if (res.ok) {
          setWatchlistIds([...watchlistIds, playerId]);
          toast.success(t("addedToWatchlist"));
        } else {
          const data = await res.json();
          toast.error(data.message || t("failedToAddToWatchlist"));
        }
      }
    } catch (err) {
      toast.error(t("networkError"));
    }
  }

  if (loading) {
    return (
      <div className="space-y-5 text-xs text-slate-700 dark:text-slate-200">
        <p className="text-slate-600 dark:text-slate-400">{t("loadingPlayers")}</p>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-white dark:bg-slate-950">
        {/* Professional Header */}
        <header className="border-b border-slate-200 dark:border-slate-900/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20 border border-purple-500/30">
                  <svg className="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">{t("players")}</h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t("playersDescription")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all hover:bg-slate-200 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {t("export")}
                </button>
                {selectedPlayers.length >= 2 && (
                  <button
                    onClick={handleCompare}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:scale-105"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {t("playerComparison")} ({selectedPlayers.length})
                  </button>
                )}
                <button
                  onClick={() => setShowAddPlayer(true)}
                  className="flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400 hover:scale-105"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t("addNewPlayer")}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-8">
          {/* Filters Panel */}
          <div className="mb-4 md:mb-6 rounded-xl border border-slate-200/80 dark:border-slate-800/50 bg-gradient-to-br from-white dark:from-slate-900/50 via-slate-50/50 dark:via-slate-950/50 to-white dark:to-slate-950/50 p-4 md:p-6 shadow-lg">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-white mb-1">{t("filters")}</h2>
              <p className="text-xs text-slate-400">{t("filterPlayersBy")}</p>
            </div>
            <div className="flex flex-wrap items-end gap-3 md:gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t("seasons")}</label>
                <div className="relative">
                  <select className="h-12 min-h-[44px] w-full sm:w-32 appearance-none rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 pr-10 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-300 dark:hover:border-slate-700">
                    <option className="bg-slate-900 text-white">{t("all")}</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                    <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t("myTeams")}</label>
                <div className="relative">
                  <select className="h-12 w-48 appearance-none rounded-lg border border-slate-800 bg-slate-900/50 px-4 pr-10 text-sm font-medium text-white outline-none transition-all focus:border-emerald-500 focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-700">
                    <option className="bg-slate-900 text-white">{t("all")}</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id} className="bg-slate-900 text-white">{t.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                    <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t("playerStatus")}</label>
                <div className="relative">
                  <select className="h-12 w-40 appearance-none rounded-lg border border-slate-800 bg-slate-900/50 px-4 pr-10 text-sm font-medium text-white outline-none transition-all focus:border-emerald-500 focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-700">
                    <option className="bg-slate-900 text-white">{t("all")}</option>
                    <option className="bg-slate-900 text-white">{t("active")}</option>
                    <option className="bg-slate-900 text-white">{t("inactive")}</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                    <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t("position")}</label>
                <div className="relative">
                  <select className="h-12 w-36 appearance-none rounded-lg border border-slate-800 bg-slate-900/50 px-4 pr-10 text-sm font-medium text-white outline-none transition-all focus:border-emerald-500 focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-700">
                    <option className="bg-slate-900 text-white">{t("all")}</option>
                    <option className="bg-slate-900 text-white">GK</option>
                    <option className="bg-slate-900 text-white">DF</option>
                    <option className="bg-slate-900 text-white">MF</option>
                    <option className="bg-slate-900 text-white">FW</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                    <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="space-y-2 flex-1 min-w-[250px]">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t("search")}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("searchByPlayerIdNamePositionOrTeam")}
                    className="h-12 w-full rounded-lg border border-slate-800 bg-slate-900/50 px-4 pl-11 text-sm font-medium text-white outline-none transition-all focus:border-emerald-500 focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-700"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              {searchQuery && (
                <div className="flex items-end">
                  <button
                    onClick={() => setSearchQuery("")}
                    className="h-12 rounded-lg border border-slate-700 bg-slate-800/50 px-5 text-sm font-semibold text-slate-300 transition-all hover:bg-slate-800 hover:border-slate-600"
                  >
                    {t("clear")}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Players Table */}
          <div className="rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-800/50 bg-slate-900/30">
              <h2 className="text-base font-bold text-white">{t("playerList")}</h2>
            </div>
            <div className="overflow-x-auto hide-scrollbar" style={{ overflowY: 'visible' }}>
              <table className="w-full border-collapse text-sm text-slate-300">
                <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedPlayers.length === filteredPlayers.length && filteredPlayers.length > 0}
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">{t("playerId")}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">{t("playerName")}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">{t("teamName")}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">
                      {t("senseScore")} <span className="text-[9px]">⇅</span>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">
                      {t("matches")} <span className="text-[9px]">⇅</span>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">
                      {t("gameTime")} <span className="text-[9px]">⇅</span>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">{t("position")}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">{t("appStatus")}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">{t("lastActivity")}</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide">{t("goto")}</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.length === 0 && searchQuery ? (
                    <tr>
                      <td colSpan={12} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="rounded-full bg-slate-800/50 p-4">
                            <svg className="h-10 w-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-base font-semibold text-slate-300 mb-1">Δεν βρέθηκαν παίκτες</p>
                            <p className="text-sm text-slate-500">Κανένας παίκτης δεν ταιριάζει με &quot;{searchQuery}&quot;</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPlayers.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="rounded-full bg-slate-800/50 p-4">
                            <svg className="h-10 w-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-base font-semibold text-slate-300 mb-1">Δεν υπάρχουν παίκτες ακόμα</p>
                            <p className="text-sm text-slate-500">Πρόσθεσε τον πρώτο σου παίκτη για να ξεκινήσεις</p>
                          </div>
                          <button
                            onClick={() => setShowAddPlayer(true)}
                            className="flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 transition-all hover:bg-amber-400 hover:scale-105"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create first player
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filteredPlayers.map((p, idx) => (
                      <tr key={p.id} data-player-id={p.id} className={`border-t border-slate-800/50 hover:bg-slate-900/30 transition ${selectedPlayers.includes(p.id) ? "bg-emerald-500/10 border-emerald-500/30" : ""}`}>
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedPlayers.includes(p.id)}
                            onChange={() => handlePlayerSelect(p.id)}
                            className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono text-slate-400">{60000 + p.id}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-emerald-500/20 border border-purple-500/30">
                              <span className="text-sm font-bold text-purple-400">
                                {p.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-white">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-400">{p.team?.name || p.club || "-"}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="text-sm font-bold text-white">
                              {p.xg ? (p.xg * 10).toFixed(1) : "0.0"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-300">{p.matchesCount || 0}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-300">{p.totalGameTime || 0}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400">
                            {p.position}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-500">{t("notTagged")}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-500">{t("na")}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Link
                            href={`/players/${p.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-500 hover:scale-105"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            {t("sense")}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="relative">
                            <button
                              ref={(el) => (buttonRefs.current[p.id] = el)}
                              onClick={(e) => {
                                e.stopPropagation();
                                const button = buttonRefs.current[p.id];
                                if (button) {
                                  const rect = button.getBoundingClientRect();
                                  setMenuPosition({
                                    top: rect.bottom + 4,
                                    right: window.innerWidth - rect.right,
                                  });
                                }
                                setOpenActionsMenu(openActionsMenu === p.id ? null : p.id);
                              }}
                              className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </button>
                            {openActionsMenu === p.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-[60]"
                                  onClick={() => setOpenActionsMenu(null)}
                                />
                                <div 
                                  className="fixed z-[70] w-48 rounded-lg border border-slate-800 bg-slate-950 shadow-xl"
                                  style={menuPosition ? { top: `${menuPosition.top}px`, right: `${menuPosition.right}px` } : {}}
                                >
                                <button
                                  onClick={() => {
                                    handleToggleWatchlist(p.id);
                                    setOpenActionsMenu(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-900 transition"
                                >
                                  {watchlistIds.includes(p.id) ? "⭐ Remove from Watchlist" : "⭐ Add to Watchlist"}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingPlayer(p);
                                    setValue("name", p.name);
                                    setValue("position", p.position);
                                    setValue("age", p.age?.toString() || "");
                                    setValue("club", p.club || "");
                                    setValue("nationality", "");
                                    setValue("foot", "Right");
                                    setValue("teamId", p.team?.id.toString() || "");
                                    setValue("number", p.number?.toString() || "");
                                    setOpenActionsMenu(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-900 transition"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm(`Are you sure you want to delete ${p.name}?`)) {
                                      try {
                                        const res = await fetch(`/api/players/${p.id}`, {
                                          method: "DELETE",
                                        });
                                        if (res.ok) {
                                          toast.success("Player deleted successfully");
                                          setPlayers((prev) => prev.filter((player) => player.id !== p.id));
                                        } else {
                                          const errorData = await res.json();
                                          toast.error(errorData.message || "Failed to delete player");
                                        }
                                      } catch {
                                        toast.error("Network error");
                                      }
                                    }
                                    setOpenActionsMenu(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-slate-900 transition"
                                >
                                  Delete
                                </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      ))}
                      {loadingMore && (
                      <tr>
                        <td colSpan={12} className="px-6 py-6 text-center text-slate-400">
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-500"></div>
                            <span className="text-sm">Loading more players...</span>
                          </div>
                        </td>
                      </tr>
                      )}
                    </>
                  )}
              </tbody>
            </table>
          </div>
        </div>
        </main>

        {(showAddPlayer || editingPlayer) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950/95 p-5 text-xs text-slate-200 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {editingPlayer ? "Edit player" : "Add new player"}
                </p>
                <p className="text-[11px] text-slate-500">
                  {editingPlayer ? "Update player profile information." : "Register a new player profile for your squad."}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddPlayer(false);
                  setEditingPlayer(null);
                  reset();
                }}
                className="h-6 w-6 rounded-full bg-slate-900 text-[11px] text-slate-400 hover:bg-slate-800"
              >
                ×
              </button>
            </div>
            <form className="space-y-3" onSubmit={handleSubmit(handleAddPlayer)}>
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400">Full name *</label>
                <input
                  {...register("name")}
                  className={`h-8 w-full rounded-md border bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:ring-1 ${
                    errors.name
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/60"
                      : "border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/60"
                  }`}
                  placeholder="Enter full name"
                />
                {errors.name && (
                  <p className="text-[10px] text-red-400">{errors.name.message}</p>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400">Position *</label>
                  <select
                    {...register("position")}
                    className={`h-8 w-full rounded-md border bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:ring-1 ${
                      errors.position
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/60"
                        : "border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/60"
                    }`}
                  >
                    <option value="">Select position</option>
                    <option value="GK">GK</option>
                    <option value="CB">CB</option>
                    <option value="LB">LB</option>
                    <option value="RB">RB</option>
                    <option value="DM">DM</option>
                    <option value="CM">CM</option>
                    <option value="LM">LM</option>
                    <option value="RM">RM</option>
                    <option value="LW">LW</option>
                    <option value="RW">RW</option>
                    <option value="CF">CF</option>
                    <option value="ST">ST</option>
                  </select>
                  {errors.position && (
                    <p className="text-[10px] text-red-400">{errors.position.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400">Age</label>
                  <input
                    type="number"
                    {...register("age")}
                    className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400">Jersey Number</label>
                  <input
                    type="number"
                    {...register("number")}
                    className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                    placeholder="Optional"
                    min="1"
                    max="99"
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400">Club</label>
                  <input
                    {...register("club")}
                    className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400">Nationality</label>
                  <input
                    {...register("nationality")}
                    className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400">Preferred foot</label>
                  <select
                    {...register("foot")}
                    className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                  >
                    <option value="Right">Right</option>
                    <option value="Left">Left</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400">Team</label>
                  <select
                    {...register("teamId")}
                    className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                  >
                    <option value="">Select team (optional)</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id.toString()}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 h-8 w-full rounded-md bg-emerald-500 text-[11px] font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (editingPlayer ? "Updating..." : "Adding...") : (editingPlayer ? "Update player" : "Add player")}
              </button>
            </form>
          </div>
        </div>
      )}

        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExportSuccess={() => {
            toast.success("Export completed!");
          }}
        />
      </div>
    </>
  );
}

