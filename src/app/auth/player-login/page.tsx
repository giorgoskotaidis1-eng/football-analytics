"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PlayerLoginPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to main login page
    router.replace("/auth/login");
  }, [router]);

  return null;
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
        const res = await fetch("/api/auth/player-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          console.error("[player-login] Non-JSON response:", text.substring(0, 200));
          setError(`Server error (${res.status}). Please check the console.`);
          return;
        }

        let data;
        try {
          data = (await res.json()) as { ok?: boolean; message?: string; player?: { id: number } };
        } catch (parseError) {
          console.error("[player-login] Failed to parse response:", parseError);
          setError("Server error. Please try again.");
          return;
        }

        if (!res.ok || !data.ok) {
          setError(data.message || "Login failed");
          return;
        }

        setMessage("Login successful – welcome!");

        // Redirect to player dashboard after a short delay
        if (data.player?.id) {
          setTimeout(() => {
            window.location.href = `/players/${data.player.id}/dashboard`;
          }, 500);
        } else {
          setError("Player ID not found in response");
        }
      } catch (error) {
        console.error("[player-login] Network error:", error);
        setError(`Network error: ${error instanceof Error ? error.message : "Please try again."}`);
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="mx-auto w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-xs text-slate-200 shadow-xl">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-400">Player Access</p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-50">Sign in to your dashboard</h1>
          <p className="mt-2 text-[11px] text-slate-400">
            Access your personal stats, highlights, and performance analytics.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-slate-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              placeholder="player@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-slate-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-[11px] text-red-400">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-[11px] text-emerald-400">
              {message}
            </div>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-semibold text-white transition-all hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

