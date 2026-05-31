import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicKey, getSupabaseUrl } from "@/utils/supabase/env";

export const createClient = () =>
  createBrowserClient(getSupabaseUrl(), getSupabasePublicKey());
