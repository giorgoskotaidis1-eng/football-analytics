"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

export function SidebarNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = [
    { href: "/", label: t("dashboard"), icon: "📊" },
    { href: "/teams", label: t("teams"), icon: "👥" },
    { href: "/players", label: t("players"), icon: "⚽" },
    { href: "/matches", label: t("matches"), icon: "🏆" },
    { href: "/statistics", label: t("statistics"), icon: "📈" },
    { href: "/watchlist", label: t("watchlist"), icon: "⭐" },
    { href: "/playlist", label: t("videoLibrary"), icon: "🎬" },
    { href: "/sensevs", label: t("matchComparison"), icon: "🔍" },
    { href: "/files", label: t("files"), icon: "📁" },
    { href: "/settings", label: t("settings"), icon: "⚙️" },
  ];

  return (
    <nav className="mb-6 space-y-1">
      <div className="space-y-1">
        {navItems.map((item) => {
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
        })}
      </div>
    </nav>
  );
}
