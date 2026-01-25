"use client";

interface PlayerHeaderProps {
  player: {
    id: number;
    name: string;
    position: string;
    age: number | null;
    number: number | null;
    team: { id: number; name: string } | null;
    avatarUrl: string | null;
  };
  stats: {
    goals: number;
    assists: number;
    xGTotal: number;
    shotsTotal: number;
    shotsOnTarget: number;
    passesCompleted: number;
    tacklesMade: number;
  };
}

export function PlayerHeader({ player, stats }: PlayerHeaderProps) {
  const conversionRate = stats.shotsTotal > 0 
    ? ((stats.goals / stats.shotsTotal) * 100).toFixed(1) 
    : "0.0";

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[#1a2f3f]/50 bg-gradient-to-br from-[#0c1f2f] via-[#0f1923] to-[#0c1f2f] shadow-2xl transition-all hover:border-[#2a4f5f]/50 hover:shadow-[0_0_40px_rgba(16,185,129,0.15)]">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0 animate-pulse" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Gradient Overlay with Animation */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-500/5 to-transparent" />

      <div className="relative p-8 md:p-10">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
          {/* Avatar */}
          <div className="relative">
            <div className="relative h-24 w-24 md:h-32 md:w-32 rounded-2xl bg-gradient-to-br from-emerald-500/30 via-teal-500/20 to-emerald-500/30 border-2 border-emerald-500/40 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all group-hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] group-hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              {player.avatarUrl ? (
                <img src={player.avatarUrl} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  {player.number || player.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {player.number && (
              <div className="absolute -bottom-2 -right-2 h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-500 border-3 border-[#0c1f2f] flex items-center justify-center text-sm font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-pulse">
                {player.number}
              </div>
            )}
          </div>

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{player.name}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{player.position}</span>
                  </div>
                  {player.team && (
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span>{player.team.name}</span>
                    </div>
                  )}
                  {player.age && (
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{player.age} years</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="group/stat relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-emerald-500/10 to-emerald-500/15 p-5 backdrop-blur-sm transition-all hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="text-[10px] font-semibold text-emerald-400/90 uppercase tracking-wider mb-2 flex items-center gap-2">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Goals
              </div>
              <div className="text-3xl font-bold bg-gradient-to-br from-white to-emerald-200 bg-clip-text text-transparent">{stats.goals}</div>
            </div>
          </div>
          <div className="group/stat relative overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/15 via-blue-500/10 to-blue-500/15 p-5 backdrop-blur-sm transition-all hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="text-[10px] font-semibold text-blue-400/90 uppercase tracking-wider mb-2 flex items-center gap-2">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Assists
              </div>
              <div className="text-3xl font-bold bg-gradient-to-br from-white to-blue-200 bg-clip-text text-transparent">{stats.assists}</div>
            </div>
          </div>
          <div className="group/stat relative overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/15 via-purple-500/10 to-purple-500/15 p-5 backdrop-blur-sm transition-all hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="text-[10px] font-semibold text-purple-400/90 uppercase tracking-wider mb-2 flex items-center gap-2">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                xG
              </div>
              <div className="text-3xl font-bold bg-gradient-to-br from-white to-purple-200 bg-clip-text text-transparent">{stats.xGTotal.toFixed(2)}</div>
            </div>
          </div>
          <div className="group/stat relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-amber-500/10 to-amber-500/15 p-5 backdrop-blur-sm transition-all hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="text-[10px] font-semibold text-amber-400/90 uppercase tracking-wider mb-2 flex items-center gap-2">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Conversion
              </div>
              <div className="text-3xl font-bold bg-gradient-to-br from-white to-amber-200 bg-clip-text text-transparent">{conversionRate}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

