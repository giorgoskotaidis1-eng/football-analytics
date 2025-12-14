"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { SalesInquiryModal } from "../components/SalesInquiryModal";
import { useTranslation } from "@/lib/i18n";

type Subscription = {
  plan: string | null;
  status: string;
  renewsAt: string | null;
};

export default function BillingPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null);
  const [showSalesModal, setShowSalesModal] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [userRes, subRes] = await Promise.all([
          fetch("/api/account/me"),
          fetch("/api/billing/subscription"),
        ]);

        if (!userRes.ok) {
          router.replace("/auth/login");
          return;
        }
        const userData = await userRes.json();
        if (!userData.ok) {
          router.replace("/auth/login");
          return;
        }
        setUser(userData.user);

        if (subRes.ok) {
          const subData = await subRes.json();
          if (subData.ok) {
            setSubscription({
              plan: subData.plan,
              status: subData.status,
              renewsAt: subData.renewsAt,
            });
          }
        }
      } catch {
        router.replace("/auth/login");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-6 text-xs text-slate-200">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs text-slate-200">
      <div className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">{t("billing")}</p>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">{t("subscriptionOverview")}</h1>
        <p className="text-[11px] text-slate-600 dark:text-slate-500">
          {t("choosePlan")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-slate-300">{t("free")}</p>
            <p className="text-2xl font-semibold text-slate-50">€0<span className="text-xs text-slate-500">{t("perMonth")}</span></p>
            <ul className="mt-2 space-y-1 text-[11px] text-slate-400">
              <li>• {t("oneTeam")}</li>
              <li>• {t("basicMatchTracking")}</li>
              <li>• {t("limitedAnalytics")}</li>
            </ul>
          </div>
          <button
            className="mt-4 h-8 rounded-md border border-slate-700 bg-slate-900 text-[11px] font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={subscription?.plan === "free" || subscription?.plan === null}
          >
            {subscription?.plan === "free" || subscription?.plan === null ? t("currentPlan") : t("selectPlan")}
          </button>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-slate-300">{t("starter")}</p>
            <p className="text-2xl font-semibold text-slate-50">€39<span className="text-xs text-slate-500">{t("perMonth")}</span></p>
            <ul className="mt-2 space-y-1 text-[11px] text-slate-400">
              <li>• {t("threeTeams")}</li>
              <li>• {t("basicMatchTagging")}</li>
              <li>• {t("simpleXgAndShotMaps")}</li>
            </ul>
          </div>
          <button
            className="mt-4 h-8 rounded-md border border-slate-700 bg-slate-900 text-[11px] font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={subscription?.plan === "starter"}
            onClick={() => {
              startTransition(async () => {
                try {
                  const res = await fetch("/api/billing/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ plan: "starter" }),
                  });
                  if (!res.ok) {
                    alert(t("failedToStartCheckout"));
                    return;
                  }
                  const data = (await res.json()) as { url?: string };
                  if (data?.url) {
                    window.location.href = data.url;
                  }
                } catch {
                  alert(t("anErrorOccurred"));
                }
              });
            }}
          >
            {subscription?.plan === "starter"
              ? t("currentPlan")
              : isPending
              ? t("redirecting")
              : `${t("upgradeTo")} ${t("starter")}`}
          </button>
        </div>

        <div className="relative flex flex-col justify-between rounded-xl border border-emerald-500/60 bg-gradient-to-br from-emerald-500/10 via-slate-950 to-slate-950 p-4 shadow-lg shadow-emerald-500/20">
          <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-slate-950">
            {t("recommended")}
          </span>
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-emerald-300">{t("pro")}</p>
            <p className="text-2xl font-semibold text-slate-50">€89<span className="text-xs text-slate-400">{t("perMonth")}</span></p>
            <ul className="mt-2 space-y-1 text-[11px] text-slate-300">
              <li>• {t("unlimitedTeams")}</li>
              <li>• {t("advancedEventTagging")}</li>
              <li>• {t("xgModelsAndPressingEfficiency")}</li>
              <li>• {t("csvApiExport")}</li>
            </ul>
          </div>
          <button
            className="mt-4 h-8 rounded-md bg-emerald-500 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending || subscription?.plan === "pro_monthly"}
            onClick={() => {
              startTransition(async () => {
                try {
                  const res = await fetch("/api/billing/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ plan: "pro_monthly" }),
                  });
                  if (!res.ok) {
                    alert(t("failedToStartCheckout"));
                    return;
                  }
                  const data = (await res.json()) as { url?: string };
                  if (data?.url) {
                    window.location.href = data.url;
                  }
                } catch {
                  alert(t("anErrorOccurred"));
                }
              });
            }}
          >
            {subscription?.plan === "pro_monthly"
              ? t("currentPlan")
              : isPending
              ? t("redirecting")
              : t("upgradeToPro")}
          </button>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-slate-300">{t("elite")}</p>
            <p className="text-2xl font-semibold text-slate-50">{t("custom")}</p>
            <ul className="mt-2 space-y-1 text-[11px] text-slate-400">
              <li>• {t("physicalAndTrackingData")}</li>
              <li>• {t("customDataModels")}</li>
              <li>• {t("dedicatedSuccessAnalyst")}</li>
            </ul>
          </div>
          <button
            onClick={() => setShowSalesModal(true)}
            className="mt-4 h-8 rounded-md border border-slate-700 bg-slate-900 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
          >
            {t("talkToSales")}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/80 p-6 text-[11px] text-slate-300">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border border-emerald-500/30">
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="font-semibold text-slate-200">{t("paymentMethod")}</p>
          </div>
          {subscription?.plan ? (
            <>
              <div className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 px-4 py-3.5 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-indigo-600 shadow-md">
                    <span className="text-xs font-bold text-white">{t("visa")}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-100">Visa ···· 4242</p>
                    <p className="text-[10px] text-slate-400">
                      {t("expires")} 12/27 · {user?.email || t("billingOwner")}
                    </p>
                  </div>
                </div>
                <Link
                  href="/billing/checkout?plan=update"
                  className="rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700/50 hover:border-slate-500 transition-colors"
                >
                  {t("updateCard")}
                </Link>
              </div>
            </>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-slate-700/50 bg-slate-950/50 px-6 py-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/50 border border-slate-800">
                <svg className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <p className="mb-1 text-sm font-medium text-slate-300">{t("noPaymentMethodOnFile")}</p>
              <p className="mb-4 text-xs text-slate-500">{t("addPaymentMethodToSubscribe")}</p>
              <Link
                href="/billing/checkout?plan=pro_monthly"
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-600/50 bg-emerald-600/10 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-600/20 hover:border-emerald-500/50 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t("addPaymentMethod")}
              </Link>
            </div>
          )}

          <div className="mt-3 space-y-2">
            <p className="font-medium">{t("billingDetails")}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-slate-400">{t("billingEmail")}</label>
                <input
                  className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                  placeholder="finance@club.com"
                  defaultValue={user?.email || ""}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-400">{t("vatTaxId")}</label>
                <input
                  className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                  placeholder={t("optional")}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-[11px] text-slate-300">
          <p className="font-medium">{t("nextRenewal")}</p>
          {subscription?.renewsAt ? (
            <>
              <p className="text-2xl font-semibold text-slate-50">
                {Math.ceil(
                  (new Date(subscription.renewsAt).getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                )}{" "}
                {t("days")}
              </p>
              <p className="text-slate-500">
                {t("youllBeCharged")} €{subscription.plan === "pro_monthly" ? "89" : "39"} {t("forThe")}{" "}
                {subscription.plan === "pro_monthly" ? t("pro") : t("starter")} {t("planOnRenewal")}
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold text-slate-50">{t("noActiveSubscription")}</p>
              <p className="text-slate-500">{t("upgradeToPlanToGetStarted")}</p>
            </>
          )}
          <button
            className="mt-1 h-8 w-full rounded-md border border-slate-700 bg-slate-900 text-[11px] text-slate-200 hover:bg-slate-800"
            onClick={async () => {
              try {
                const res = await fetch("/api/billing/portal", { method: "POST" });
                if (!res.ok) return;
                const data = (await res.json()) as { url?: string };
                if (data?.url) {
                  window.location.href = data.url;
                }
              } catch {
                // ignore, skeleton only
              }
            }}
          >
            {t("manageRenewalSettings")}
          </button>

          <div className="mt-4 space-y-2">
            <p className="font-medium">{t("invoices")}</p>
            <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
              <table className="w-full border-collapse text-[10px] text-slate-300">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">{t("date")}</th>
                    <th className="px-3 py-2 text-left font-medium">{t("description")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("amount")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-[11px] text-slate-400">
                      {t("noInvoicesYet")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <SalesInquiryModal isOpen={showSalesModal} onClose={() => setShowSalesModal(false)} />
    </div>
  );
}
