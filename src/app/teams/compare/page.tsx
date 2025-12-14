"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "@/lib/i18n";

type Team = {
  id: number;
  name: string;
  league: string | null;
};

type OpponentTeam = {
  name: string;
  isOpponent: true;
};

type TeamStats = {
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  xG: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  successfulPasses: number;
  passAccuracy: number;
  touches: number;
  tackles: number;
  interceptions: number;
  possession: number;
  goalsPerMatch: number;
  xGPerMatch: number;
};

type HeadToHeadMatch = {
  id: number;
  slug: string;
  date: string;
  competition: string;
  venue: string | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
  scoreHome: number | null;
  scoreAway: number | null;
  xgHome: number | null;
  xgAway: number | null;
};

type ComparisonData = {
  teams: {
    team1: Team;
    team2: Team;
  };
  stats: {
    team1: TeamStats;
    team2: TeamStats;
  };
  headToHead: {
    matches: number;
    team1Wins: number;
    team2Wins: number;
    draws: number;
    team1Goals: number;
    team2Goals: number;
    matchList: HeadToHeadMatch[];
  };
  formations: {
    team1: {
      mostUsed: string;
      all: Array<{ formation: string; count: number }>;
    };
    team2: {
      mostUsed: string;
      all: Array<{ formation: string; count: number }>;
    };
  };
};

function getTeamName(team: { name: string } | null, teamName: string | null | undefined): string {
  if (team?.name) return team.name;
  if (teamName) return teamName;
  return "Unknown";
}

