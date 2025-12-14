"use client";

import { useTranslation } from "@/lib/i18n";

export function LanguageToggle() {
  const { language, setLanguage } = useTranslation();

  return (
    <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-1 py-0.5 text-[10px] text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`flex h-5 w-9 items-center justify-center rounded-full transition ${
          language === "en" ? "bg-emerald-500 text-white" : "text-slate-500 dark:text-slate-400"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage("gr")}
        className={`flex h-5 w-9 items-center justify-center rounded-full transition ${
          language === "gr" ? "bg-emerald-500 text-white" : "text-slate-500 dark:text-slate-400"
        }`}
      >
        GR
      </button>
    </div>
  );
}
