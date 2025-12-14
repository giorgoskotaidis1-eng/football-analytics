import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { LanguageToggle } from "./components/LanguageToggle";
import { ThemeToggle } from "./components/ThemeToggle";
import { HeaderUserArea } from "./components/HeaderUserArea";
import { SidebarUserProfile } from "./components/SidebarUserProfile";
import { PWARegister } from "./components/PWARegister";
import { SidebarNav } from "./components/SidebarNav";
import { SidebarLogo } from "./components/SidebarLogo";
import { SidebarUpgradeCard } from "./components/SidebarUpgradeCard";
import { HeaderSearch } from "./components/HeaderSearch";

export const metadata: Metadata = {
  title: "Football Analytics Dashboard",
  description: "Professional full-stack football analytics platform for coaches, scouts and analysts.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Football Analytics",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="antialiased bg-bg text-text">
        <ThemeProvider>
          <I18nProvider>
            <PWARegister />
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
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
