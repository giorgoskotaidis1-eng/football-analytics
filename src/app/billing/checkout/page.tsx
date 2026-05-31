"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast, { Toaster } from "react-hot-toast";

const PLAN_PRICES: Record<string, { label: string; price: number }> = {
  free: { label: "Free", price: 0 },
  starter: { label: "Starter", price: 39 },
  pro_monthly: { label: "Pro", price: 89 },
};

const paymentSchema = z.object({
  cardholderName: z.string().min(2, "Cardholder name is required"),
  cardNumber: z
    .string()
    .min(13, "Card number must be 13–19 digits")
    .max(23, "Card number must be 13–19 digits")
    .regex(/^[\d\s]+$/, "Digits and spaces only"),
  expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, "MM must be 01–12"),
  expiryYear: z.string().regex(/^\d{2}$/, "YY must be 2 digits"),
  cvv: z.string().min(3, "CVV must be 3–4 digits").max(4, "CVV must be 3–4 digits"),
  billingEmail: z.string().email("Invalid email"),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get("plan") || "pro_monthly";
  const planMeta = PLAN_PRICES[planId] ?? { label: planId, price: 0 };

  const [phase, setPhase] = useState<"loading" | "form" | "redirecting">("loading");
  const [submitting, setSubmitting] = useState(false);
  const [topMessage, setTopMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      cardholderName: "",
      cardNumber: "",
      expiryMonth: "",
      expiryYear: "",
      cvv: "",
      billingEmail: "",
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const meRes = await fetch("/api/account/me");
        if (!meRes.ok) {
          router.replace("/auth/login");
          return;
        }
        const meBody = await meRes.json().catch(() => null);
        if (!meBody?.ok) {
          router.replace("/auth/login");
          return;
        }
        if (!cancelled && meBody.user?.email) {
          setValue("billingEmail", meBody.user.email);
          setValue("cardholderName", meBody.user.name ?? "");
        }

        const checkoutRes = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: planId }),
        });
        const checkoutBody = (await checkoutRes.json().catch(() => null)) as
          | { ok?: boolean; mode?: string; url?: string; error?: string; message?: string }
          | null;

        if (cancelled) return;

        if (!checkoutRes.ok || !checkoutBody?.ok || !checkoutBody.url) {
          setPhase("form");
          setTopMessage(
            checkoutBody?.message ||
              "We couldn't initialise checkout. Please try again or contact support."
          );
          return;
        }

        if (checkoutBody.mode === "stripe") {
          setPhase("redirecting");
          window.location.href = checkoutBody.url;
          return;
        }

        if (checkoutBody.mode === "free") {
          setPhase("redirecting");
          window.location.href = checkoutBody.url;
          return;
        }

        setPhase("form");
      } catch {
        if (!cancelled) {
          setPhase("form");
          setTopMessage("Network error while initialising checkout. Please try again.");
        }
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [planId, router, setValue]);

  async function onSubmit(values: PaymentFormData) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/billing/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planId,
          billingEmail: values.billingEmail,
          billingName: values.cardholderName,
          cardLast4: values.cardNumber.replace(/\D/g, "").slice(-4),
          cardExpMonth: values.expiryMonth,
          cardExpYear: values.expiryYear,
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string; error?: string }
        | null;
      if (!res.ok || !body?.ok) {
        toast.error(body?.message ?? "Payment failed. Please try again.");
        return;
      }
      toast.success("Payment successful! Activating your subscription…");
      setTimeout(() => router.replace("/billing?success=1"), 700);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-xs text-slate-400">
        Loading…
      </div>
    );
  }

  if (phase === "redirecting") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 p-6 text-center text-xs text-slate-200">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-500" />
        <h1 className="text-sm font-semibold text-slate-100">Redirecting to secure checkout…</h1>
        <p className="text-[11px] text-slate-400">You will be sent to Stripe to complete your purchase.</p>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="mx-auto max-w-2xl space-y-6 p-6 text-xs text-slate-200">
        <div className="flex items-center gap-3">
          <Link href="/billing" className="text-slate-400 transition hover:text-slate-200">
            ←
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-white">Complete your subscription</h1>
            <p className="text-[11px] text-slate-400">
              {planMeta.label} plan · €{planMeta.price}/month
            </p>
          </div>
        </div>

        {topMessage && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
            {topMessage}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <form
            className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/80 p-5"
            onSubmit={handleSubmit(onSubmit)}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Payment details</p>

            <Field label="Cardholder name" error={errors.cardholderName?.message}>
              <input
                {...register("cardholderName")}
                placeholder="John Doe"
                className={inputCls(!!errors.cardholderName)}
              />
            </Field>

            <Field label="Card number" error={errors.cardNumber?.message}>
              <input
                {...register("cardNumber", {
                  onChange: (e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 19);
                    e.target.value = digits.replace(/(.{4})/g, "$1 ").trim();
                  },
                })}
                inputMode="numeric"
                placeholder="4242 4242 4242 4242"
                maxLength={23}
                className={inputCls(!!errors.cardNumber)}
              />
            </Field>

            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Month" error={errors.expiryMonth?.message}>
                <input
                  {...register("expiryMonth", {
                    onChange: (e) => {
                      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 2);
                    },
                  })}
                  inputMode="numeric"
                  placeholder="MM"
                  maxLength={2}
                  className={inputCls(!!errors.expiryMonth)}
                />
              </Field>
              <Field label="Year" error={errors.expiryYear?.message}>
                <input
                  {...register("expiryYear", {
                    onChange: (e) => {
                      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 2);
                    },
                  })}
                  inputMode="numeric"
                  placeholder="YY"
                  maxLength={2}
                  className={inputCls(!!errors.expiryYear)}
                />
              </Field>
              <Field label="CVV" error={errors.cvv?.message}>
                <input
                  {...register("cvv", {
                    onChange: (e) => {
                      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4);
                    },
                  })}
                  inputMode="numeric"
                  type="password"
                  placeholder="123"
                  maxLength={4}
                  className={inputCls(!!errors.cvv)}
                />
              </Field>
            </div>

            <Field label="Billing email" error={errors.billingEmail?.message}>
              <input
                {...register("billingEmail")}
                type="email"
                placeholder="finance@club.com"
                className={inputCls(!!errors.billingEmail)}
              />
            </Field>

            <button
              type="submit"
              disabled={submitting}
              className="h-10 w-full rounded-md bg-emerald-500 text-[12px] font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Processing…" : `Pay €${planMeta.price}/month`}
            </button>

            <p className="text-[10px] text-slate-500">
              Your card is charged €{planMeta.price} every month. You can cancel any time from the billing page.
            </p>
          </form>

          <aside className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-5 text-[11px]">
            <p className="font-medium uppercase tracking-wide text-slate-400">Order summary</p>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">{planMeta.label} plan</span>
              <span className="font-semibold text-slate-100">€{planMeta.price}/month</span>
            </div>
            <div className="border-t border-slate-800 pt-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-200">Total</span>
                <span className="text-base font-semibold text-emerald-400">€{planMeta.price}/month</span>
              </div>
              <p className="mt-1 text-[10px] text-slate-500">Billed monthly. Cancel anytime.</p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function inputCls(hasError: boolean) {
  return `h-9 w-full rounded-md border bg-slate-900 px-3 text-[12px] text-slate-100 outline-none focus:ring-1 ${
    hasError
      ? "border-red-500 focus:border-red-500 focus:ring-red-500/60"
      : "border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/60"
  }`;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] text-slate-300">{label}</label>
      {children}
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutPageContent />
    </Suspense>
  );
}
