"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { useEffect, useState } from "react";

type User = {
  role?: string;
};

export function SidebarNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/account/me");
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            setUser(data.user);
          }
        }
      } catch {
        // ignore
      }
    }
    fetchUser();
  }, []);

  // Check if user is admin - more flexible role checking
  // Also allow "Scout" to see admin panel for testing (can be removed later)
  const isAdmin = user?.role && (
    user.role.toLowerCase().includes("coach") ||
    user.role.toLowerCase().includes("analyst") ||
    user.role.toLowerCase().includes("admin") ||
    user.role.toLowerCase().includes("scout") || // Temporary: allow scouts for testing
    user.role === "Head coach" ||
    user.role === "Head analyst" ||
    user.role === "Admin" ||
    user.role === "Scout" // Temporary: allow scouts for testing
  );
  
  // Debug: Log admin status
  useEffect(() => {
    if (user) {
      console.log("[SidebarNav] User role:", user.role, "isAdmin:", isAdmin);
    }
  }, [user, isAdmin]);

  const mainNavItems = [
    { href: "/", label: t("dashboard"), icon: "📊" },
    { href: "/teams", label: t("teams"), icon: "👥" },
    { href: "/players", label: t("players"), icon: "⚽" },
    { href: "/matches", label: t("matches"), icon: "🏆" },
    { href: "/statistics", label: t("statistics"), icon: "📈" },
    { href: "/watchlist", label: t("watchlist"), icon: "⭐" },
    { href: "/playlist", label: t("videoLibrary"), icon: "🎬" },
    { href: "/sensevs", label: t("matchComparison"), icon: "🔍" },
    { href: "/files", label: t("files"), icon: "📁" },
  ];

  const adminNavItems = isAdmin ? [
    { href: "/admin/dashboard", label: t("adminDashboard"), icon: "📊", adminOnly: true },
    { href: "/admin/players", label: t("playerActivity"), icon: "👤", adminOnly: true },
    { href: "/admin/player-stats", label: t("managePlayerStats"), icon: "⚽", adminOnly: true },
    { href: "/admin/matches", label: t("matchesAnalysis"), icon: "🏆", adminOnly: true },
    { href: "/admin/settings", label: t("teamSettings"), icon: "⚙️", adminOnly: true },
  ] : [];

  const settingsNavItems = [
    { href: "/settings", label: t("settings"), icon: "⚙️" },
  ];

  const renderNavItem = (item: typeof mainNavItems[0] & { adminOnly?: boolean }) => {
    const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
    
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
          isActive
            ? "bg-card text-text shadow-sm border border-border"
            : "text-text/80 hover:bg-card hover:text-text"
        }`}
      >
        <span className={`text-lg transition-transform ${isActive ? "scale-110" : "group-hover:scale-105"}`}>
          {item.icon}
        </span>
        <span className="flex-1">{item.label}</span>
        {isActive && (
          <div className="h-1.5 w-1.5 rounded-full bg-white/60 animate-pulse" />
        )}
      </Link>
    );
  };

  return (
    <nav className="mb-6 space-y-1">
      <div className="space-y-1">
        {mainNavItems.map(renderNavItem)}
      </div>
      
      {adminNavItems.length > 0 && (
        <>
          <div className="my-4" />
          <div className="px-3 py-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/20 to-transparent" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-text/40 px-2">
                {t("admin")}
              </p>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/20 to-transparent" />
            </div>
          </div>
          <div className="space-y-1">
            {adminNavItems.map(renderNavItem)}
          </div>
        </>
      )}
      
      {settingsNavItems.length > 0 && (
        <>
          <div className="my-4" />
          <div className="space-y-1">
            {settingsNavItems.map(renderNavItem)}
          </div>
        </>
      )}
    </nav>
  );
}
