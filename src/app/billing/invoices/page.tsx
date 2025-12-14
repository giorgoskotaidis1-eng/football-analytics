"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Invoice = {
  id: string;
  date: string;
  description: string;
  amount: string;
  status: string;
};

export default function BillingInvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const res = await fetch("/api/billing/subscription");
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.invoices) {
            setInvoices(data.invoices);
          }
        }
      } catch {
        // ignore errors
      } finally {
        setLoading(false);
      }
    }
    fetchInvoices();
  }, []);

  return (
    <div className="space-y-6 text-xs text-slate-200">
      <div className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Billing</p>
        <h1 className="text-lg font-semibold tracking-tight text-slate-50">Invoices</h1>
        <p className="text-[11px] text-slate-500">
          Central place for all your subscription invoices.
        </p>
      </div>

      {loading ? (
        <p className="text-[11px] text-slate-400">Loading invoices...</p>
      ) : (
        <>
          {invoices.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-[11px] text-slate-300">
              <div>
                <p className="font-medium">Export</p>
                <p className="text-[10px] text-slate-500">Download your billing history for accounting.</p>
              </div>
              <button className="h-8 rounded-md border border-slate-700 bg-slate-900 px-3 text-[11px] text-slate-200 hover:bg-slate-800">
                Download CSV
              </button>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80">
            <table className="w-full border-collapse text-[11px] text-slate-300">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Description</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 text-right font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-[11px] text-slate-400">
                      No invoices yet. Invoices will appear here once you have an active subscription.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="border-t border-slate-800">
                      <td className="px-3 py-2">{inv.date}</td>
                      <td className="px-3 py-2">{inv.description}</td>
                      <td className="px-3 py-2 text-right">{inv.amount}</td>
                      <td className="px-3 py-2 text-right text-emerald-300">{inv.status}</td>
                      <td className="px-3 py-2 text-right">
                        <button className="h-7 rounded-md border border-slate-700 bg-slate-900 px-3 text-[10px] text-slate-200 hover:bg-slate-800">
                          Download PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
