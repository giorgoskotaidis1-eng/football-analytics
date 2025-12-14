"use client";

import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email) {
      setError("Please enter your work email.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Unable to send reset link.");
        return;
      }

      setSuccess("If an account exists for this email, we have sent reset instructions.");
    } catch (err) {
      setError("Unexpected error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-xs text-slate-200 shadow-xl">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-400">Password reset</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-50">Send reset instructions</h1>
        <p className="mt-2 text-[11px] text-slate-400">
          We&apos;ll email you a secure link to create a new password for your workspace.
        </p>
      </div>

      {error && <p className="rounded-md border border-red-500/60 bg-red-500/10 p-2 text-[11px] text-red-200">{error}</p>}
      {success && (
        <p className="rounded-md border border-emerald-500/60 bg-emerald-500/10 p-2 text-[11px] text-emerald-200">
          {success}
        </p>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-slate-300">Work email</label>
          <input
            type="email"
            className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            placeholder="you@club.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-8 w-full items-center justify-center rounded-md bg-emerald-500 text-[11px] font-semibold text-slate-950 shadow-md transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Sending..." : "Send reset link"}
        </button>
      </form>
      <p className="text-[11px] text-slate-500">
        Remembered your password?{" "}
        <a href="/auth/login" className="text-emerald-400 hover:text-emerald-300">
          Go back to sign in
        </a>
      </p>
    </div>
  );
}
