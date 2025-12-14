"use client";

import { useTranslation } from "@/lib/i18n";

export function HeaderSearch() {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-1 items-center gap-2 rounded-lg border border-[#1a1f2e] bg-[#0b1220] px-3 py-2 text-xs text-white/70 shadow-sm">
      <span className="text-[11px] text-white/60">{t("searchPlaceholder")}</span>
    </div>
  );
}

