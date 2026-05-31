"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PlayerLoginPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to main login page
    router.replace("/auth/login");
  }, [router]);

  return (
    <div className="mx-auto max-w-md p-6 text-center text-[11px] text-slate-400">
      Redirecting to sign in…
    </div>
  );
}

