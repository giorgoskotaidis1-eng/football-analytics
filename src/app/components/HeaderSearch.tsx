"use client";

import { useTranslation } from "@/lib/i18n";

export function HeaderSearch() {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted shadow-sm dark:border-[#1a1f2e] dark:bg-[#0b1220]">
      <span className="text-[11px]">{t("searchPlaceholder")}</span>
    </div>
  );
}

