"use client";

import Link from "next/link";
import { useState, FormEvent, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { matchSchema, type MatchFormData } from "@/lib/validations";
import toast, { Toaster } from "react-hot-toast";
import { ExportModal } from "@/app/components/ExportModal";
import { useTranslation } from "@/lib/i18n";

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
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
};

type Team = {
  id: number;
  name: string;
};

type TabKey = "matches" | "tournaments" | "players";

export default function MatchesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("matches");
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [openActionsMenu, setOpenActionsMenu] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({});
  const [showExportModal, setShowExportModal] = useState(false);
  
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

  // Close menu on scroll or resize
  useEffect(() => {
    if (openActionsMenu !== null) {
      const handleClose = () => {
        setOpenActionsMenu(null);
        setMenuPosition(null);
      };
      window.addEventListener('scroll', handleClose, true);
      window.addEventListener('resize', handleClose);
      return () => {
        window.removeEventListener('scroll', handleClose, true);
        window.removeEventListener('resize', handleClose);
      };
    }
  }, [openActionsMenu]);
  
  // Load persisted filters from localStorage
  const loadPersistedFilters = () => {
    if (typeof window === "undefined") {
      return {
        season: "All",
        competition: "All",
        teamId: "All",
        dateFrom: "",
        dateTo: "",
        search: "",
      };
    }
    
    try {
      const stored = localStorage.getItem("matches_filters");
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          season: parsed.season || "All",
          competition: parsed.competition || "All",
          teamId: parsed.teamId || "All",
          dateFrom: parsed.dateFrom || "",
          dateTo: parsed.dateTo || "",
          search: parsed.search || "",
        };
      }
    } catch (e) {
      console.warn("[MatchesPage] Failed to load persisted filters:", e);
    }
    
    return {
      season: "All",
      competition: "All",
      teamId: "All",
      dateFrom: "",
      dateTo: "",
      search: "",
    };
  };

  // Filter states
  const [filters, setFilters] = useState(loadPersistedFilters());
  
  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("matches_filters", JSON.stringify(filters));
    } catch (e) {
      console.warn("[MatchesPage] Failed to save filters:", e);
    }
  }, [filters]);
  
  const [homeTeamMode, setHomeTeamMode] = useState<"registered" | "opponent">("registered");
  const [awayTeamMode, setAwayTeamMode] = useState<"registered" | "opponent">("opponent");

  // Load team modes from localStorage when modal opens - CRITICAL: Load every time modal opens
  useEffect(() => {
    if (showCreateMatch) {
      // Use setTimeout to ensure this runs after component render
      const loadFromStorage = () => {
        if (typeof window === "undefined") return;
        
        try {
          const storedHome = localStorage.getItem("matchForm_homeTeamMode");
          const storedAway = localStorage.getItem("matchForm_awayTeamMode");
          
          console.log("[Matches] 🔄 Modal opened, loading from localStorage...", { storedHome, storedAway });
          
          if (storedHome === "registered" || storedHome === "opponent") {
            setHomeTeamMode(storedHome);
            console.log("[Matches] ✅ Set homeTeamMode to:", storedHome);
          } else {
            console.log("[Matches] ⚠️ No valid homeTeamMode in localStorage, using default: registered");
          }
          
          if (storedAway === "registered" || storedAway === "opponent") {
            setAwayTeamMode(storedAway);
            console.log("[Matches] ✅ Set awayTeamMode to:", storedAway);
          } else {
            console.log("[Matches] ⚠️ No valid awayTeamMode in localStorage, using default: opponent");
          }
        } catch (e) {
          console.error("[Matches] ❌ Failed to load from localStorage:", e);
        }
      };
      
      // Run immediately and also after a small delay to ensure state updates
      loadFromStorage();
      const timer = setTimeout(loadFromStorage, 10);
      
      return () => clearTimeout(timer);
    }
  }, [showCreateMatch]);

  // Save team modes to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem("matchForm_homeTeamMode", homeTeamMode);
      console.log("[Matches] 💾 Saved homeTeamMode to localStorage:", homeTeamMode);
    } catch (e) {
      console.warn("[Matches] ❌ Failed to save homeTeamMode:", e);
    }
  }, [homeTeamMode]);

  useEffect(() => {
    try {
      localStorage.setItem("matchForm_awayTeamMode", awayTeamMode);
      console.log("[Matches] 💾 Saved awayTeamMode to localStorage:", awayTeamMode);
    } catch (e) {
      console.warn("[Matches] ❌ Failed to save awayTeamMode:", e);
    }
  }, [awayTeamMode]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<MatchFormData>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
      homeTeamId: "",
      awayTeamId: "",
      homeTeamName: "",
      awayTeamName: "",
      competition: "",
      venue: "",
      date: "",
      time: "",
      scoreHome: "",
      scoreAway: "",
      shotsHome: "",
      shotsAway: "",
    },
  });

  // Fetch teams once on mount
  useEffect(() => {
    async function fetchTeams() {
      try {
        const teamsRes = await fetch("/api/teams");
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          if (teamsData.ok) {
            setTeams(teamsData.teams);
          }
        }
      } catch (err) {
        console.error("Failed to load teams", err);
      }
    }
    fetchTeams();
  }, []);

  // Fetch matches with filters
  useEffect(() => {
    async function fetchMatches() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.competition && filters.competition !== "All") {
          params.append("competition", filters.competition);
        }
        if (filters.season && filters.season !== "All") {
          params.append("season", filters.season);
        }
        if (filters.teamId && filters.teamId !== "All") {
          params.append("teamId", filters.teamId);
        }
        if (filters.dateFrom) {
          params.append("dateFrom", filters.dateFrom);
        }
        if (filters.dateTo) {
          params.append("dateTo", filters.dateTo);
        }
        if (filters.search.trim()) {
          params.append("search", filters.search.trim());
        }
        // Add cache busting
        params.append("t", Date.now().toString());

        const matchesRes = await fetch(`/api/matches?${params.toString()}`);
        if (matchesRes.ok) {
          const matchesData = await matchesRes.json();
          if (matchesData.ok) {
            // Apply client-side search filter for team names (SQLite limitation)
            let filteredMatches = matchesData.matches;
            if (filters.search.trim() && isNaN(parseInt(filters.search.trim()))) {
              const searchTerm = filters.search.trim().toLowerCase();
              filteredMatches = matchesData.matches.filter((m: Match) => 
                (m.homeTeam?.name || (m as any).homeTeamName || "").toLowerCase().includes(searchTerm) ||
                (m.awayTeam?.name || (m as any).awayTeamName || "").toLowerCase().includes(searchTerm)
              );
            }
            setMatches(filteredMatches);
          }
        }
      } catch (err) {
        console.error("Failed to load matches", err);
      } finally {
        setLoading(false);
      }
    }
    
    // Debounce search to avoid too many requests
    const timeoutId = setTimeout(() => {
      fetchMatches();
    }, filters.search ? 300 : 0);
    
    return () => clearTimeout(timeoutId);
  }, [filters]);

  async function handleCreateMatch(data: MatchFormData) {
    try {
      // Validate teams based on mode
      if (homeTeamMode === "registered" && !data.homeTeamId) {
        toast.error("Please select a home team");
        return;
      }
      if (homeTeamMode === "opponent" && !data.homeTeamName?.trim()) {
        toast.error("Please enter home team name");
        return;
      }
      if (awayTeamMode === "registered" && !data.awayTeamId) {
        toast.error("Please select an away team");
        return;
      }
      if (awayTeamMode === "opponent" && !data.awayTeamName?.trim()) {
        toast.error("Please enter away team name");
        return;
      }

      // Combine date and time
      const dateTime = data.time
        ? `${data.date}T${data.time}`
        : `${data.date}T12:00`;

      const requestBody: any = {
        competition: data.competition,
        venue: data.venue || undefined,
        date: dateTime,
        scoreHome: data.scoreHome ? parseInt(data.scoreHome) : undefined,
        scoreAway: data.scoreAway ? parseInt(data.scoreAway) : undefined,
        shotsHome: data.shotsHome ? parseInt(data.shotsHome) : undefined,
        shotsAway: data.shotsAway ? parseInt(data.shotsAway) : undefined,
      };

      // Add team data based on mode
      if (homeTeamMode === "registered" && data.homeTeamId) {
        requestBody.homeTeamId = parseInt(data.homeTeamId);
      } else if (homeTeamMode === "opponent" && data.homeTeamName?.trim()) {
        requestBody.homeTeamName = data.homeTeamName.trim();
      }

      if (awayTeamMode === "registered" && data.awayTeamId) {
        requestBody.awayTeamId = parseInt(data.awayTeamId);
      } else if (awayTeamMode === "opponent" && data.awayTeamName?.trim()) {
        requestBody.awayTeamName = data.awayTeamName.trim();
      }

      console.log("[Matches] 📤 Sending request:", requestBody);

      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log("[Matches] 📥 Response status:", res.status);

      let result;
      try {
        result = await res.json();
        console.log("[Matches] 📥 Response data:", result);
      } catch (parseError) {
        console.error("[Matches] ❌ Failed to parse response:", parseError);
        toast.error("Invalid response from server. Please try again.");
        return;
      }

      if (!res.ok || !result.ok) {
        const errorMessage = result.message || `Failed to create match (Status: ${res.status})`;
        console.error("[Matches] ❌ Error:", errorMessage);
        toast.error(errorMessage);
        return;
      }

      toast.success(t("matchAddedSuccessfully"));
      setShowCreateMatch(false);
      reset();
      router.refresh();
      // Trigger filter refresh by updating a filter (this will cause useEffect to re-run)
      setFilters({ ...filters });
    } catch (err) {
      console.error("[Matches] ❌ Network error:", err);
      const errorMessage = err instanceof Error ? err.message : "Network error. Please check your connection and try again.";
      toast.error(errorMessage);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5 text-xs text-slate-700 dark:text-slate-200">
        <p className="text-slate-600 dark:text-slate-400">{t("loadingMatches")}</p>
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
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">{t("matches")}</h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t("matchesDescription")}</p>
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
                <button
                  onClick={() => setShowCreateMatch(true)}
                  className="flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400 hover:scale-105"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t("addNewMatch")}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-8">
          {/* Advanced Filters */}
          <div className="mb-6 rounded-xl border border-slate-200/80 dark:border-slate-800/50 bg-gradient-to-br from-white dark:from-slate-900/50 via-slate-50/50 dark:via-slate-950/50 to-white dark:to-slate-950/50 p-6 shadow-lg">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-white mb-1">{t("filters")}</h2>
              <p className="text-xs text-slate-400">{t("filterMatchesBy")}</p>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t("season")}</label>
                <select 
                  value={filters.season}
                  onChange={(e) => setFilters({ ...filters, season: e.target.value })}
                  className="h-12 w-32 appearance-none rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 pr-10 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <option value="All" className="bg-slate-900 text-white">{t("all")}</option>
              {(() => {
                // Generate season options from all matches (we need to fetch all matches for seasons)
                // For now, generate common seasons
                const currentYear = new Date().getFullYear();
                const seasons: string[] = [];
                for (let i = currentYear; i >= currentYear - 5; i--) {
                  seasons.push(`${i}-${(i + 1).toString().slice(-2)}`);
                }
                // Also add seasons from current matches
                const matchSeasons = new Set<string>();
                matches.forEach((m) => {
                  const year = new Date(m.date).getFullYear();
                  matchSeasons.add(`${year}-${(year + 1).toString().slice(-2)}`);
                });
                // Combine and deduplicate
                const allSeasons = Array.from(new Set([...seasons, ...Array.from(matchSeasons)])).sort().reverse();
                return allSeasons.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ));
              })()}
            </select>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t("competition")}</label>
                <div className="relative">
                  <select 
                    value={filters.competition}
                    onChange={(e) => setFilters({ ...filters, competition: e.target.value })}
                    className="h-12 w-48 appearance-none rounded-lg border border-slate-800 bg-slate-900/50 px-4 pr-10 text-sm font-medium text-white outline-none transition-all focus:border-emerald-500 focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-700"
                  >
                    <option value="All" className="bg-slate-900 text-white">{t("all")}</option>
                    {Array.from(new Set(matches.map((m) => m.competition))).map((comp) => (
                      <option key={comp} value={comp} className="bg-slate-900 text-white">{comp}</option>
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
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t("team")}</label>
                <div className="relative">
                  <select 
                    value={filters.teamId}
                    onChange={(e) => setFilters({ ...filters, teamId: e.target.value })}
                    className="h-12 w-48 appearance-none rounded-lg border border-slate-800 bg-slate-900/50 px-4 pr-10 text-sm font-medium text-white outline-none transition-all focus:border-emerald-500 focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-700"
                  >
                    <option value="All" className="bg-slate-900 text-white">{t("all")}</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id.toString()} className="bg-slate-900 text-white">{t.name}</option>
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
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t("from")}</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="h-12 w-40 rounded-lg border border-slate-800 bg-slate-900/50 px-4 text-sm font-medium text-white outline-none transition-all focus:border-emerald-500 focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t("to")}</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="h-12 w-40 rounded-lg border border-slate-800 bg-slate-900/50 px-4 text-sm font-medium text-white outline-none transition-all focus:border-emerald-500 focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-700"
                />
              </div>
              <div className="space-y-2 flex-1 min-w-[250px]">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t("search")}</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t("searchByMatchIdOrTeamNames")}
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="h-12 w-full rounded-lg border border-slate-800 bg-slate-900/50 px-4 pl-11 text-sm font-medium text-white outline-none transition-all focus:border-emerald-500 focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-700"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex items-end">
                <button 
                  onClick={() => setFilters({ season: "All", competition: "All", teamId: "All", dateFrom: "", dateTo: "", search: "" })}
                  className="h-12 rounded-lg border border-slate-700 bg-slate-800/50 px-5 text-sm font-semibold text-slate-300 transition-all hover:bg-slate-800 hover:border-slate-600"
                >
                  {t("clear")}
                </button>
              </div>
            </div>
            {loading && (
              <div className="mt-4 text-center text-sm text-slate-400">
                <div className="inline-flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                  Φόρτωση αγώνων...
                </div>
              </div>
            )}
          </div>

          {/* Matches Table */}
          <div className="rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 overflow-hidden shadow-xl">
            <div className="overflow-x-auto hide-scrollbar" style={{ overflowY: 'visible' }}>
              <table className="w-full border-collapse text-sm text-slate-300">
                <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">{t("matchId")}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">{t("teamA")}</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide">{t("scoreline")}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">{t("teamB")}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">{t("competition")}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">{t("matchDay")}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">{t("status")}</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide">{t("goto")}</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="rounded-full bg-slate-800/50 p-4">
                            <svg className="h-10 w-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-base font-semibold text-slate-300 mb-1">Δεν υπάρχουν αγώνες ακόμα</p>
                            <p className="text-sm text-slate-500">Δημιούργησε τον πρώτο σου αγώνα για να ξεκινήσεις</p>
                          </div>
                          <button
                            onClick={() => setShowCreateMatch(true)}
                            className="flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 transition-all hover:bg-amber-400 hover:scale-105"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create first match
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    matches.map((m) => {
                      const matchDate = new Date(m.date);
                      const formattedDate = matchDate.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                      });

                      return (
                      <tr key={m.id} className="border-t border-slate-800/50 hover:bg-slate-900/30 transition">
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono text-slate-400">M-{m.id}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/20 border border-emerald-500/30">
                              <span className="text-xs font-bold text-emerald-400">
                                {(m.homeTeam?.name || (m as any).homeTeamName || "U").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-white">
                                {m.homeTeam?.name || (m as any).homeTeamName || "Unknown"}
                              </span>
                              {!(m.homeTeam?.name) && (m as any).homeTeamName && (
                                <span className="ml-2 text-xs text-slate-500">(Opponent)</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {m.scoreHome !== null && m.scoreAway !== null ? (
                            <span className="inline-flex items-center rounded-lg bg-green-500/20 border border-green-500/30 px-3 py-1.5 text-sm font-bold text-green-400">
                              {m.scoreHome}-{m.scoreAway}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30">
                              <span className="text-xs font-bold text-pink-400">
                                {(m.awayTeam?.name || (m as any).awayTeamName || "U").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-white">
                                {m.awayTeam?.name || (m as any).awayTeamName || "Unknown"}
                              </span>
                              {!(m.awayTeam?.name) && (m as any).awayTeamName && (
                                <span className="ml-2 text-xs text-slate-500">(Opponent)</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-400">{m.competition}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-300">{formattedDate}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-green-500/20 border border-green-500/30 px-3 py-1 text-xs font-semibold text-green-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-400 mr-2"></span>
                            Completed
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Link
                            href={`/matches/${m.slug}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-500 hover:scale-105"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Sense
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="relative">
                            <button
                              ref={(el) => (buttonRefs.current[m.id] = el)}
                              onClick={(e) => {
                                e.stopPropagation();
                                const button = buttonRefs.current[m.id];
                                if (button) {
                                  const rect = button.getBoundingClientRect();
                                  setMenuPosition({
                                    top: rect.bottom + 4,
                                    right: window.innerWidth - rect.right,
                                  });
                                }
                                setOpenActionsMenu(openActionsMenu === m.id ? null : m.id);
                              }}
                              className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </button>
                            {openActionsMenu === m.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-[60]"
                                  onClick={() => setOpenActionsMenu(null)}
                                />
                                <div 
                                  className="fixed z-[70] w-40 rounded-lg border border-slate-800 bg-slate-950 shadow-xl"
                                  style={menuPosition ? { top: `${menuPosition.top}px`, right: `${menuPosition.right}px` } : {}}
                                >
                                <Link
                                  href={`/matches/${m.slug}`}
                                  onClick={() => setOpenActionsMenu(null)}
                                  className="block w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-900 transition"
                                >
                                  View
                                </Link>
                                <button
                                  onClick={async () => {
                                    if (confirm(`Are you sure you want to delete this match?`)) {
                                      try {
                                        const res = await fetch(`/api/matches/${m.slug}`, {
                                          method: "DELETE",
                                        });
                                        if (res.ok) {
                                          toast.success("Match deleted successfully");
                                          setMatches(matches.filter((match) => match.id !== m.id));
                                        } else {
                                          const errorData = await res.json();
                                          toast.error(errorData.message || "Failed to delete match");
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Tournaments Tab */}
      {activeTab === "tournaments" && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-medium text-slate-200">Competitions</span>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
              <table className="w-full border-collapse text-[11px] text-slate-300">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Competition</th>
                    <th className="px-3 py-2 text-right font-medium">Matches</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(new Set(matches.map((m) => m.competition))).map((comp) => {
                    const compMatches = matches.filter((m) => m.competition === comp);
                    return (
                      <tr key={comp} className="border-t border-slate-800">
                        <td className="px-3 py-2">{comp}</td>
                        <td className="px-3 py-2 text-right">{compMatches.length}</td>
                      </tr>
                    );
                  })}
                  {matches.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-3 py-4 text-center text-slate-500">
                        No competitions yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Players Tab */}
      {activeTab === "players" && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-medium text-slate-200">Teams</span>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
              <table className="w-full border-collapse text-[11px] text-slate-300">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Team</th>
                    <th className="px-3 py-2 text-left font-medium">League</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t) => (
                    <tr key={t.id} className="border-t border-slate-800">
                      <td className="px-3 py-2">{t.name}</td>
                      <td className="px-3 py-2 text-slate-500">-</td>
                    </tr>
                  ))}
                  {teams.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-3 py-4 text-center text-slate-500">
                        No teams yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showCreateMatch && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div key={`match-form-${showCreateMatch}`} className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950/95 p-5 text-xs text-slate-200 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Create match</p>
                <p className="text-[11px] text-slate-500">Define fixture details for your analysis.</p>
              </div>
              <button
                onClick={() => setShowCreateMatch(false)}
                className="h-6 w-6 rounded-full bg-slate-900 text-[11px] text-slate-400 hover:bg-slate-800"
              >
                ×
              </button>
            </div>
            <form className="space-y-3" onSubmit={handleSubmit(handleCreateMatch)}>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400">Home team *</label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        const newMode = "registered";
                        console.log("[Matches] 🔵 Clicked: Setting homeTeamMode to:", newMode);
                        setHomeTeamMode(newMode);
                        setValue("homeTeamName", "");
                        if (typeof window !== "undefined") {
                          try {
                            localStorage.setItem("matchForm_homeTeamMode", newMode);
                            console.log("[Matches] ✅ SAVED homeTeamMode to localStorage:", newMode);
                            // Verify it was saved
                            const verify = localStorage.getItem("matchForm_homeTeamMode");
                            console.log("[Matches] ✅ VERIFIED localStorage has:", verify);
                          } catch (e) {
                            console.error("[Matches] ❌ Failed to save:", e);
                          }
                        }
                      }}
                      className={`h-7 rounded-md px-3 text-[11px] font-medium transition ${
                        homeTeamMode === "registered"
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                      }`}
                    >
                      My Team
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newMode = "opponent";
                        console.log("[Matches] 🔵 Clicked: Setting homeTeamMode to:", newMode);
                        setHomeTeamMode(newMode);
                        setValue("homeTeamId", "");
                        if (typeof window !== "undefined") {
                          try {
                            localStorage.setItem("matchForm_homeTeamMode", newMode);
                            console.log("[Matches] ✅ SAVED homeTeamMode to localStorage:", newMode);
                            // Verify it was saved
                            const verify = localStorage.getItem("matchForm_homeTeamMode");
                            console.log("[Matches] ✅ VERIFIED localStorage has:", verify);
                          } catch (e) {
                            console.error("[Matches] ❌ Failed to save:", e);
                          }
                        }
                      }}
                      className={`h-7 rounded-md px-3 text-[11px] font-medium transition ${
                        homeTeamMode === "opponent"
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                      }`}
                    >
                      Opponent
                    </button>
                  </div>
                  {homeTeamMode === "registered" ? (
                    <select
                      {...register("homeTeamId")}
                      className={`h-8 w-full rounded-md border bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:ring-1 ${
                        errors.homeTeamId
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/60"
                          : "border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/60"
                      }`}
                    >
                      <option value="">Select team</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id.toString()}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      {...register("homeTeamName")}
                      className={`h-8 w-full rounded-md border bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:ring-1 ${
                        errors.homeTeamName
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/60"
                          : "border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/60"
                      }`}
                      placeholder="Enter opponent team name"
                    />
                  )}
                  {(errors.homeTeamId || errors.homeTeamName) && (
                    <p className="text-[10px] text-red-400">
                      {errors.homeTeamId?.message || errors.homeTeamName?.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400">Away team *</label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        const newMode = "registered";
                        console.log("[Matches] 🔵 Clicked: Setting awayTeamMode to:", newMode);
                        setAwayTeamMode(newMode);
                        setValue("awayTeamName", "");
                        if (typeof window !== "undefined") {
                          try {
                            localStorage.setItem("matchForm_awayTeamMode", newMode);
                            console.log("[Matches] ✅ SAVED awayTeamMode to localStorage:", newMode);
                            // Verify it was saved
                            const verify = localStorage.getItem("matchForm_awayTeamMode");
                            console.log("[Matches] ✅ VERIFIED localStorage has:", verify);
                          } catch (e) {
                            console.error("[Matches] ❌ Failed to save:", e);
                          }
                        }
                      }}
                      className={`h-7 rounded-md px-3 text-[11px] font-medium transition ${
                        awayTeamMode === "registered"
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                      }`}
                    >
                      My Team
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newMode = "opponent";
                        console.log("[Matches] 🔵 Clicked: Setting awayTeamMode to:", newMode);
                        setAwayTeamMode(newMode);
                        setValue("awayTeamId", "");
                        if (typeof window !== "undefined") {
                          try {
                            localStorage.setItem("matchForm_awayTeamMode", newMode);
                            console.log("[Matches] ✅ SAVED awayTeamMode to localStorage:", newMode);
                            // Verify it was saved
                            const verify = localStorage.getItem("matchForm_awayTeamMode");
                            console.log("[Matches] ✅ VERIFIED localStorage has:", verify);
                          } catch (e) {
                            console.error("[Matches] ❌ Failed to save:", e);
                          }
                        }
                      }}
                      className={`h-7 rounded-md px-3 text-[11px] font-medium transition ${
                        awayTeamMode === "opponent"
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                      }`}
                    >
                      Opponent
                    </button>
                  </div>
                  {awayTeamMode === "registered" ? (
                    <select
                      {...register("awayTeamId")}
                      className={`h-8 w-full rounded-md border bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:ring-1 ${
                        errors.awayTeamId
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/60"
                          : "border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/60"
                      }`}
                    >
                      <option value="">Select team</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id.toString()}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      {...register("awayTeamName")}
                      className={`h-8 w-full rounded-md border bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:ring-1 ${
                        errors.awayTeamName
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/60"
                          : "border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/60"
                      }`}
                      placeholder="Enter opponent team name"
                    />
                  )}
                  {(errors.awayTeamId || errors.awayTeamName) && (
                    <p className="text-[10px] text-red-400">
                      {errors.awayTeamId?.message || errors.awayTeamName?.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400">Competition *</label>
                  <input
                    {...register("competition")}
                    className={`h-8 w-full rounded-md border bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:ring-1 ${
                      errors.competition
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/60"
                        : "border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/60"
                    }`}
                    placeholder="League / Cup"
                  />
                  {errors.competition && (
                    <p className="text-[10px] text-red-400">{errors.competition.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400">Venue</label>
                  <input
                    {...register("venue")}
                    className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400">Kick-off date *</label>
                  <input
                    type="date"
                    {...register("date")}
                    className={`h-8 w-full rounded-md border bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:ring-1 ${
                      errors.date
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/60"
                        : "border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/60"
                    }`}
                  />
                  {errors.date && (
                    <p className="text-[10px] text-red-400">{errors.date.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400">Kick-off time</label>
                  <input
                    type="time"
                    {...register("time")}
                    className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400">Score (Home)</label>
                  <input
                    type="number"
                    min="0"
                    {...register("scoreHome")}
                    className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400">Score (Away)</label>
                  <input
                    type="number"
                    min="0"
                    {...register("scoreAway")}
                    className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 h-8 w-full rounded-md bg-emerald-500 text-[11px] font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Creating..." : "Create match"}
              </button>
            </form>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

