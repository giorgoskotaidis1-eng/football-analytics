"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

type User = {
  email?: string;
  name?: string;
  role?: string;
};

export function HeaderUserArea() {
  const { t } = useTranslation();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/account/me");
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            setUser(data.user);
          }
        } else if (res.status === 401) {
          // Not logged in - this is normal, don't log as error
          setUser(null);
        }
      } catch {
        // ignore network errors
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/auth/login");
      router.refresh();
    } catch {
      // ignore errors
    }
  }

  const displayName = user?.name || user?.email || t("guest");
  const displayRole = user?.role || (user ? t("headAnalyst") : t("notSignedIn"));

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="relative flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs text-slate-700 transition hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-emerald-500 px-[3px] text-[9px] font-semibold text-slate-950 ring-1 ring-emerald-400">
            3
          </span>
          ●
        </button>
        {open && (
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 text-[11px] text-slate-800 shadow-xl dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-200">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">{t("notifications")}</p>
            <ul className="space-y-2">
              <li className="rounded-md bg-slate-50 p-2 dark:bg-slate-900/80">
                <p className="text-[11px] text-slate-900 dark:text-slate-50">{t("welcomeToFootballAnalytics")}</p>
                <p className="text-[10px] text-slate-600 dark:text-slate-500">{t("startByAddingTeamsAndPlayers")}</p>
              </li>
            </ul>
          </div>
        )}
      </div>

      {!loading && user ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-xs hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-sky-500 text-[11px] font-semibold text-slate-950">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden flex-col text-left sm:flex">
              <span className="text-[11px] font-medium truncate max-w-[120px]">{displayName}</span>
              <div className="flex items-center gap-1 truncate max-w-[140px]">
                <span className="text-[10px] text-slate-500 truncate">{displayRole}</span>
              </div>
            </div>
          </button>
          {open && (
            <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 text-[11px] text-slate-800 shadow-xl dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-200">
              <Link
                href="/settings"
                className="block rounded-md px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-900"
                onClick={() => setOpen(false)}
              >
                {t("settings")}
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setOpen(false);
                }}
                className="w-full rounded-md px-2 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                {t("logout")}
              </button>
            </div>
          )}
        </div>
      ) : !loading ? (
        <Link
          href="/auth/login"
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-xs hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            ?
          </div>
          <div className="hidden flex-col text-left sm:flex">
            <span className="text-[11px] font-medium text-slate-900 dark:text-slate-100">{t("guest")}</span>
            <span className="text-[10px] text-slate-600 dark:text-slate-500">{t("signIn")}</span>
          </div>
        </Link>
      ) : null}
    </div>
  );
}