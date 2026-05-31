"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast, { Toaster } from "react-hot-toast";

const cardSchema = z.object({
  cardholderName: z.string().min(2, "Cardholder name is required"),
  cardNumber: z
    .string()
    .min(13, "Card number must be 13–19 digits")
    .max(23, "Card number must be 13–19 digits")
    .regex(/^[\d\s]+$/, "Digits and spaces only"),
  expMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, "MM must be 01–12"),
  expYear: z.string().regex(/^\d{2}$/, "YY must be 2 digits"),
  cvv: z.string().min(3, "CVV must be 3–4 digits").max(4, "CVV must be 3–4 digits"),
  billingEmail: z.string().email("Invalid email"),
  setDefault: z.boolean().optional(),
});

type CardFormData = z.infer<typeof cardSchema>;

export default function AddPaymentMethodPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [topMessage, setTopMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      cardholderName: "",
      cardNumber: "",
      expMonth: "",
      expYear: "",
      cvv: "",
      billingEmail: "",
      setDefault: true,
    },
  });

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      try {
        const res = await fetch("/api/account/me");
        if (!res.ok) {
          router.replace("/auth/login");
          return;
        }
        const body = await res.json().catch(() => null);
        if (!body?.ok) {
          router.replace("/auth/login");
          return;
        }
        if (!cancelled && body.user) {
          if (body.user.email) setValue("billingEmail", body.user.email);
          if (body.user.name) setValue("cardholderName", body.user.name);
        }
      } catch {
        if (!cancelled) setTopMessage("Couldn't load your account. Please refresh.");
      }
    }
    void loadUser();
    return () => {
      cancelled = true;
    };
  }, [router, setValue]);

  async function onSubmit(values: CardFormData) {
    setSubmitting(true);
    setTopMessage(null);
    try {
      const res = await fetch("/api/billing/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string; error?: string }
        | null;
      if (!res.ok || !body?.ok) {
        toast.error(body?.message ?? "Failed to save card. Please try again.");
        return;
      }
      toast.success("Payment method saved.");
      setTimeout(() => router.replace("/billing?card_added=1"), 600);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
            <h1 className="text-lg font-semibold text-white">Add payment method</h1>
            <p className="text-[11px] text-slate-400">
              Save a card for future charges. No subscription will be created.
            </p>
          </div>
        </div>

        {topMessage && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
            {topMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/80 p-5"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Card details
          </p>

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
            <Field label="Month" error={errors.expMonth?.message}>
              <input
                {...register("expMonth", {
                  onChange: (e) => {
                    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 2);
                  },
                })}
                inputMode="numeric"
                placeholder="MM"
                maxLength={2}
                className={inputCls(!!errors.expMonth)}
              />
            </Field>
            <Field label="Year" error={errors.expYear?.message}>
              <input
                {...register("expYear", {
                  onChange: (e) => {
                    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 2);
                  },
                })}
                inputMode="numeric"
                placeholder="YY"
                maxLength={2}
                className={inputCls(!!errors.expYear)}
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

          <label className="flex items-center gap-2 text-[11px] text-slate-300">
            <input type="checkbox" {...register("setDefault")} className="h-3 w-3" />
            Use this card as the default payment method
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="h-10 w-full rounded-md bg-emerald-500 text-[12px] font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save payment method"}
          </button>

          <p className="text-[10px] text-slate-500">
            Your card is securely stored as a saved payment method. We only keep the brand,
            last 4 digits, and expiry — never the full card number or CVV.
          </p>
        </form>
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
