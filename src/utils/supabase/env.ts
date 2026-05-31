export function getSupabaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return u && u.length > 0 ? u : "";
}

/** Prefer anon JWT από το Supabase → Settings → API· αλλιώς publishable key. */
export function getSupabasePublicKey(): string {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (anon && anon.length > 0) return anon;
  if (pub && pub.length > 0) return pub;
  return "";
}
