"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, rememberMe }),
        });

        // Check if response is JSON
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          console.error("[login] Non-JSON response:", text.substring(0, 200));
          setError(`Server error (${res.status}). Please check the console.`);
          return;
        }

        let data;
        try {
          data = (await res.json()) as { ok?: boolean; message?: string; user?: unknown };
        } catch (parseError) {
          console.error("[login] Failed to parse response:", parseError);
          setError("Server error. Please try again.");
          return;
        }

        if (!res.ok || !data.ok) {
          setError(data.message || "Login failed");
          return;
        }

        setMessage("Login successful – welcome back!");

        // Fire-and-forget mock welcome email
        try {
          await fetch("/api/notifications/welcome", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
        } catch {
          // ignore email errors in mock environment
        }

        // Redirect to home and force full page reload to update UI
        window.location.href = "/";
      } catch (error) {
        console.error("[login] Network error:", error);
        setError(`Network error: ${error instanceof Error ? error.message : "Please try again."}`);
      }
    });
  }

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-xs text-slate-200 shadow-xl">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-400">Account access</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-50">Sign in to your club space</h1>
        <p className="mt-2 text-[11px] text-slate-400">
          Use your work email to access dashboards, reports and match video.
        </p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-slate-300">Email</label>
          <input
            type="email"
            className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            placeholder="coach@club.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-slate-300">Password</label>
          <input
            type="password"
            className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <label className="flex items-center gap-1.5 text-slate-400">
            <input
              type="checkbox"
              checked={rememberMe ?? false}
              onChange={(e) => setRememberMe(!!e.target.checked)}
              className="h-3 w-3 rounded border-slate-700 bg-slate-900"
            />
            Remember me
          </label>
          <a href="/auth/forgot" className="text-emerald-400 hover:text-emerald-300">
            Forgot password?
          </a>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="flex h-8 w-full items-center justify-center rounded-md bg-emerald-500 text-[11px] font-semibold text-slate-950 shadow-md transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>
      {message && <p className="text-[11px] text-emerald-400">{message}</p>}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      <p className="text-[11px] text-slate-500">
        No account yet?{' '}
        <a href="/auth/register" className="text-emerald-400 hover:text-emerald-300">
          Create club workspace
        </a>
      </p>
    </div>
  );
}
