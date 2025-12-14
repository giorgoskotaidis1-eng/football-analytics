"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Subscription = {
  id: number;
  userId: number;
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  user: {
    email: string;
    name: string | null;
  };
};

export default function AdminBillingPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchSubscriptions() {
      try {
        const res = await fetch("/api/billing/subscription?all=true");
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.subscriptions) {
            setSubscriptions(data.subscriptions);
          }
        }
      } catch {
        // ignore errors
      } finally {
        setLoading(false);
      }
    }
    fetchSubscriptions();
  }, []);

  return (
    <div className="space-y-6 text-xs text-slate-200">
      <div className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Admin</p>
        <h1 className="text-lg font-semibold tracking-tight text-slate-50">Billing overview</h1>
        <p className="text-[11px] text-slate-500">
          Internal view of club subscriptions. Manage all active subscriptions from here.
        </p>
      </div>

      {loading ? (
        <p className="text-[11px] text-slate-400">Loading subscriptions...</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80">
          <table className="w-full border-collapse text-[11px] text-slate-300">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">User</th>
                <th className="px-3 py-2 text-left font-medium">Plan</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Renews at</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-[11px] text-slate-400">
                    No subscriptions yet. Subscriptions will appear here once users subscribe.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-t border-slate-800">
                    <td className="px-3 py-2">{sub.user.email}</td>
                    <td className="px-3 py-2">{sub.plan}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${
                          sub.status === "active"
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {sub.currentPeriodEnd
                        ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button className="h-7 rounded-md border border-slate-700 bg-slate-900 px-3 text-[10px] text-slate-200 hover:bg-slate-800">
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
