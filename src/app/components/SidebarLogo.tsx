"use client";

import { useTranslation } from "@/lib/i18n";

export function SidebarLogo() {
  const { t } = useTranslation();
  
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 ring-1 ring-emerald-600/30 dark:bg-[#1a1f2e] dark:ring-[#1a1f2e]">
        <span className="text-lg font-bold text-white">FA</span>
      </div>
      <div className="flex flex-col">
        <span className="text-base font-bold tracking-tight text-text">{t("footballAnalytics")}</span>
        <span className="text-[10px] text-muted">{t("performanceIntelligence")}</span>
      </div>
    </div>
  );
}

