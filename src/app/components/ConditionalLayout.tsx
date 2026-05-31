"use client";

import { usePathname } from "next/navigation";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";
import { HeaderUserArea } from "./HeaderUserArea";
import { SidebarUserProfile } from "./SidebarUserProfile";
import { SidebarNav } from "./SidebarNav";
import { SidebarLogo } from "./SidebarLogo";
import { SidebarUpgradeCard } from "./SidebarUpgradeCard";
import { HeaderSearch } from "./HeaderSearch";

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPlayerDashboard = pathname?.startsWith("/players/") && pathname?.includes("/dashboard");

  // If player dashboard, render without sidebar/header (custom layout in player/[id]/layout.tsx)
  if (isPlayerDashboard) {
    return <>{children}</>;
  }

  // Otherwise, render normal layout with sidebar/header
  return (
    <div className="min-h-screen flex bg-bg text-text">
      <aside className="hidden w-72 border-r border-border bg-bg shadow-sm px-4 py-6 md:flex md:flex-col">
        {/* Logo */}
        <SidebarLogo />

        {/* User Profile Section */}
        <SidebarUserProfile />

        <SidebarNav />

        <SidebarUpgradeCard />
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-bg shadow-sm px-4 py-3 sm:px-6">
          <div className="flex flex-1 items-center gap-3">
            <HeaderSearch />
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageToggle />
            <HeaderUserArea />
          </div>
        </header>

        <main className="flex-1 bg-bg px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}






