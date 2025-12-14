"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useTranslation } from "@/lib/i18n";

// Lazy load SidebarStats to avoid blocking initial render
const SidebarStats = dynamic(() => import("./SidebarStats").then(m => ({ default: m.SidebarStats })), {
  ssr: false,
});

type User = {
  email?: string;
  name?: string;
  role?: string;
};

export function SidebarUserProfile() {
  const router = useRouter();
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/account/me");
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            setUser(data.user);
          }
        } else if (res.status === 401) {
          // Not logged in - this is normal, don't log as error
          setUser(null);
        }
      } catch {
        // ignore network errors
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/auth/login");
      router.refresh();
    } catch {
      // ignore
    }
  }

  const displayName = user?.name || user?.email?.split("@")[0]?.toUpperCase() || "USER";
  const displayRole = user?.role || t("teamAdmin");

  if (loading) {
    return (
      <div className="mb-6 space-y-3 rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-slate-800/50 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-20 bg-slate-800/50 rounded animate-pulse" />
            <div className="h-3 w-24 bg-slate-800/50 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-4 rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 p-5 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
          <span className="text-xl font-bold text-white">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-white truncate">{displayName.toLowerCase()}</p>
          <p className="text-xs text-slate-400 truncate">{displayRole}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleLogout}
          className="flex-1 rounded-lg border border-slate-800/50 bg-slate-900/50 px-3 py-2.5 text-xs font-medium text-white hover:bg-slate-800/50 hover:border-slate-700 transition-all"
        >
          {t("logout")}
        </button>
        <Link
          href="/settings"
          className="flex-1 rounded-lg border border-slate-800/50 bg-slate-900/50 px-3 py-2.5 text-xs font-medium text-white hover:bg-slate-800/50 hover:border-slate-700 transition-all text-center"
        >
          {t("uploadLogo")}
        </Link>
      </div>
      <SidebarStats />
    </div>
  );
}

