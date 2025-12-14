"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [club, setClub] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, club, email, password }),
        });

        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          setError(data.message || "Registration failed");
          return;
        }

        setMessage("Account created successfully. Redirecting...");
        setTimeout(() => {
          router.push("/?welcome=1");
          router.refresh();
        }, 1000);
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-xs text-slate-200 shadow-xl">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-400">Create workspace</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-50">Set up your club analytics hub</h1>
        <p className="mt-2 text-[11px] text-slate-400">
          Add basic information so we can tailor the platform to your squad and competition level.
        </p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-slate-300">Full name</label>
          <input
            type="text"
            className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            placeholder="Head coach / Analyst name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-slate-300">Club / Team</label>
          <input
            type="text"
            className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            placeholder="Your club name"
            value={club}
            onChange={(e) => setClub(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-slate-300">Email</label>
          <input
            type="email"
            className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            placeholder="you@club.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-slate-300">Password</label>
          <input
            type="password"
            className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            placeholder="Create a secure password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="flex h-8 w-full items-center justify-center rounded-md bg-emerald-500 text-[11px] font-semibold text-slate-950 shadow-md transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Creating workspace..." : "Create workspace"}
        </button>
      </form>
      {message && <p className="text-[11px] text-emerald-400">{message}</p>}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      <p className="text-[11px] text-slate-500">
        Already using Football Analytics?{' '}
        <a href="/auth/login" className="text-emerald-400 hover:text-emerald-300">
          Sign in instead
        </a>
      </p>
    </div>
  );
}
