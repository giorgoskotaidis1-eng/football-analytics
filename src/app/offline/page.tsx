"use client";

import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
        <div className="mb-4 text-6xl">📡</div>
        <h1 className="mb-2 text-2xl font-semibold text-white">You're Offline</h1>
        <p className="mb-6 text-slate-400">
          This page is not available offline. Check out the demo version instead!
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/demo"
            className="inline-block rounded-md bg-emerald-500 px-6 py-2 font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            View Demo
          </Link>
          <Link
            href="/"
            className="inline-block rounded-md border border-slate-700 bg-slate-800 px-6 py-2 font-semibold text-slate-200 transition hover:bg-slate-700"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}


