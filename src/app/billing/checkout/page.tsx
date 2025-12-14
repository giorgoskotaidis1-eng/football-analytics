"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";

const paymentSchema = z.object({
  cardNumber: z.string().min(16, "Card number must be 16 digits").max(19),
  expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, "Invalid month"),
  expiryYear: z.string().regex(/^\d{2}$/, "Invalid year"),
  cvv: z.string().min(3, "CVV must be 3-4 digits").max(4),
  cardholderName: z.string().min(1, "Cardholder name is required"),
  billingEmail: z.string().email("Invalid email"),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  starter: 39,
  pro_monthly: 89,
  elite: 0, // Custom pricing
};

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "pro_monthly";
  const price = PLAN_PRICES[plan] || 89;

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      cardNumber: "",
      expiryMonth: "",
      expiryYear: "",
      cvv: "",
      cardholderName: "",
      billingEmail: "",
    },
  });

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/account/me");
        if (!res.ok) {
          router.replace("/auth/login");
          return;
        }
        const data = await res.json();
        if (!data.ok) {
          router.replace("/auth/login");
          return;
        }
        if (data.user?.email) {
          setUserEmail(data.user.email);
          setValue("billingEmail", data.user.email);
        }
      } catch {
        router.replace("/auth/login");
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  async function handlePayment(data: PaymentFormData) {
    // Free plan doesn't need payment
    if (plan === "free") {
      setProcessing(true);
      try {
        const res = await fetch("/api/billing/subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: "free",
            action: "subscribe",
          }),
        });

        if (res.ok) {
          toast.success("Free plan activated!");
          setTimeout(() => {
            router.push("/billing?success=1");
          }, 1500);
        } else {
          toast.error("Failed to activate plan. Please try again.");
        }
      } catch (error) {
        toast.error("An error occurred. Please try again.");
      } finally {
        setProcessing(false);
      }
      return;
    }

    setProcessing(true);
    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // In real implementation, this would call Stripe or another payment provider
      // For now, we'll create a subscription record
      const res = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: plan === "update" ? "pro_monthly" : plan,
          action: "subscribe",
        }),
      });

      if (res.ok) {
        toast.success("Payment successful! Your subscription is now active.");
        setTimeout(() => {
          router.push("/billing?success=1");
        }, 1500);
      } else {
        toast.error("Payment failed. Please try again.");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="mx-auto max-w-2xl space-y-6 p-6 text-xs text-slate-200">
        <div className="flex items-center gap-3">
          <Link href="/billing" className="text-slate-400 hover:text-slate-200 transition">
            ←
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-white">
              {plan === "update" ? "Update Payment Method" : "Complete Payment"}
            </h1>
            <p className="text-[11px] text-slate-400">
              {plan === "update"
                ? "Update your card details"
                : plan === "free"
                ? "Free Plan - €0/month"
                : plan === "pro_monthly"
                ? "Pro Plan - €89/month"
                : plan === "starter"
                ? "Starter Plan - €39/month"
                : `Plan - €${price}/month`}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Payment Details
            </p>

            <form className="space-y-4" onSubmit={handleSubmit(handlePayment)}>
              {plan !== "free" && (
                <>
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-300">Cardholder Name</label>
                <input
                  {...register("cardholderName")}
                  className={`h-8 w-full rounded-md border bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:ring-1 ${
                    errors.cardholderName
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/60"
                      : "border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/60"
                  }`}
                  placeholder="John Doe"
                />
                {errors.cardholderName && (
                  <p className="text-[10px] text-red-400">{errors.cardholderName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-300">Card Number</label>
                <input
                  {...register("cardNumber")}
                  className={`h-8 w-full rounded-md border bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:ring-1 ${
                    errors.cardNumber
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/60"
                      : "border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/60"
                  }`}
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                />
                {errors.cardNumber && (
                  <p className="text-[10px] text-red-400">{errors.cardNumber.message}</p>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-300">Month</label>
                  <input
                    {...register("expiryMonth")}
                    className={`h-8 w-full rounded-md border bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:ring-1 ${
                      errors.expiryMonth
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/60"
                        : "border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/60"
                    }`}
                    placeholder="MM"
                    maxLength={2}
                  />
                  {errors.expiryMonth && (
                    <p className="text-[10px] text-red-400">{errors.expiryMonth.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-300">Year</label>
                  <input
                    {...register("expiryYear")}
                    className={`h-8 w-full rounded-md border bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:ring-1 ${
                      errors.expiryYear
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/60"
                        : "border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/60"
                    }`}
                    placeholder="YY"
                    maxLength={2}
                  />
                  {errors.expiryYear && (
                    <p className="text-[10px] text-red-400">{errors.expiryYear.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-300">CVV</label>
                  <input
                    {...register("cvv")}
                    type="password"
                    className={`h-8 w-full rounded-md border bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:ring-1 ${
                      errors.cvv
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/60"
                        : "border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/60"
                    }`}
                    placeholder="123"
                    maxLength={4}
                  />
                  {errors.cvv && (
                    <p className="text-[10px] text-red-400">{errors.cvv.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-300">Billing Email</label>
                <input
                  {...register("billingEmail")}
                  type="email"
                  className={`h-8 w-full rounded-md border bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:ring-1 ${
                    errors.billingEmail
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/60"
                      : "border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/60"
                  }`}
                  placeholder="billing@club.com"
                />
                {errors.billingEmail && (
                  <p className="text-[10px] text-red-400">{errors.billingEmail.message}</p>
                )}
              </div>
                </>
              )}

              {plan === "free" && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                  <p className="text-[11px] text-emerald-300 mb-2">Free plan - No payment required</p>
                  <p className="text-[10px] text-slate-400">Click below to activate your free plan</p>
                </div>
              )}

              <button
                type="submit"
                disabled={processing}
                className="h-9 w-full rounded-md bg-emerald-500 text-[11px] font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {processing
                  ? "Processing..."
                  : plan === "free"
                  ? "Activate Free Plan"
                  : `Pay €${price}/month`}
              </button>
            </form>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Order Summary
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300">
                  {plan === "free"
                    ? "Free Plan"
                    : plan === "pro_monthly"
                    ? "Pro Plan"
                    : plan === "starter"
                    ? "Starter Plan"
                    : "Plan"}
                </span>
                <span className="text-[11px] font-semibold text-slate-100">€{price}/month</span>
              </div>
              <div className="border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-200">Total</span>
                  <span className="text-base font-semibold text-emerald-400">€{price}/month</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">
                  {plan === "free" ? "Free forever" : "Billed monthly. Cancel anytime."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

