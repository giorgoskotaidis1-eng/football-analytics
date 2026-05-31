"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import Link from "next/link";

type Team = {
  id: number;
  name: string;
  league: string | null;
  style: string | null;
  _count: {
    players: number;
    homeGames: number;
    awayGames: number;
  };
};

export default function TeamDetailsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const teamId = params?.id ? parseInt(params.id as string) : null;
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId || isNaN(teamId)) {
      setError("Invalid team ID");
      setLoading(false);
      return;
    }

    async function fetchTeam() {
      try {
        const res = await fetch(`/api/teams/${teamId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.team) {
            setTeam(data.team);
          } else {
            setError("Team not found");
          }
        } else if (res.status === 403) {
          setError("You don't have access to this team");
        } else {
          setError("Failed to load team");
        }
      } catch (err) {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }

    fetchTeam();
  }, [teamId]);

  if (loading) {
    return (
      <div className="space-y-6 text-xs text-slate-200">
        <div className="h-96 animate-pulse rounded-xl bg-slate-900" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="space-y-6 text-xs text-slate-200">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-2">{t("error")}</h2>
          <p className="text-sm text-red-300">{error || t("teamNotFound")}</p>
          <Link
            href="/teams"
            className="mt-4 inline-block rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
          >
            {t("backToTeams")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/teams"
            className="text-sm text-slate-400 hover:text-slate-200 mb-2 inline-block"
          >
            ← {t("backToTeams")}
          </Link>
          <h1 className="text-2xl font-bold text-slate-50">{team.name}</h1>
          {team.league && (
            <p className="text-sm text-slate-400 mt-1">{team.league}</p>
          )}
        </div>
        <Link
          href="/admin/staff"
          className="rounded-lg border border-emerald-500/30 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 px-4 py-2 text-sm font-semibold text-emerald-200 transition-all hover:from-emerald-500/30 hover:to-emerald-600/30 hover:border-emerald-500/50"
        >
{t("inviteStaff")}
        </Link>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800/50 bg-slate-900/50 p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">{t("players")}</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{team._count.players}</p>
        </div>
        <div className="rounded-xl border border-slate-800/50 bg-slate-900/50 p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">{t("matches")}</p>
          <p className="text-2xl font-bold text-sky-400 mt-1">{team._count.homeGames + team._count.awayGames}</p>
        </div>
        <div className="rounded-xl border border-slate-800/50 bg-slate-900/50 p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">{t("style")}</p>
          <p className="text-sm font-semibold text-slate-200 mt-1">{team.style || t("notSet")}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-slate-800/50 bg-slate-900/50 p-6">
        <h2 className="text-sm font-semibold text-white mb-4">{t("quickActions")}</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`/teams?teamId=${team.id}`}
            className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors text-center"
          >
{t("managePlayers")}
          </Link>
          <Link
            href="/admin/staff"
            className="rounded-lg border border-emerald-500/30 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 px-4 py-3 text-sm font-semibold text-emerald-200 transition-all hover:from-emerald-500/30 hover:to-emerald-600/30 text-center"
          >
  {t("inviteStaff")}
          </Link>
        </div>
      </div>
    </div>
  );
}
