"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export function SidebarUpgradeCard() {
  const { t } = useTranslation();
  
  return (
    <div className="mt-6 space-y-3 rounded-lg border border-[#1a1f2e] bg-[#141827] p-3 text-xs shadow-sm transition-colors">
      <div>
        <p className="mb-1 font-medium text-white">{t("eliteAnalyst")}</p>
        <p className="mb-2 text-[11px] text-white/70">
          {t("eliteAnalystDescription")}
        </p>
        <Link
          href="/billing"
          className="block w-full rounded-md bg-[#1a1f2e] px-3 py-1.5 text-center text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#1f2535]"
        >
          {t("upgradeToPro")}
        </Link>
      </div>
    </div>
  );
}

