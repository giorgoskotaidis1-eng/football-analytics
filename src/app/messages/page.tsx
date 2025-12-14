"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ThreadSummary {
  id: number;
  subject: string;
  lastMessagePreview: string;
  updatedAt: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("fa_user");
    if (!stored) {
      router.replace("/auth/login");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/messages");
        const data = (await res.json().catch(() => ({}))) as { threads?: ThreadSummary[] };
        if (res.ok && data.threads) {
          setThreads(data.threads);
        }
      } catch {
        // ignore for skeleton
      }
    })();
  }, [router]);

  return (
    <div className="space-y-5 text-xs text-slate-200">
      <header className="flex items-center justify-between rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 px-4 py-3">
        <div className="space-y-0.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Collaboration</p>
          <h1 className="text-lg font-semibold tracking-tight text-slate-50">Staff messages</h1>
          <p className="text-[11px] text-slate-500">
            Centralise tactical discussions between head coach, analysts and scouts in one place.
          </p>
        </div>
        <div className="hidden gap-2 text-[10px] text-slate-400 md:flex">
          <div className="flex items-center gap-1 rounded-full bg-slate-900/80 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Online staff</span>
          </div>
        </div>
      </header>

      <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
        <div className="mb-3 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-200">Threads</span>
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400">
              {threads.length} active
            </span>
          </div>
          <div className="flex gap-2">
            <button className="hidden h-7 items-center rounded-md border border-slate-700 bg-slate-900 px-3 text-[10px] text-slate-200 hover:bg-slate-800 md:inline-flex">
              New tactical thread
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {threads.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-slate-700 bg-slate-950 p-4 text-[10px] text-slate-500">
              No threads yet. Use this area to coordinate match plans, scouting reports and training feedback between
              staff.
            </div>
          )}

          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => router.push(`/messages/${t.id}`)}
              className="flex flex-col items-start justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-3 text-left text-[11px] text-slate-200 hover:border-emerald-500/60 hover:bg-slate-900/80"
            >
              <div className="space-y-0.5">
                <p className="font-medium text-slate-50">{t.subject}</p>
                <p className="text-[10px] text-slate-500 line-clamp-2">{t.lastMessagePreview}</p>
              </div>
              <div className="flex w-full items-center justify-between text-[10px] text-slate-500">
                <span>Updated {new Date(t.updatedAt).toLocaleDateString()}</span>
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[9px]">
                  Staff chat
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
