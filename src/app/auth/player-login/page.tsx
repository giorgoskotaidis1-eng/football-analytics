"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PlayerLoginPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to main login page
    router.replace("/auth/login");
  }, [router]);

  return null;
}

