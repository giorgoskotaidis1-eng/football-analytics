"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    setStatus("loading");
    (async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          setStatus("error");
          setMessage(data.message || "Verification failed.");
          return;
        }
        setStatus("success");
        setMessage("Your email has been verified. You can now sign in.");
        setTimeout(() => {
          router.push("/auth/login");
        }, 1500);
      } catch {
        setStatus("error");
        setMessage("Network error. Please try again later.");
      }
    })();
  }, [router, searchParams]);

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-xs text-slate-200 shadow-xl">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-400">Email verification</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-50">Verify your email address</h1>
      </div>
      <div className="space-y-2 text-[11px] text-slate-300">
        {status === "loading" && <p>Verifying your email, please wait...</p>}
        {status !== "loading" && <p>{message}</p>}
      </div>
    </div>
  );
}
