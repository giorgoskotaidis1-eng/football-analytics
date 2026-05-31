import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { getSupabasePublicKey, getSupabaseUrl } from "@/utils/supabase/env";

export async function GET() {
  const url = getSupabaseUrl();
  const key = getSupabasePublicKey();

  const checks: Record<string, boolean | string> = {
    hasSupabaseUrl: Boolean(url),
    hasSupabasePublicKey: Boolean(key),
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.prismaDatabase = true;
  } catch (e) {
    checks.prismaDatabase = false;
    checks.prismaError = e instanceof Error ? e.message : "unknown";
  }

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase.auth.getUser();
    checks.supabaseAuthPing = !error;
    if (error) checks.supabaseAuthError = error.message;
  } catch (e) {
    checks.supabaseAuthPing = false;
    checks.supabaseAuthError = e instanceof Error ? e.message : "unknown";
  }

  const ok =
    checks.prismaDatabase === true &&
    checks.hasSupabaseUrl === true &&
    checks.hasSupabasePublicKey === true;

  return NextResponse.json({ ok, checks });
}
