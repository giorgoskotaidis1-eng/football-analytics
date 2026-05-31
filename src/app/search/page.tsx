"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "@/lib/i18n";

type PlayerResult = {
  id: number;
  name: string;
  slug: string;
  position: string;
  age: number | null;
  club: string | null;
  team: { id: number; name: string } | null;
};

type TeamResult = {
  id: number;
  name: string;
  league: string | null;
};

type MatchResult = {
  id: number;
  slug: string;
  competition: string;
  date: string;
  homeTeamName: string | null;
  awayTeamName: string | null;
};

type SearchTab = "players" | "teams" | "matches";

export default function SearchPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tab, setTab] = useState<SearchTab>("players");
  const [position, setPosition] = useState<string>("");
  const [ageRange, setAgeRange] = useState<string>("");
  const [competition, setCompetition] = useState<string>("");

  const [players, setPlayers] = useState<PlayerResult[]>([]);
  const [teams, setTeams] = useState<TeamResult[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());
  const [togglingPlayerId, setTogglingPlayerId] = useState<number | null>(null);

  // Debounce search input
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  // Load watchlist ids once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/watchlist");
        const data = await res.json().catch(() => null);
        if (cancelled || !res.ok || !data?.ok) return;
        const ids = new Set<number>(
          Array.isArray(data.watchlist)
            ? data.watchlist
                .map((w: { player?: { id?: number } }) => w?.player?.id)
                .filter((id: unknown): id is number => typeof id === "number")
            : []
        );
        setWatchlistIds(ids);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("q", debouncedSearch);
      params.set("type", tab);
      if (tab === "players") {
        if (position) params.set("position", position);
        if (ageRange) params.set("ageRange", ageRange);
      }
      if (tab === "matches" && competition) params.set("competition", competition);
      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.message || t("failedToSearch") || "Search failed");
        setPlayers([]);
        setTeams([]);
        setMatches([]);
        return;
      }
      setPlayers(Array.isArray(data.players) ? data.players : []);
      setTeams(Array.isArray(data.teams) ? data.teams : []);
      setMatches(Array.isArray(data.matches) ? data.matches : []);
    } catch {
      toast.error(t("failedToSearch") || "Search failed");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, tab, position, ageRange, competition, t]);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  async function toggleWatchlist(playerId: number) {
    setTogglingPlayerId(playerId);
    const wasInWatchlist = watchlistIds.has(playerId);
    try {
      if (wasInWatchlist) {
        const res = await fetch(`/api/watchlist?playerId=${playerId}`, { method: "DELETE" });
        if (!res.ok) {
          toast.error(t("failedToUpdateWatchlist") || "Failed to update watchlist");
          return;
        }
        setWatchlistIds((prev) => {
          const next = new Set(prev);
          next.delete(playerId);
          return next;
        });
      } else {
        const res = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          toast.error(data?.message || t("failedToUpdateWatchlist") || "Failed to update watchlist");
          return;
        }
        setWatchlistIds((prev) => {
          const next = new Set(prev);
          next.add(playerId);
          return next;
        });
      }
    } catch {
      toast.error(t("anErrorOccurred") || "An error occurred");
    } finally {
      setTogglingPlayerId(null);
    }
  }

  const totalResults = useMemo(() => {
    if (tab === "players") return players.length;
    if (tab === "teams") return teams.length;
    return matches.length;
  }, [tab, players, teams, matches]);

  return (
    <>
      <Toaster position="top-right" />
      <div className="space-y-5 text-xs text-slate-200">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {t("globalSearch") || "Global search"}
          </p>
          <h1 className="text-lg font-semibold tracking-tight text-slate-50">
            {t("playersTeamsMatches") || "Players, teams & matches"}
          </h1>
          <p className="text-[11px] text-slate-500">
            {t("searchPageDescription") ||
              "Quickly navigate through your database of players, teams and fixtures."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 flex-1 min-w-[220px] rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            placeholder={t("searchPlayersTeamsMatches") || "Search players, teams, matches..."}
          />
          <div className="flex flex-wrap gap-2 text-[11px]">
            {(["players", "teams", "matches"] as SearchTab[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-full border px-3 py-1 transition ${
                  tab === id
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-200"
                    : "border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900"
                }`}
              >
                {id === "players"
                  ? t("players") || "Players"
                  : id === "teams"
                  ? t("teams") || "Teams"
                  : t("matches") || "Matches"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-slate-300 capitalize">
                {tab === "players" ? t("players") : tab === "teams" ? t("teams") : t("matches")}
              </p>
              <p className="text-[10px] text-slate-500">
                {totalResults} {t("results") || "results"}
              </p>
            </div>
            <div className="space-y-2">
              {loading ? (
                <p className="text-[11px] text-slate-500">{t("loading")}</p>
              ) : tab === "players" ? (
                players.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    {t("noPlayersFound") || "No players found."}
                  </p>
                ) : (
                  players.map((p) => {
                    const inWatchlist = watchlistIds.has(p.id);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
                      >
                        <Link href={`/players/${p.id}`} className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-slate-100 truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {p.position}
                            {p.age != null ? ` • ${p.age} yrs` : ""}
                            {p.team?.name ? ` • ${p.team.name}` : p.club ? ` • ${p.club}` : ""}
                          </p>
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleWatchlist(p.id)}
                          disabled={togglingPlayerId === p.id}
                          className={`ml-2 rounded-full border px-2 py-1 text-[10px] transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            inWatchlist
                              ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                              : "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                          }`}
                        >
                          {togglingPlayerId === p.id
                            ? "..."
                            : inWatchlist
                            ? t("inWatchlist") || "Saved"
                            : t("favourite") || "Favourite"}
                        </button>
                      </div>
                    );
                  })
                )
              ) : tab === "teams" ? (
                teams.length === 0 ? (
                  <p className="text-[11px] text-slate-500">{t("noTeamsFound") || "No teams found."}</p>
                ) : (
                  teams.map((tm) => (
                    <Link
                      key={tm.id}
                      href={`/teams/${tm.id}`}
                      className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 hover:bg-slate-900"
                    >
                      <div>
                        <p className="text-[11px] font-medium text-slate-100">{tm.name}</p>
                        {tm.league && <p className="text-[10px] text-slate-500">{tm.league}</p>}
                      </div>
                    </Link>
                  ))
                )
              ) : matches.length === 0 ? (
                <p className="text-[11px] text-slate-500">{t("noMatchesFound") || "No matches found."}</p>
              ) : (
                matches.map((m) => (
                  <Link
                    key={m.id}
                    href={`/matches/${m.slug}`}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 hover:bg-slate-900"
                  >
                    <div>
                      <p className="text-[11px] font-medium text-slate-100">
                        {m.homeTeamName || "Home"} {t("vs") || "vs"} {m.awayTeamName || "Away"}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {m.competition} · {new Date(m.date).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-[11px] text-slate-300">
            <p className="font-medium">{t("filters") || "Filters"}</p>
            <div className="space-y-2">
              {tab === "players" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-slate-400">{t("position") || "Position"}</label>
                    <select
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                    >
                      <option value="">{t("all") || "All"}</option>
                      <option value="GK">GK</option>
                      <option value="DF">DF</option>
                      <option value="MF">MF</option>
                      <option value="FW">FW</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-400">{t("ageRange") || "Age range"}</label>
                    <select
                      value={ageRange}
                      onChange={(e) => setAgeRange(e.target.value)}
                      className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                    >
                      <option value="">{t("all") || "All"}</option>
                      <option value="u19">Under 19</option>
                      <option value="19-24">19 - 24</option>
                      <option value="25-30">25 - 30</option>
                      <option value="30+">30+</option>
                    </select>
                  </div>
                </>
              )}
              {tab === "matches" && (
                <div className="space-y-1.5">
                  <label className="text-slate-400">{t("competition") || "Competition"}</label>
                  <input
                    type="text"
                    value={competition}
                    onChange={(e) => setCompetition(e.target.value)}
                    placeholder={t("anyCompetition") || "Any competition"}
                    className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                  />
                </div>
              )}
              {tab === "teams" && (
                <p className="text-[10px] text-slate-500">
                  {t("teamsScopedToMyTeams") || "Showing teams from your scope only."}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
