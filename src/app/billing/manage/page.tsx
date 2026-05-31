"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SubInfo = {
  plan: string | null;
  status: string;
  renewsAt: string | null;
  provider?: string | null;
};

/**
 * In-app subscription management page. Used both for self-hosted deployments
 * (where Stripe isn't wired up) and as the destination when the billing portal
 * link is clicked for an internal subscription. Lets the user view + cancel
 * their active subscription.
 */
export default function ManageSubscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/billing/subscription");
        if (!res.ok) {
          router.replace("/auth/login");
          return;
        }
        const data = await res.json();
        if (!data?.ok) {
          router.replace("/billing");
          return;
        }
        if (!cancelled) {
          setSub({
            plan: data.plan ?? null,
            status: data.status ?? "none",
            renewsAt: data.renewsAt ?? null,
            provider: data.provider ?? null,
          });
        }
      } catch {
        if (!cancelled) router.replace("/billing");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function cancel() {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/billing/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;
      if (!res.ok || !data?.ok) {
        setMessage(data?.message ?? "Failed to cancel subscription.");
        return;
      }
      setMessage("Subscription canceled.");
      setSub((prev) => (prev ? { ...prev, status: "canceled" } : prev));
      setTimeout(() => router.replace("/billing"), 800);
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-xs text-slate-400">
        Loading…
      </div>
    );
  }

  if (!sub || !sub.plan) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6 text-xs text-slate-200">
        <h1 className="text-lg font-semibold text-white">Manage subscription</h1>
        <p className="text-slate-400">No active subscription found.</p>
        <Link href="/billing" className="text-emerald-400 hover:underline">
          ← Back to billing
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 text-xs text-slate-200">
      <div className="flex items-center gap-3">
        <Link href="/billing" className="text-slate-400 transition hover:text-slate-200">
          ←
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-white">Manage subscription</h1>
          <p className="text-[11px] text-slate-400">View status, renewal, and cancel your plan.</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Current plan</p>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-100 capitalize">
              {sub.plan === "pro_monthly" ? "Pro" : sub.plan}
            </p>
            <p className="text-[11px] text-slate-400">
              Status: <span className="capitalize">{sub.status}</span>
              {sub.renewsAt && (
                <>
                  {" "}
                  · Renews on {new Date(sub.renewsAt).toLocaleDateString()}
                </>
              )}
            </p>
          </div>
          {sub.status === "active" && (
            <button
              onClick={cancel}
              disabled={submitting}
              className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-[11px] font-semibold text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Canceling…" : "Cancel subscription"}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200">
          {message}
        </div>
      )}
    </div>
  );
}
