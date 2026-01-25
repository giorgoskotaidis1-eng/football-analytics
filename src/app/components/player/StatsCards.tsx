"use client";

import { useTranslation } from "@/lib/i18n";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  progress?: number; // 0-100 for progress bar
}

function StatCard({ label, value, icon, color, progress }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[#1a2f3f]/50 bg-gradient-to-br from-[#0c1f2f] via-[#0f1923] to-[#0c1f2f] p-6 transition-all hover:border-[#2a4f5f]/70 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:scale-[1.02]">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#1a2f3f]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `linear-gradient(135deg, ${color}08 0%, transparent 60%)`,
        }}
      />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div 
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/25 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]" 
            style={{ 
              color,
            }}
          >
            {icon}
          </div>
          <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">{label}</span>
        </div>
        <div className="space-y-3">
          <p className="text-3xl font-bold bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent transition-all group-hover:scale-105" style={{ 
            backgroundImage: `linear-gradient(135deg, ${color}, ${color}dd)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {value}
          </p>
          {progress !== undefined && (
            <div className="space-y-1.5">
              <div className="h-2 w-full rounded-full bg-[#1a1f2e] overflow-hidden border border-[#1a1f2e]/50">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                  style={{ 
                    width: `${Math.min(100, Math.max(0, progress))}%`,
                    background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                    boxShadow: `0 0 10px ${color}40`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </div>
              </div>
              <div className="text-[9px] font-medium text-white/40 text-right">
                {progress.toFixed(0)}%
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PlayerStats {
  goals: number;
  assists: number;
  xGTotal: number;
  shotsTotal: number;
  shotsOnTarget: number;
  passesCompleted: number;
  tacklesMade: number;
}

interface StatsCardsProps {
  stats: PlayerStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const { t } = useTranslation();

  // Calculate max values for progress bars
  const maxGoals = Math.max(stats.goals, 10);
  const maxAssists = Math.max(stats.assists, 10);
  const maxXG = Math.max(stats.xGTotal, 5);
  const maxShots = Math.max(stats.shotsTotal, 20);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label={t("goals") || "Goals"}
        value={stats.goals}
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        }
        color="#FFD700"
        progress={(stats.goals / maxGoals) * 100}
      />
      <StatCard
        label={t("assists") || "Assists"}
        value={stats.assists}
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
        color="#3b82f6"
        progress={(stats.assists / maxAssists) * 100}
      />
      <StatCard
        label="xG"
        value={stats.xGTotal.toFixed(2)}
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }
        color="#10b981"
        progress={(stats.xGTotal / maxXG) * 100}
      />
      <StatCard
        label={t("totalShots") || "Shots"}
        value={stats.shotsTotal}
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
        color="#ef4444"
        progress={(stats.shotsTotal / maxShots) * 100}
      />
      <StatCard
        label="On Target"
        value={stats.shotsOnTarget}
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        color="#f59e0b"
        progress={stats.shotsTotal > 0 ? (stats.shotsOnTarget / stats.shotsTotal) * 100 : 0}
      />
      <StatCard
        label="Passes"
        value={stats.passesCompleted}
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        }
        color="#8b5cf6"
        progress={Math.min(100, (stats.passesCompleted / 100) * 100)}
      />
      <StatCard
        label="Tackles"
        value={stats.tacklesMade}
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        }
        color="#06b6d4"
        progress={Math.min(100, (stats.tacklesMade / 20) * 100)}
      />
      <StatCard
        label="Conversion"
        value={stats.shotsTotal > 0 ? `${((stats.goals / stats.shotsTotal) * 100).toFixed(1)}%` : "0%"}
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        }
        color="#ec4899"
        progress={stats.shotsTotal > 0 ? (stats.goals / stats.shotsTotal) * 100 : 0}
      />
    </div>
  );
}

