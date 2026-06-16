"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState, useTransition } from "react";
import { AUTH0_LOGIN_PATH, SSO_COMPLETE_PATH } from "@/lib/auth0-routes";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-1.4 3.6-5.5 3.6-3.3 0-6.1-2.8-6.1-6.2s2.8-6.2 6.1-6.2c1.9 0 3.1.8 3.9 1.5l2.7-2.6C16.9 2.5 14.7 1.5 12 1.5 6.7 1.5 2.4 5.9 2.4 11.4S6.7 21.3 12 21.3c6.9 0 9.1-4.9 9.1-7.4 0-.5-.1-.9-.1-1.3H12z" />
      <path fill="#34A853" d="M2.4 11.4c0 1.8.6 3.4 1.5 4.8l3.7-2.8c-.2-.6-.3-1.2-.3-2s.1-1.4.3-2L3.9 6.6c-.9 1.4-1.5 3-1.5 4.8z" />
      <path fill="#FBBC05" d="M12 21.3c2.7 0 4.9-.9 6.5-2.5l-3.2-2.5c-.9.6-2 1-3.3 1-2.6 0-4.8-1.8-5.6-4.2l-3.8 2.9c1.6 3 4.8 5.3 9.4 5.3z" />
      <path fill="#4285F4" d="M21.1 12.6c0-.7-.1-1.2-.2-1.8H12v3.9h5.1c-.2 1.1-.8 2-1.8 2.7l3.2 2.5c1.9-1.8 2.6-4.5 2.6-7.3z" />
    </svg>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isPending, startTransition] = useTransition();
  const authError = searchParams.get("error");

  const googleLoginHref = useMemo(() => {
    const params = new URLSearchParams({
      connection: "google-oauth2",
      returnTo: SSO_COMPLETE_PATH,
    });
    return `${AUTH0_LOGIN_PATH}?${params.toString()}`;
  }, []);

  const googleSignupHref = useMemo(() => {
    const params = new URLSearchParams({
      connection: "google-oauth2",
      screen_hint: "signup",
      returnTo: SSO_COMPLETE_PATH,
    });
    return `${AUTH0_LOGIN_PATH}?${params.toString()}`;
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/account/me");
        if (!res.ok) {
          setCheckingAuth(false);
          return;
        }
        const data = (await res.json()) as { ok?: boolean; user?: { role?: string; id?: number } };
        if (!data.ok || !data.user) {
          setCheckingAuth(false);
          return;
        }
        if (data.user.role === "Player" && data.user.id) {
          router.replace(`/players/${data.user.id}/dashboard`);
          return;
        }
        router.replace("/");
      } catch {
        setCheckingAuth(false);
      }
    }
    checkAuth();
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-xs text-slate-300 shadow-xl">
        Checking your session...
      </div>
    );
  }

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
          data = (await res.json()) as { 
            ok?: boolean; 
            message?: string; 
            user?: { 
              id: number; 
              role?: string | null;
              email?: string;
            } 
          };
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

        // Fire-and-forget mock welcome email (only for regular users)
        if (data.user?.role !== "Player") {
          try {
            await fetch("/api/notifications/welcome", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            });
          } catch {
            // ignore email errors in mock environment
          }
        }

        // Redirect based on user role
        if (data.user?.role === "Player" && data.user?.id) {
          // Redirect to player dashboard
          setTimeout(() => {
            window.location.href = `/players/${data.user.id}/dashboard`;
          }, 500);
        } else {
          // Redirect to home for regular users
          window.location.href = "/";
        }
      } catch (error) {
        console.error("[login] Network error:", error);
        setError(`Network error: ${error instanceof Error ? error.message : "Please try again."}`);
      }
    });
  }

  return (
    <div className="mx-auto max-w-md space-y-5 rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-xs text-slate-200 shadow-xl">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-400">Account access</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-50">Sign in to your club space</h1>
        <p className="mt-2 text-[11px] text-slate-400">
          Use your work email to access dashboards, reports and match video.
        </p>
      </div>
      <div className="space-y-2">
        <a
          href={googleLoginHref}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-700 bg-white/95 text-[12px] font-semibold text-slate-900 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <GoogleIcon />
          Continue with Google
        </a>
        <a
          href={googleSignupHref}
          className="flex h-9 w-full items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-[11px] font-medium text-slate-100 transition hover:border-emerald-500 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          Sign up with Google
        </a>
      </div>
      <div className="flex items-center gap-3 text-[10px] uppercase tracking-wide text-slate-500">
        <span className="h-px flex-1 bg-slate-800" />
        <span>or continue with email</span>
        <span className="h-px flex-1 bg-slate-800" />
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-[11px] font-medium text-slate-300">Email</label>
          <input
            id="email"
            type="email"
            className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            placeholder="coach@club.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-[11px] font-medium text-slate-300">Password</label>
          <input
            id="password"
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
      {(error || authError) && <p className="text-[11px] text-red-400">{error || authError}</p>}
      <p className="text-[11px] text-slate-500">
        No account yet?{' '}
        <a href="/auth/register" className="text-emerald-400 hover:text-emerald-300">
          Create club workspace
        </a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
