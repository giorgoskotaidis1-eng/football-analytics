"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [player, setPlayer] = useState<{ name: string; team: { name: string } | null } | null>(null);

  useEffect(() => {
    // Extract player ID from pathname
    const match = pathname.match(/\/players\/(\d+)\//);
    if (match) {
      const playerId = match[1];
      fetch(`/api/player/${playerId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.player) {
            setPlayer(data.player);
          }
        })
        .catch(() => {
          // ignore
        });
    }
  }, [pathname]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/auth/login");
      router.refresh();
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c1f2f] via-[#0f1923] to-[#0c1f2f]">
      {/* Custom Player Header - Minimal & Professional */}
      <header className="border-b border-[#1a2f3f]/50 bg-gradient-to-r from-[#0c1f2f]/95 via-[#0f1923]/95 to-[#0c1f2f]/95 backdrop-blur-md sticky top-0 z-50 shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/25 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent">{player?.name || "Player Dashboard"}</h1>
                {player?.team && (
                  <p className="text-xs text-white/60 font-medium">{player.team.name}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="group flex items-center gap-2 rounded-xl border border-[#1a2f3f] bg-gradient-to-r from-[#142f43]/60 to-[#1a3f53]/60 px-4 py-2.5 text-sm text-white/90 transition-all hover:from-[#1a3f53] hover:to-[#1f4f63] hover:text-white hover:border-[#2a4f5f] hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Player Content - No sidebar, full width */}
      <main className="min-h-[calc(100vh-80px)]">
        {children}
      </main>
    </div>
  );
}

