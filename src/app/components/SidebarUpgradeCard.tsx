"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export function SidebarUpgradeCard() {
  const { t } = useTranslation();
  
  return (
    <div className="mt-6 space-y-3 rounded-lg border border-border bg-card p-3 text-xs shadow-sm transition-colors dark:border-[#1a1f2e] dark:bg-[#141827]">
      <div>
        <p className="mb-1 font-medium text-text">{t("eliteAnalyst")}</p>
        <p className="mb-2 text-[11px] text-muted">
          {t("eliteAnalystDescription")}
        </p>
        <Link
          href="/billing"
          className="block w-full rounded-md bg-emerald-600 px-3 py-1.5 text-center text-[11px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 dark:bg-[#1a1f2e] dark:hover:bg-[#1f2535]"
        >
          {t("upgradeToPro")}
        </Link>
      </div>
    </div>
  );
}

