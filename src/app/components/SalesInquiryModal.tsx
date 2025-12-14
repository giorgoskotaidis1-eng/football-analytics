"use client";

import { useState, FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";

const inquirySchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  company: z.string().optional(),
  phone: z.string().optional(),
  message: z.string().optional(),
});

type InquiryFormData = z.infer<typeof inquirySchema>;

interface SalesInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SalesInquiryModal({ isOpen, onClose }: SalesInquiryModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InquiryFormData>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      phone: "",
      message: "",
    },
  });

  async function onSubmit(data: InquiryFormData) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sales/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (res.ok && result.ok) {
        toast.success("Your inquiry has been sent! Our sales team will contact you soon.");
        reset();
        onClose();
      } else {
        toast.error(result.message || "Failed to send inquiry. Please try again.");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-lg rounded-xl border border-slate-800 bg-slate-950 p-6 text-xs text-slate-200 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-200 transition text-xl font-bold leading-none"
        >
          ×
        </button>

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Talk to Sales</h2>
          <p className="text-[11px] text-slate-400 mt-1">
            Interested in our Elite plan? Fill out the form below and our sales team will get back to you.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-300">Name *</label>
            <input
              {...register("name")}
              className={`h-8 w-full rounded-md border bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:ring-1 ${
                errors.name
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/60"
                  : "border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/60"
              }`}
              placeholder="John Doe"
            />
            {errors.name && (
              <p className="text-[10px] text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-300">Email *</label>
            <input
              {...register("email")}
              type="email"
              className={`h-8 w-full rounded-md border bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:ring-1 ${
                errors.email
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/60"
                  : "border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/60"
              }`}
              placeholder="john@club.com"
            />
            {errors.email && (
              <p className="text-[10px] text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-300">Company / Club</label>
              <input
                {...register("company")}
                className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                placeholder="AC Milan"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-300">Phone</label>
              <input
                {...register("phone")}
                type="tel"
                className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-300">Message</label>
            <textarea
              {...register("message")}
              rows={4}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-2 py-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60 resize-none"
              placeholder="Tell us about your needs..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 rounded-md border border-slate-700 bg-slate-900 text-[11px] font-semibold text-slate-200 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-9 rounded-md bg-emerald-500 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 transition"
            >
              {isSubmitting ? "Sending..." : "Send Inquiry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

