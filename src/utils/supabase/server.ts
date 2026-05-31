import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicKey, getSupabaseUrl } from "@/utils/supabase/env";

export const createClient = (
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) => {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabasePublicKey();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // `setAll` from a Server Component — middleware refreshes the session.
        }
      },
    },
  });
};
