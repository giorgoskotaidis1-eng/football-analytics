"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { teamSchema, type TeamFormData } from "@/lib/validations";
import toast from "react-hot-toast";
import { Toaster } from "react-hot-toast";
import { useTranslation } from "@/lib/i18n";

type Player = {
  id: number;
  name: string;
  position: string;
  number: number | null;
  slug: string;
};

type Team = {
  id: number;
  name: string;
  league: string | null;
  style: string | null;
  players?: Player[];
  _count: {
    players: number;
    homeGames: number;
    awayGames: number;
  };
};

export default function TeamsPage() {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [openActionsMenu, setOpenActionsMenu] = useState<number | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [showAddPlayersModal, setShowAddPlayersModal] = useState<number | null>(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: "",
      league: "",
      style: "",
    },
  });

  // Check authentication first
  useEffect(() => {
    async function checkAuth() {
      try {
        const userRes = await fetch("/api/account/me");
        if (!userRes.ok) {
          window.location.href = "/auth/login";
          return;
        }
        const userData = await userRes.json();
        if (!userData.ok) {
          window.location.href = "/auth/login";
          return;
        }
      } catch {
        window.location.href = "/auth/login";
      }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    fetchTeams();
    fetchAllPlayers();
  }, []);

  async function fetchTeams() {
    try {
      const res = await fetch("/api/teams");
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setTeams(data.teams);
        }
      }
    } catch {
      // ignore errors
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllPlayers() {
    try {
      const res = await fetch("/api/players");
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.players) {
          setAllPlayers(data.players.map((p: any) => ({
            id: p.id,
            name: p.name,
            position: p.position,
            number: p.number,
            slug: p.slug,
          })));
        }
      }
    } catch {
      // ignore errors
    }
  }

  async function handleEditTeam(data: TeamFormData) {
    if (!editingTeam) return;

    try {
      const res = await fetch(`/api/teams/${editingTeam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          league: data.league || undefined,
          style: data.style || undefined,
        }),
      });

      const result = await res.json();

      if (res.ok && result.ok) {
        toast.success("Team updated successfully!");
        reset();
        setEditingTeam(null);
        fetchTeams();
      } else {
        toast.error(result.message || "Failed to update team");
      }
    } catch (error) {
      toast.error("An error occurred while updating team");
    }
  }

  async function handleDeleteTeam(teamId: number) {
    if (!confirm("Are you sure you want to delete this team?")) return;

    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Team deleted successfully");
        fetchTeams();
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || "Failed to delete team");
      }
    } catch {
      toast.error("Network error");
    }
  }

  async function handleAddPlayersToTeam(teamId: number) {
    if (selectedPlayerIds.length === 0) {
      toast.error("Please select at least one player");
      return;
    }

    try {
      const res = await fetch(`/api/teams/${teamId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerIds: selectedPlayerIds }),
      });

      const result = await res.json();

      if (res.ok && result.ok) {
        toast.success("Players added to team successfully!");
        setShowAddPlayersModal(null);
        setSelectedPlayerIds([]);
        fetchTeams();
      } else {
        toast.error(result.message || "Failed to add players to team");
      }
    } catch (error) {
      toast.error("An error occurred while adding players to team");
    }
  }

  async function handleRemovePlayerFromTeam(teamId: number, playerId: number) {
    try {
      const res = await fetch(`/api/teams/${teamId}/players?playerId=${playerId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success(t("playerRemovedSuccessfully"));
        fetchTeams();
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || t("failedToRemovePlayer"));
      }
    } catch {
      toast.error(t("networkError"));
    }
  }

  async function handleAddTeam(data: TeamFormData) {
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          league: data.league || undefined,
          style: data.style || undefined,
        }),
      });

      const result = await res.json();

      if (res.ok && result.ok) {
        toast.success(t("teamAddedSuccessfully"));
        reset();
        setShowAddTeam(false);
        fetchTeams();
      } else {
        toast.error(result.message || t("failedToAddTeam"));
      }
    } catch (error) {
      toast.error(t("errorAddingTeam"));
    }
  }

  async function fetchTeamDetails(teamId: number) {
    try {
      const res = await fetch(`/api/teams/${teamId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.team) {
          return data.team;
        }
      }
    } catch {
      // ignore errors
    }
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-5 text-xs text-slate-700 dark:text-slate-200">
        <p className="text-slate-600 dark:text-slate-400">{t("loadingTeams")}</p>
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
              <div>
                <div className="mb-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">{t("teams").toUpperCase()}</p>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">{t("teamIdentity")}</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t("teamDescription")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/teams/compare"
                  className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all hover:bg-slate-200 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {t("compareTeams")}
                </Link>
                <button
                  onClick={() => setShowAddTeam(true)}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:scale-105"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t("addTeam")}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-8">
          {/* Club Overview Section */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/50 bg-gradient-to-br from-white dark:from-slate-900/50 via-slate-50/50 dark:via-slate-950/50 to-white dark:to-slate-950/50 p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("clubOverview")}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t("manageTeamsAndTrack")}</p>
              </div>
              <div className="rounded-full bg-slate-100 dark:bg-slate-800/50 px-4 py-2 border border-slate-300 dark:border-slate-700">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{teams.length} {teams.length === 1 ? t("teams").toLowerCase() : t("teams").toLowerCase()}</span>
              </div>
            </div>
            {teams.length === 0 ? (
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/50 bg-gradient-to-br from-white dark:from-slate-900/30 via-slate-50/30 dark:via-slate-950/30 to-white dark:to-slate-950/30 p-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="rounded-full bg-slate-200 dark:bg-slate-800/50 p-4">
                    <svg className="h-10 w-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">No teams yet</p>
                    <p className="text-sm text-slate-600 dark:text-slate-500">Πρόσθεσε την πρώτη σου ομάδα για να ξεκινήσεις</p>
                  </div>
                  <button
                    onClick={() => setShowAddTeam(true)}
                    className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-500 hover:scale-105"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t("createFirstTeam")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="group relative rounded-xl border border-slate-200/80 dark:border-slate-800/50 bg-gradient-to-br from-white dark:from-slate-900/50 via-slate-50/30 dark:via-slate-950/50 to-white dark:to-slate-950/50 p-6 transition-all hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 dark:hover:shadow-emerald-500/10"
                  >
                    {/* Team Header */}
                    <div
                      onClick={async () => {
                        const teamDetails = await fetchTeamDetails(team.id);
                        if (teamDetails) {
                          setEditingTeam(teamDetails);
                          setValue("name", teamDetails.name);
                          setValue("league", teamDetails.league || "");
                          setValue("style", teamDetails.style || "");
                          const modal = document.getElementById(`team-modal-${team.id}`);
                          if (modal) {
                            modal.classList.remove("hidden");
                            modal.classList.add("flex");
                          }
                        }
                      }}
                      className="mb-4 cursor-pointer"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/20 border border-emerald-500/30">
                          <span className="text-xl font-bold text-emerald-400">
                            {team.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionsMenu(openActionsMenu === team.id ? null : team.id);
                            }}
                            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 p-2 text-slate-600 dark:text-slate-400 transition hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          {openActionsMenu === team.id && (
                            <>
                              <div
                                className="fixed inset-0 z-20"
                                onClick={() => setOpenActionsMenu(null)}
                              />
                              <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-lg overflow-hidden max-h-96">
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const teamDetails = await fetchTeamDetails(team.id);
                                    if (teamDetails) {
                                      setEditingTeam(teamDetails);
                                      setValue("name", teamDetails.name);
                                      setValue("league", teamDetails.league || "");
                                      setValue("style", teamDetails.style || "");
                                      setShowAddTeam(true);
                                    }
                                    setOpenActionsMenu(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
                                >
                                  {t("edit")}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowAddPlayersModal(team.id);
                                    setSelectedPlayerIds([]);
                                    setOpenActionsMenu(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-emerald-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
                                >
                                  {t("addPlayers")}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTeam(team.id);
                                    setOpenActionsMenu(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
                                >
                                  {t("delete")}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{team.name}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {team.league || "No league"} {team.style ? `• ${team.style}` : ""}
                      </p>
                    </div>

                    {/* Statistics Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                        <div className="mb-1 flex items-center justify-center">
                          <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t("players")}</p>
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{team._count.players}</p>
                      </div>
                      <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 text-center">
                        <div className="mb-1 flex items-center justify-center">
                          <svg className="h-4 w-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t("home")}</p>
                        <p className="text-lg font-bold text-sky-600 dark:text-sky-400">{team._count.homeGames}</p>
                      </div>
                      <div className="rounded-lg border border-pink-500/20 bg-pink-500/5 p-3 text-center">
                        <div className="mb-1 flex items-center justify-center">
                          <svg className="h-4 w-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t("away")}</p>
                        <p className="text-lg font-bold text-pink-600 dark:text-pink-400">{team._count.awayGames}</p>
                      </div>
                    </div>

                    {/* Quick Stats Footer */}
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <p className="text-xs text-slate-600 dark:text-slate-500">
                        {team._count.players} {t("players").toLowerCase()} • {team._count.homeGames + team._count.awayGames} {t("totalMatches").toLowerCase()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Team Details Modals */}
        {teams.map((team) => {
          const teamWithPlayers = editingTeam && editingTeam.id === team.id ? editingTeam : team;
          return (
            <div
              key={team.id}
              id={`team-modal-${team.id}`}
              className="fixed inset-0 z-50 hidden items-center justify-center bg-black/60"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  e.currentTarget.classList.add("hidden");
                }
              }}
            >
              <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-950/95 p-6 text-xs text-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-50">{team.name}</h3>
                  <button
                    onClick={() => {
                      const modal = document.getElementById(`team-modal-${team.id}`);
                      if (modal) {
                        modal.classList.add("hidden");
                      }
                    }}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                    <p className="mb-2 text-[11px] font-medium text-slate-300">Team Information</p>
                    <div className="space-y-2 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">{t("league")}:</span>
                        <span className="text-slate-800 dark:text-slate-200">{team.league || t("notSpecified")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">{t("style")}:</span>
                        <span className="text-slate-800 dark:text-slate-200">{team.style || t("notSpecified")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">{t("totalPlayers")}:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{team._count.players}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">{t("totalMatches")}:</span>
                        <span className="font-semibold text-sky-600 dark:text-sky-400">{team._count.homeGames + team._count.awayGames}</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{t("players")}</p>
                      <button
                        onClick={() => {
                          setShowAddPlayersModal(team.id);
                          setSelectedPlayerIds([]);
                        }}
                        className="h-6 rounded-md bg-emerald-500 px-3 text-[10px] font-semibold text-white shadow-sm transition hover:bg-emerald-400"
                      >
                        + {t("addPlayers")}
                      </button>
                    </div>
                    {teamWithPlayers.players && teamWithPlayers.players.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {teamWithPlayers.players.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              {player.number && (
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">#{player.number}</span>
                              )}
                              <span className="text-[11px] text-slate-800 dark:text-slate-200">{player.name}</span>
                              <span className="text-[10px] text-slate-600 dark:text-slate-500">({player.position})</span>
                            </div>
                            <button
                              onClick={() => handleRemovePlayerFromTeam(team.id, player.id)}
                              className="text-[10px] text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
                            >
                              {t("remove")}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-600 dark:text-slate-500 py-2">{t("noPlayersAssigned")}</p>
                    )}
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4">
                    <p className="mb-2 text-[11px] font-medium text-slate-700 dark:text-slate-300">{t("matchStatistics")}</p>
                    <div className="grid grid-cols-2 gap-3 text-[10px]">
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">{t("homeGames")}</p>
                        <p className="text-lg font-semibold text-sky-600 dark:text-sky-300">{team._count.homeGames}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">{t("awayGames")}</p>
                        <p className="text-lg font-semibold text-red-600 dark:text-red-300">{team._count.awayGames}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {(showAddTeam || editingTeam) && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/95 p-5 text-xs text-slate-800 dark:text-slate-200 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    {editingTeam ? t("editTeam") : t("addNewTeam")}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {editingTeam ? t("updateTeamInfo") : t("createNewTeamProfile")}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAddTeam(false);
                    setEditingTeam(null);
                    reset();
                  }}
                  className="h-6 w-6 rounded-full bg-slate-900 text-[11px] text-slate-400 hover:bg-slate-800"
                >
                  ×
                </button>
              </div>
              <form className="space-y-3" onSubmit={handleSubmit(editingTeam ? handleEditTeam : handleAddTeam)}>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-600 dark:text-slate-400">{t("teamName")} *</label>
                  <input
                    {...register("name")}
                    type="text"
                    className={`h-8 w-full rounded-md border bg-white dark:bg-slate-900 px-2 text-[11px] text-slate-900 dark:text-slate-100 outline-none focus:ring-1 ${
                      errors.name
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/60"
                        : "border-slate-300 dark:border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/60"
                    }`}
                    placeholder={t("teamName")}
                  />
                  {errors.name && <p className="text-[10px] text-red-500 dark:text-red-400">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-600 dark:text-slate-400">{t("league")}</label>
                  <input
                    {...register("league")}
                    type="text"
                    className="h-8 w-full rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 text-[11px] text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                    placeholder={t("optional")}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-600 dark:text-slate-400">{t("style")}</label>
                  <input
                    {...register("style")}
                    type="text"
                    className="h-8 w-full rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 text-[11px] text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                    placeholder={t("optional")}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 h-8 w-full rounded-md bg-emerald-500 text-[11px] font-semibold text-white shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? editingTeam
                      ? "Updating..."
                      : "Adding..."
                    : editingTeam
                      ? t("save")
                      : t("addTeam")}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Add Players to Team Modal */}
        {showAddPlayersModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/95 p-5 text-xs text-slate-800 dark:text-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="mb-3 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    {t("addPlayerToTeam")}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {t("selectPlayersToAdd")} {teams.find((t) => t.id === showAddPlayersModal)?.name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAddPlayersModal(null);
                    setSelectedPlayerIds([]);
                  }}
                  className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-900 text-[11px] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  ×
                </button>
              </div>
              <div className="space-y-3">
                <div className="max-h-96 overflow-y-auto space-y-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3">
                  {allPlayers.length === 0 ? (
                    <p className="text-[10px] text-slate-500 py-4 text-center">{t("noPlayersAvailable")}</p>
                  ) : (
                    allPlayers.map((player) => {
                      const isSelected = selectedPlayerIds.includes(player.id);
                      const isAlreadyInTeam = teams
                        .find((t) => t.id === showAddPlayersModal)
                        ?.players?.some((p) => p.id === player.id);
                      return (
                        <label
                          key={player.id}
                          className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-500/20"
                              : isAlreadyInTeam
                                ? "border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 opacity-50 cursor-not-allowed"
                                : "border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isAlreadyInTeam}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPlayerIds([...selectedPlayerIds, player.id]);
                              } else {
                                setSelectedPlayerIds(selectedPlayerIds.filter((id) => id !== player.id));
                              }
                            }}
                            className="rounded border-slate-700"
                          />
                          <div className="flex-1">
                            <span className="text-[11px] text-slate-800 dark:text-slate-200">{player.name}</span>
                            {player.number && (
                              <span className="ml-2 text-[10px] text-slate-600 dark:text-slate-400">#{player.number}</span>
                            )}
                            <span className="ml-2 text-[10px] text-slate-600 dark:text-slate-500">({player.position})</span>
                            {isAlreadyInTeam && (
                              <span className="ml-2 text-[10px] text-emerald-400">({t("alreadyInTeam")})</span>
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPlayersModal(null);
                      setSelectedPlayerIds([]);
                    }}
                    className="h-8 flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-800"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (showAddPlayersModal) {
                        handleAddPlayersToTeam(showAddPlayersModal);
                      }
                    }}
                    disabled={selectedPlayerIds.length === 0}
                    className="h-8 flex-1 rounded-md bg-emerald-500 text-[11px] font-semibold text-white shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t("addSelectedPlayers")} ({selectedPlayerIds.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
