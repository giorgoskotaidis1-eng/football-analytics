"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns";

type Match = {
  id: number;
  slug: string;
  competition: string;
  date: string;
  homeTeam: { name: string } | null;
  awayTeam: { name: string } | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  scoreHome: number | null;
  scoreAway: number | null;
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to safely get team name
  function getTeamName(team: { name: string } | null | undefined, teamName: string | null | undefined): string {
    if (team?.name) return team.name;
    if (teamName) return teamName;
    return "Unknown";
  }

  useEffect(() => {
    async function fetchMatches() {
      try {
        const res = await fetch("/api/matches");
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.matches)) {
            // Ensure all matches have safe team data
            const safeMatches = data.matches.map((match: any) => ({
              ...match,
              homeTeam: match.homeTeam || null,
              awayTeam: match.awayTeam || null,
              homeTeamName: match.homeTeamName || null,
              awayTeamName: match.awayTeamName || null,
            }));
            setMatches(safeMatches);
          }
        }
      } catch {
        // ignore errors
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getMatchesForDay = (day: Date) => {
    return matches.filter((match) => {
      const matchDate = new Date(match.date);
      return isSameDay(matchDate, day);
    });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="space-y-5 text-xs text-slate-200">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-400 hover:text-slate-200 transition">
            ←
          </Link>
          <h1 className="text-xl font-semibold text-white">Match Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="h-8 rounded-md border border-slate-700 bg-slate-900 px-3 text-[11px] text-slate-200 hover:bg-slate-800"
          >
            Today
          </button>
        </div>
      </header>

      <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={goToPreviousMonth}
            className="h-8 w-8 rounded-md border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            ←
          </button>
          <h2 className="text-base font-semibold text-white">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <button
            onClick={goToNextMonth}
            className="h-8 w-8 rounded-md border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            →
          </button>
        </div>

        {loading ? (
          <p className="text-center text-slate-400 py-8">Loading calendar...</p>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="p-2 text-center text-[10px] font-medium text-slate-400">
                {day}
              </div>
            ))}
            {days.map((day) => {
              const dayMatches = getMatchesForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDate = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-24 rounded-lg border p-2 ${
                    isCurrentMonth
                      ? "border-slate-800 bg-slate-900/50"
                      : "border-slate-900 bg-slate-950/30"
                  } ${isTodayDate ? "ring-2 ring-emerald-500/50" : ""}`}
                >
                  <div
                    className={`text-[11px] font-medium ${
                      isCurrentMonth ? "text-slate-300" : "text-slate-600"
                    } ${isTodayDate ? "text-emerald-400" : ""}`}
                  >
                    {format(day, "d")}
                  </div>
                  <div className="mt-1 space-y-1">
                    {dayMatches.slice(0, 2).map((match) => (
                      <Link
                        key={match.id}
                        href={`/matches/${match.slug}`}
                        className="block rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] text-emerald-300 hover:bg-emerald-500/30"
                      >
                        {getTeamName(match.homeTeam, match.homeTeamName)} vs {getTeamName(match.awayTeam, match.awayTeamName)}
                      </Link>
                    ))}
                    {dayMatches.length > 2 && (
                      <div className="text-[9px] text-slate-500">
                        +{dayMatches.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

