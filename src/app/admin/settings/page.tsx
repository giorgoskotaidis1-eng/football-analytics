"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";

type Team = {
  id: number;
  name: string;
  league: string | null;
  style: string | null;
};

export default function AdminSettingsPage() {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeams() {
      try {
        // Add cache busting to ensure fresh data
        const timestamp = Date.now();
        const res = await fetch(`/api/teams?t=${timestamp}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.teams) {
            setTeams(data.teams);
            console.log("[AdminSettings] Loaded teams:", data.teams.length);
          } else {
            console.warn("[AdminSettings] No teams in response:", data);
          }
        } else {
          console.error("[AdminSettings] Failed to fetch teams:", res.status);
        }
      } catch (error) {
        console.error("[AdminSettings] Error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTeams();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 text-xs text-slate-200">
        <div className="h-96 animate-pulse rounded-xl bg-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs text-slate-200">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 shadow-lg">
            <svg className="h-6 w-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Admin</p>
            <h1 className="text-lg font-semibold tracking-tight text-slate-50">{t("teamSettings")}</h1>
            <p className="text-[11px] text-slate-500">
              {t("manageTeamConfig")}
            </p>
          </div>
        </div>
      </div>

      {/* Teams List */}
      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-slate-950/90 via-slate-900/95 to-slate-950/90 overflow-hidden shadow-xl">
        <div className="p-6 border-b border-amber-500/30">
          <h2 className="text-sm font-semibold text-white">{t("yourTeams")}</h2>
          <p className="text-[10px] text-slate-400 mt-1">{t("manageTeamsAndSettings")}</p>
        </div>
        <div className="p-6">
          {teams.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="mt-4 text-sm text-slate-500">{t("noTeamsFound")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="rounded-xl border border-slate-800/50 bg-slate-900/50 p-4 hover:bg-slate-900/70 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white">{team.name}</div>
                      {team.league && (
                        <div className="text-[10px] text-slate-400 mt-1">{team.league}</div>
                      )}
                      {team.style && (
                        <div className="text-[10px] text-slate-500 mt-1">Style: {team.style}</div>
                      )}
                    </div>
                    <a
                      href={`/teams/${team.id}`}
                      className="rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-3 py-1.5 text-[10px] font-semibold text-amber-200 transition-all hover:from-amber-500/30 hover:to-orange-500/30 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/20"
                    >
                      {t("edit")}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

