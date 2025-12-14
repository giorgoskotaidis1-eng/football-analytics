"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

export function SidebarStats() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ teams: 0, players: 0, matches: 0 });
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  const fetchStats = useCallback(async () => {
    try {
      // Add cache busting to ensure fresh data
      const timestamp = Date.now();
      const [teamsRes, playersRes, matchesRes] = await Promise.all([
        fetch(`/api/teams?t=${timestamp}`),
        fetch(`/api/players?page=1&limit=1&t=${timestamp}`), // Only need total count, so limit=1 is enough
        fetch(`/api/matches?t=${timestamp}`),
      ]);

      if (teamsRes.ok) {
        const data = await teamsRes.json();
        if (data.ok) setStats((s) => ({ ...s, teams: data.teams.length }));
      }
      if (playersRes.ok) {
        const data = await playersRes.json();
        if (data.ok) {
          // Use pagination total if available, otherwise use players array length
          const playersCount = data.pagination?.total || data.players?.length || 0;
          setStats((s) => ({ ...s, players: playersCount }));
        }
      }
      if (matchesRes.ok) {
        const data = await matchesRes.json();
        if (data.ok) setStats((s) => ({ ...s, matches: data.matches.length }));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchStats();

    // Refresh every 30 seconds (instead of 5) - only if tab is visible
    const interval = setInterval(() => {
      // Only refresh if tab is visible (not hidden)
      if (!document.hidden) {
        fetchStats();
      }
    }, 30000); // 30 seconds instead of 5

    // Refresh when window gains focus (user comes back to tab)
    const handleFocus = () => {
      fetchStats();
    };
    window.addEventListener("focus", handleFocus);

    // Refresh when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchStats();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchStats]);

  // Refresh when pathname changes (user navigates to different page)
  useEffect(() => {
    fetchStats();
  }, [pathname, fetchStats]);

  return (
    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800/50">
      <div className="text-center">
        <p className="text-2xl font-bold bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent">{stats.teams}</p>
        <p className="text-[10px] text-slate-400 mt-1 font-medium uppercase tracking-wider">{t("teams")}</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent">{stats.players}</p>
        <p className="text-[10px] text-slate-400 mt-1 font-medium uppercase tracking-wider">{t("players")}</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent">{stats.matches}</p>
        <p className="text-[10px] text-slate-400 mt-1 font-medium uppercase tracking-wider">{t("matches")}</p>
      </div>
    </div>
  );
}