export default function TeamComparePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [teams, setTeams] = useState<Team[]>([]);
  const [opponentTeams, setOpponentTeams] = useState<OpponentTeam[]>([]);
  const [team1Id, setTeam1Id] = useState<number | null>(null);
  const [team1Name, setTeam1Name] = useState<string | null>(null);
  const [team2Id, setTeam2Id] = useState<number | null>(null);
  const [team2Name, setTeam2Name] = useState<string | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);

  // Load teams and opponent teams
  useEffect(() => {
    // Load registered teams
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

    // Load opponent teams from matches
    fetch("/api/matches")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.matches) {
          const opponents = new Set<string>();
          data.matches.forEach((match: any) => {
            if (match.homeTeamName && !match.homeTeamId) {
              opponents.add(match.homeTeamName);
            }
            if (match.awayTeamName && !match.awayTeamId) {
              opponents.add(match.awayTeamName);
            }
          });
          setOpponentTeams(
            Array.from(opponents).map((name) => ({ name, isOpponent: true as const }))
          );
        }
      })
      .catch(() => {
        console.error("Failed to load opponent teams");
      });
  }, []);

  // Load team IDs/names from URL
  useEffect(() => {
    const id1 = searchParams.get("team1");
    const id2 = searchParams.get("team2");
    const name1 = searchParams.get("team1Name");
    const name2 = searchParams.get("team2Name");

    if (id1) {
      const team1 = parseInt(id1);
      if (!isNaN(team1)) {
        setTeam1Id(team1);
        setTeam1Name(null);
      }
    } else if (name1) {
      setTeam1Id(null);
      setTeam1Name(name1);
    }

    if (id2) {
      const team2 = parseInt(id2);
      if (!isNaN(team2)) {
        setTeam2Id(team2);
        setTeam2Name(null);
      }
    } else if (name2) {
      setTeam2Id(null);
      setTeam2Name(name2);
    }
  }, [searchParams]);

  // Fetch comparison when teams are selected
  useEffect(() => {
    const hasTeam1 = team1Id || team1Name;
    const hasTeam2 = team2Id || team2Name;
    if (hasTeam1 && hasTeam2) {
      // Check if not comparing same team
      if (
        (team1Id && team2Id && team1Id === team2Id) ||
        (team1Name && team2Name && team1Name === team2Name)
      ) {
        return;
      }
      fetchComparison();
    }
  }, [team1Id, team1Name, team2Id, team2Name]);

  async function fetchComparison() {
    const hasTeam1 = team1Id || team1Name;
    const hasTeam2 = team2Id || team2Name;
    if (!hasTeam1 || !hasTeam2) return;

    setLoading(true);
    try {
      const res = await fetch("/api/teams/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team1Id: team1Id || undefined,
          team1Name: team1Name || undefined,
          team2Id: team2Id || undefined,
          team2Name: team2Name || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setComparisonData(data);
          // Update URL
          const params = new URLSearchParams();
          if (team1Id) params.set("team1", team1Id.toString());
          else if (team1Name) params.set("team1Name", team1Name);
          if (team2Id) params.set("team2", team2Id.toString());
          else if (team2Name) params.set("team2Name", team2Name);
          router.push(`/teams/compare?${params.toString()}`, { scroll: false });
        } else {
          toast.error(data.message || "Failed to fetch comparison");
        }
      } else {
        const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
        toast.error(errorData.message || "Failed to fetch comparison");
      }
    } catch (error) {
      console.error("[TeamCompare] Error:", error);
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  function handleCompare() {
    const hasTeam1 = team1Id || team1Name;
    const hasTeam2 = team2Id || team2Name;
    if (!hasTeam1 || !hasTeam2) {
      toast.error("Please select both teams");
      return;
    }
    if (
      (team1Id && team2Id && team1Id === team2Id) ||
      (team1Name && team2Name && team1Name === team2Name)
    ) {
      toast.error("Please select two different teams");
      return;
    }
    fetchComparison();
  }

  if (!comparisonData) {
    return (
      <>
        <Toaster position="top-right" />
        <div className="min-h-screen bg-slate-950">
          {/* Minimal Header */}
          <header className="border-b border-slate-900/50 bg-slate-950/80 backdrop-blur-sm">
            <div className="mx-auto max-w-7xl px-6 py-4">
              <div className="flex items-center gap-4">
                <Link 
                  href="/teams" 
                  className="text-sm font-medium text-slate-500 hover:text-white transition-colors"
                >
                  ← Teams
                </Link>
                <div className="h-4 w-px bg-slate-800" />
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{t("teamComparison")}</h1>
              </div>
            </div>
          </header>

          {/* Main Content - Instat/Wyscout Style */}
          <main className="mx-auto max-w-4xl px-6 py-12">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t("selectTeams")}</h2>
              <p className="text-sm text-slate-600 dark:text-slate-500">
                {t("teamComparisonDescription")}
              </p>
            </div>

            {/* Clean Selection Interface */}
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Team 1 */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    {t("selectFirstTeam")}
                  </label>
                  <div className="relative">
                    <select
                      value={team1Id ? `team-${team1Id}` : team1Name ? `opponent-${team1Name}` : ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.startsWith("team-")) {
                          setTeam1Id(parseInt(value.replace("team-", "")));
                          setTeam1Name(null);
                        } else if (value.startsWith("opponent-")) {
                          setTeam1Id(null);
                          setTeam1Name(value.replace("opponent-", ""));
                        } else {
                          setTeam1Id(null);
                          setTeam1Name(null);
                        }
                      }}
                      className="h-14 w-full appearance-none rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 pr-10 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-400 dark:hover:border-slate-700"
                    >
                      <option value="" className="bg-white dark:bg-slate-900 text-slate-400">{t("selectFirstTeam")}</option>
                      {teams.length > 0 ? (
                        <optgroup label="My Teams" className="bg-slate-900">
                          {teams.map((team) => (
                            <option key={team.id} value={`team-${team.id}`} className="bg-slate-900 text-white">
                              {team.name}
                            </option>
                          ))}
                        </optgroup>
                      ) : (
                        <option disabled className="bg-slate-900 text-slate-500">No teams registered yet</option>
                      )}
                      {opponentTeams.length > 0 ? (
                        <optgroup label="Opponent Teams" className="bg-slate-900">
                          {opponentTeams.map((opponent, idx) => (
                            <option key={idx} value={`opponent-${opponent.name}`} className="bg-slate-900 text-white">
                              {opponent.name}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Team 2 */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    {t("selectSecondTeam")}
                  </label>
                  <div className="relative">
                    <select
                      value={team2Id ? `team-${team2Id}` : team2Name ? `opponent-${team2Name}` : ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.startsWith("team-")) {
                          setTeam2Id(parseInt(value.replace("team-", "")));
                          setTeam2Name(null);
                        } else if (value.startsWith("opponent-")) {
                          setTeam2Id(null);
                          setTeam2Name(value.replace("opponent-", ""));
                        } else {
                          setTeam2Id(null);
                          setTeam2Name(null);
                        }
                      }}
                      className="h-14 w-full appearance-none rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 pr-10 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-400 dark:hover:border-slate-700"
                    >
                      <option value="" className="bg-white dark:bg-slate-900 text-slate-400">{t("selectSecondTeam")}</option>
                      {teams.length > 0 ? (
                        <optgroup label="My Teams" className="bg-slate-900">
                          {teams.map((team) => (
                            <option key={team.id} value={`team-${team.id}`} className="bg-slate-900 text-white">
                              {team.name}
                            </option>
                          ))}
                        </optgroup>
                      ) : (
                        <option disabled className="bg-slate-900 text-slate-500">No teams registered yet</option>
                      )}
                      {opponentTeams.length > 0 ? (
                        <optgroup label="Opponent Teams" className="bg-slate-900">
                          {opponentTeams.map((opponent, idx) => (
                            <option key={idx} value={`opponent-${opponent.name}`} className="bg-slate-900 text-white">
                              {opponent.name}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button - Clean & Professional */}
              <button
                onClick={handleCompare}
                disabled={
                  (!team1Id && !team1Name) ||
                  (!team2Id && !team2Name) ||
                  (team1Id && team2Id && team1Id === team2Id) ||
                  (team1Name && team2Name && team1Name === team2Name) ||
                  loading
                }
                className="h-14 w-full rounded-lg bg-emerald-600 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-emerald-600 disabled:hover:shadow-lg disabled:active:scale-100"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Comparing...
                  </span>
                ) : (
                  t("compare")
                )}
              </button>
            </div>
          </main>
        </div>
      </>
    );
  }

  const { teams: comparedTeams, stats, headToHead, formations } = comparisonData;

  return (
    <>
      <Toaster position="top-right" />
      <div className="space-y-5 text-xs text-slate-200">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/teams" className="text-slate-400 hover:text-slate-200 transition">
              ← Back to Teams
            </Link>
            <h1 className="text-xl font-semibold text-white">Team Comparison</h1>
          </div>
          <button
            onClick={() => {
              setComparisonData(null);
              setTeam1Id(null);
              setTeam1Name(null);
              setTeam2Id(null);
              setTeam2Name(null);
              router.push("/teams/compare");
            }}
            className="h-8 rounded-md border border-slate-700 bg-slate-800 px-4 text-[11px] font-semibold text-slate-200 shadow-sm transition hover:bg-slate-700"
          >
            Compare Different Teams
          </button>
        </header>

        {/* Teams Header - Professional Style */}
        <section className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="relative overflow-hidden rounded-lg border border-emerald-500/30 bg-gradient-to-br from-emerald-950/50 to-slate-950 p-5 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
              <div className="relative">
                <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-500/40">
                  <span className="text-lg font-bold text-emerald-400">
                    {comparedTeams.team1.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-50">{comparedTeams.team1.name}</h2>
                {comparedTeams.team1.league && (
                  <p className="text-[10px] text-slate-400 mt-1">{comparedTeams.team1.league}</p>
                )}
                <div className="mt-3 flex items-center justify-center gap-4 text-[11px]">
                  <div className="rounded-md bg-slate-900/50 px-3 py-1.5">
                    <span className="text-slate-400">Matches</span>
                    <p className="font-semibold text-emerald-400">{stats.team1.matches}</p>
                  </div>
                  <div className="rounded-md bg-slate-900/50 px-3 py-1.5">
                    <span className="text-slate-400">Wins</span>
                    <p className="font-semibold text-emerald-400">{stats.team1.wins}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border border-emerald-500/30 bg-gradient-to-br from-emerald-950/50 to-slate-950 p-5 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
              <div className="relative">
                <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-500/40">
                  <span className="text-lg font-bold text-emerald-400">
                    {comparedTeams.team2.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-50">{comparedTeams.team2.name}</h2>
                {comparedTeams.team2.league && (
                  <p className="text-[10px] text-slate-400 mt-1">{comparedTeams.team2.league}</p>
                )}
                <div className="mt-3 flex items-center justify-center gap-4 text-[11px]">
                  <div className="rounded-md bg-slate-900/50 px-3 py-1.5">
                    <span className="text-slate-400">Matches</span>
                    <p className="font-semibold text-emerald-400">{stats.team2.matches}</p>
                  </div>
                  <div className="rounded-md bg-slate-900/50 px-3 py-1.5">
                    <span className="text-slate-400">Wins</span>
                    <p className="font-semibold text-emerald-400">{stats.team2.wins}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Head-to-Head Record - Professional Style */}
        <section className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Head-to-Head Record
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {headToHead.matches} {headToHead.matches === 1 ? "match" : "matches"} played
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-2">
              <p className="text-[10px] text-slate-400">Total Goals</p>
              <p className="text-sm font-bold text-amber-400">
                {headToHead.team1Goals} - {headToHead.team2Goals}
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="group relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-slate-950 p-5 text-center transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
              <div className="relative">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-3">
                  {comparedTeams.team1.name}
                </p>
                <div className="mb-2 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-500/40">
                  <p className="text-3xl font-bold text-emerald-400">{headToHead.team1Wins}</p>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Wins</p>
                {headToHead.matches > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                        style={{
                          width: `${(headToHead.team1Wins / headToHead.matches) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-[9px] text-slate-500">
                      {((headToHead.team1Wins / headToHead.matches) * 100).toFixed(0)}% win rate
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="group relative overflow-hidden rounded-xl border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-950 p-5 text-center transition-all hover:border-slate-600 hover:shadow-lg">
              <div className="relative">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-3">
                  Draws
                </p>
                <div className="mb-2 inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 ring-2 ring-slate-700">
                  <p className="text-3xl font-bold text-slate-300">{headToHead.draws}</p>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Tied Matches</p>
                {headToHead.matches > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900">
                      <div
                        className="h-full bg-gradient-to-r from-slate-600 to-slate-500 transition-all"
                        style={{
                          width: `${(headToHead.draws / headToHead.matches) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-[9px] text-slate-500">
                      {((headToHead.draws / headToHead.matches) * 100).toFixed(0)}% draw rate
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="group relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-slate-950 p-5 text-center transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
              <div className="relative">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-3">
                  {comparedTeams.team2.name}
                </p>
                <div className="mb-2 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-500/40">
                  <p className="text-3xl font-bold text-emerald-400">{headToHead.team2Wins}</p>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Wins</p>
                {headToHead.matches > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                        style={{
                          width: `${(headToHead.team2Wins / headToHead.matches) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-[9px] text-slate-500">
                      {((headToHead.team2Wins / headToHead.matches) * 100).toFixed(0)}% win rate
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Head-to-Head Matches - Professional Style */}
          {headToHead.matchList && headToHead.matchList.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-[11px] font-semibold text-slate-300 mb-3">Previous Matches</p>
              <div className="space-y-2">
                {headToHead.matchList.slice(0, 5).map((match) => {
                  const team1IsHome =
                    (comparedTeams.team1.id && match.homeTeamId === comparedTeams.team1.id) ||
                    (comparedTeams.team1.id === null && match.homeTeamName === comparedTeams.team1.name);
                  const team1Name = team1IsHome
                    ? getTeamName(
                        comparedTeams.team1.id ? { name: comparedTeams.team1.name } : null,
                        match.homeTeamName
                      )
                    : getTeamName(
                        comparedTeams.team1.id ? { name: comparedTeams.team1.name } : null,
                        match.awayTeamName
                      );
                  const team2Name = team1IsHome
                    ? getTeamName(
                        comparedTeams.team2.id ? { name: comparedTeams.team2.name } : null,
                        match.awayTeamName
                      )
                    : getTeamName(
                        comparedTeams.team2.id ? { name: comparedTeams.team2.name } : null,
                        match.homeTeamName
                      );
                  const team1Score = team1IsHome ? (match.scoreHome || 0) : (match.scoreAway || 0);
                  const team2Score = team1IsHome ? (match.scoreAway || 0) : (match.scoreHome || 0);
                  const team1Won = team1Score > team2Score;
                  const team2Won = team2Score > team1Score;

                  return (
                    <Link
                      key={match.id}
                      href={`/matches/${match.id}`}
                      className="group flex items-center justify-between rounded-lg border border-slate-800 bg-gradient-to-r from-slate-950/50 to-slate-900/50 p-3 transition-all hover:border-slate-700 hover:bg-slate-900/50"
                    >
                      <div className="flex items-center gap-4 text-[11px]">
                        <span className="text-[10px] text-slate-500">
                          {format(new Date(match.date), "dd MMM yyyy")}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${
                              team1Won ? "text-emerald-400" : "text-slate-300"
                            }`}
                          >
                            {team1Name}
                          </span>
                          <span className="text-slate-500">
                            {team1Score} - {team2Score}
                          </span>
                          <span
                            className={`font-semibold ${
                              team2Won ? "text-emerald-400" : "text-slate-300"
                            }`}
                          >
                            {team2Name}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">{match.competition}</span>
                        {match.xgHome !== null && match.xgAway !== null && (
                          <span className="text-[9px] text-slate-600">
                            xG: {team1IsHome ? match.xgHome.toFixed(1) : match.xgAway.toFixed(1)} -{" "}
                            {team1IsHome ? match.xgAway.toFixed(1) : match.xgHome.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Stats Comparison - Professional Style with Cards */}
        <section className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-6">
          <div className="mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Statistics Comparison
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Comprehensive performance metrics across all matches
            </p>
          </div>

          {/* Key Metrics Cards */}
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            {/* Matches */}
            <div className="group relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-4 transition-all hover:border-slate-700 hover:shadow-lg">
              <div className="mb-2 flex items-center gap-2">
                <div className="rounded-md bg-slate-800 p-1.5">
                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-[10px] font-medium text-slate-500">Matches</p>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-slate-200">{stats.team1.matches}</p>
                <span className="text-[10px] text-slate-500">vs</span>
                <p className="text-2xl font-bold text-slate-200">{stats.team2.matches}</p>
              </div>
            </div>

            {/* Wins */}
            <div className="group relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-slate-950 p-4 transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
              <div className="relative">
                <div className="mb-2 flex items-center gap-2">
                  <div className="rounded-md bg-emerald-500/20 p-1.5">
                    <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <p className="text-[10px] font-medium text-slate-500">Wins</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-emerald-400">{stats.team1.wins}</p>
                  <span className="text-[10px] text-slate-500">vs</span>
                  <p className="text-2xl font-bold text-emerald-400">{stats.team2.wins}</p>
                </div>
                {stats.team1.wins + stats.team2.wins > 0 && (
                  <div className="mt-2 flex gap-1">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-900">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                        style={{
                          width: `${(stats.team1.wins / (stats.team1.wins + stats.team2.wins)) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-900">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                        style={{
                          width: `${(stats.team2.wins / (stats.team1.wins + stats.team2.wins)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Draws */}
            <div className="group relative overflow-hidden rounded-xl border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-950 p-4 transition-all hover:border-slate-600 hover:shadow-lg">
              <div className="mb-2 flex items-center gap-2">
                <div className="rounded-md bg-slate-800 p-1.5">
                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-[10px] font-medium text-slate-500">Draws</p>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-slate-300">{stats.team1.draws}</p>
                <span className="text-[10px] text-slate-500">vs</span>
                <p className="text-2xl font-bold text-slate-300">{stats.team2.draws}</p>
              </div>
            </div>

            {/* Losses */}
            <div className="group relative overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-br from-red-950/30 to-slate-950 p-4 transition-all hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent" />
              <div className="relative">
                <div className="mb-2 flex items-center gap-2">
                  <div className="rounded-md bg-red-500/20 p-1.5">
                    <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <p className="text-[10px] font-medium text-slate-500">Losses</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-red-400">{stats.team1.losses}</p>
                  <span className="text-[10px] text-slate-500">vs</span>
                  <p className="text-2xl font-bold text-red-400">{stats.team2.losses}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Stats Grid - Card Style */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Attacking Stats */}
            <div className="space-y-3 rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-slate-950 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-md bg-amber-500/20 p-2">
                  <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-[11px] font-semibold text-slate-300">Attacking Metrics</p>
              </div>
              <div className="space-y-3">
                {/* Goals */}
                <div className="group rounded-lg border border-slate-800 bg-slate-900/30 p-3 transition-all hover:border-amber-500/30 hover:bg-slate-900/50">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-amber-500/20 p-1">
                        <svg className="h-3.5 w-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <span className="text-[11px] font-medium text-slate-400">Goals</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-amber-400">{stats.team1.goals}</span>
                      <span className="text-[10px] text-slate-500">vs</span>
                      <span className="text-xl font-bold text-amber-400">{stats.team2.goals}</span>
                    </div>
                    {stats.team1.goals + stats.team2.goals > 0 && (
                      <div className="flex gap-1">
                        <div className="h-2 w-12 overflow-hidden rounded-full bg-slate-900">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-400"
                            style={{
                              width: `${(stats.team1.goals / (stats.team1.goals + stats.team2.goals)) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="h-2 w-12 overflow-hidden rounded-full bg-slate-900">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-400"
                            style={{
                              width: `${(stats.team2.goals / (stats.team1.goals + stats.team2.goals)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* xG */}
                <div className="group rounded-lg border border-slate-800 bg-slate-900/30 p-3 transition-all hover:border-emerald-500/30 hover:bg-slate-900/50">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-emerald-500/20 p-1">
                        <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <span className="text-[11px] font-medium text-slate-400">Expected Goals (xG)</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-emerald-400">
                        {stats.team1.xG.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-500">vs</span>
                      <span className="text-xl font-bold text-emerald-400">
                        {stats.team2.xG.toFixed(2)}
                      </span>
                    </div>
                    {stats.team1.xG + stats.team2.xG > 0 && (
                      <div className="flex gap-1">
                        <div className="h-2 w-12 overflow-hidden rounded-full bg-slate-900">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                            style={{
                              width: `${(stats.team1.xG / (stats.team1.xG + stats.team2.xG)) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="h-2 w-12 overflow-hidden rounded-full bg-slate-900">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                            style={{
                              width: `${(stats.team2.xG / (stats.team1.xG + stats.team2.xG)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Goals per Match */}
                <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="rounded bg-amber-500/20 p-1">
                      <svg className="h-3.5 w-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">Goals / Match</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-slate-200">
                      {stats.team1.goalsPerMatch.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500">vs</span>
                    <span className="text-lg font-bold text-slate-200">
                      {stats.team2.goalsPerMatch.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Shots */}
                <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="rounded bg-purple-500/20 p-1">
                      <svg className="h-3.5 w-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">Shots</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-slate-200">{stats.team1.shots}</span>
                    <span className="text-[10px] text-slate-500">vs</span>
                    <span className="text-lg font-bold text-slate-200">{stats.team2.shots}</span>
                  </div>
                </div>

                {/* Shots on Target */}
                <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="rounded bg-emerald-500/20 p-1">
                      <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">Shots on Target</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-emerald-400">
                      {stats.team1.shotsOnTarget}
                    </span>
                    <span className="text-[10px] text-slate-500">vs</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {stats.team2.shotsOnTarget}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Passing & Possession Stats */}
            <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-slate-950 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-md bg-emerald-500/20 p-2">
                  <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-[11px] font-semibold text-slate-300">Passing & Possession</p>
              </div>
              <div className="space-y-3">
                {/* Passes */}
                <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="rounded bg-emerald-500/20 p-1">
                      <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">Total Passes</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-slate-200">{stats.team1.passes}</span>
                    <span className="text-[10px] text-slate-500">vs</span>
                    <span className="text-lg font-bold text-slate-200">{stats.team2.passes}</span>
                  </div>
                </div>

                {/* Pass Accuracy */}
                <div className="group rounded-lg border border-slate-800 bg-slate-900/30 p-3 transition-all hover:border-emerald-500/30 hover:bg-slate-900/50">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-emerald-500/20 p-1">
                        <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-[11px] font-medium text-slate-400">Pass Accuracy</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-emerald-400">
                        {stats.team1.passAccuracy.toFixed(1)}%
                      </span>
                      <span className="text-lg font-bold text-emerald-400">
                        {stats.team2.passAccuracy.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-900">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                          style={{ width: `${Math.min(100, stats.team1.passAccuracy)}%` }}
                        />
                      </div>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-900">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                          style={{ width: `${Math.min(100, stats.team2.passAccuracy)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Possession */}
                <div className="group rounded-lg border border-slate-800 bg-slate-900/30 p-3 transition-all hover:border-sky-500/30 hover:bg-slate-900/50">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-sky-500/20 p-1">
                        <svg className="h-3.5 w-3.5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <span className="text-[11px] font-medium text-slate-400">Possession</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-sky-400">
                        {stats.team1.possession.toFixed(1)}%
                      </span>
                      <span className="text-lg font-bold text-sky-400">
                        {stats.team2.possession.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-900">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-sky-400"
                          style={{ width: `${Math.min(100, stats.team1.possession)}%` }}
                        />
                      </div>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-900">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-sky-400"
                          style={{ width: `${Math.min(100, stats.team2.possession)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Defensive Stats */}
                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/30 p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="rounded-md bg-red-500/20 p-1.5">
                      <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-300">Defensive</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="rounded bg-orange-500/20 p-0.5">
                          <svg className="h-3 w-3 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <span className="text-[11px] text-slate-400">Tackles</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-slate-200">
                          {stats.team1.tackles}
                        </span>
                        <span className="text-[9px] text-slate-500">vs</span>
                        <span className="text-sm font-semibold text-slate-200">
                          {stats.team2.tackles}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="rounded bg-emerald-500/20 p-0.5">
                          <svg className="h-3 w-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-[11px] text-slate-400">Interceptions</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-emerald-400">
                          {stats.team1.interceptions}
                        </span>
                        <span className="text-[9px] text-slate-500">vs</span>
                        <span className="text-sm font-semibold text-emerald-400">
                          {stats.team2.interceptions}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Formations - Professional Style */}
        <section className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-6">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Formations
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Tactical setup preferences and usage frequency
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="group relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-slate-950 p-5 transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
              <div className="relative">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-slate-200">
                    {comparedTeams.team1.name}
                  </p>
                  <div className="rounded-md bg-emerald-500/20 px-2 py-1">
                    <span className="text-[10px] font-bold text-emerald-400">
                      {formations.team1.mostUsed}
                    </span>
                  </div>
                </div>
                <div className="mb-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                  <p className="mb-2 text-[10px] font-medium text-slate-400">Most Used</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {formations.team1.mostUsed}
                  </p>
                </div>
                {formations.team1.all.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium text-slate-500 mb-2">All Formations</p>
                    {formations.team1.all.map((f) => {
                      const totalFormations = formations.team1.all.reduce(
                        (sum, form) => sum + form.count,
                        0
                      );
                      const percentage = totalFormations > 0 ? (f.count / totalFormations) * 100 : 0;
                      return (
                        <div
                          key={f.formation}
                          className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2"
                        >
                          <span className="text-[11px] font-medium text-slate-300">
                            {f.formation}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-900">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400">{f.count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="group relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-slate-950 p-5 transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
              <div className="relative">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-slate-200">
                    {comparedTeams.team2.name}
                  </p>
                  <div className="rounded-md bg-emerald-500/20 px-2 py-1">
                    <span className="text-[10px] font-bold text-emerald-400">
                      {formations.team2.mostUsed}
                    </span>
                  </div>
                </div>
                <div className="mb-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                  <p className="mb-2 text-[10px] font-medium text-slate-400">Most Used</p>
                  <p className="text-2xl font-bold text-emerald-400">{formations.team2.mostUsed}</p>
                </div>
                {formations.team2.all.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium text-slate-500 mb-2">All Formations</p>
                    {formations.team2.all.map((f) => {
                      const totalFormations = formations.team2.all.reduce(
                        (sum, form) => sum + form.count,
                        0
                      );
                      const percentage = totalFormations > 0 ? (f.count / totalFormations) * 100 : 0;
                      return (
                        <div
                          key={f.formation}
                          className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2"
                        >
                          <span className="text-[11px] font-medium text-slate-300">
                            {f.formation}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-900">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400">{f.count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

