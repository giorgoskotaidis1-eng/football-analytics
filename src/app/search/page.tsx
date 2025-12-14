"use client";

import { useEffect, useState } from "react";

type Player = {
  name: string;
  position: string;
  age: number;
  club: string;
};

export default function SearchPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/search/players");
        const data = (await res.json()) as { ok?: boolean; players?: Player[] };
        if (!cancelled && data.ok && data.players) {
          setPlayers(data.players);
        }
      } catch {
        // ignore for now, keep empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-5 text-xs text-slate-200">
      <div className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Global search</p>
        <h1 className="text-lg font-semibold tracking-tight text-slate-50">Players, teams & matches</h1>
        <p className="text-[11px] text-slate-500">
          Quickly navigate through your database of players, teams and fixtures. Save key entities as favourites for
          fast access.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
        <input
          className="h-8 flex-1 rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
          placeholder="Search players, teams, matches..."
        />
        <div className="flex flex-wrap gap-2 text-[11px]">
          <button className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-slate-200 hover:bg-slate-800">
            Players
          </button>
          <button className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-slate-400 hover:bg-slate-900">
            Teams
          </button>
          <button className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-slate-400 hover:bg-slate-900">
            Matches
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-slate-300">Players</p>
            <p className="text-[10px] text-slate-500">{players.length} players • filtered</p>
          </div>
          <div className="space-y-2">
            {loading && <p className="text-[11px] text-slate-500">Loading players...</p>}
            {!loading && players.length === 0 && (
              <p className="text-[11px] text-slate-500">No players found.</p>
            )}
            {players.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
              >
                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium text-slate-100">{p.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {p.position} • {p.age} yrs • {p.club}
                  </p>
                </div>
                <button className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-800">
                  Favourite
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-[11px] text-slate-300">
          <p className="font-medium">Filters</p>
          <div className="space-y-2">
            <div className="space-y-1.5">
              <label className="text-slate-400">Position</label>
              <select className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60">
                <option>All</option>
                <option>Goalkeepers</option>
                <option>Defenders</option>
                <option>Midfielders</option>
                <option>Forwards</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-400">Age range</label>
              <select className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60">
                <option>All</option>
                <option>Under 19</option>
                <option>19 - 24</option>
                <option>25 - 30</option>
                <option>30+</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-400">Competition</label>
              <select className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60">
                <option>All</option>
                <option>Domestic league</option>
                <option>Cup</option>
                <option>International</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
