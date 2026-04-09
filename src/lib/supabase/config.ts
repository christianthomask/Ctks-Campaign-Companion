// Resolve Supabase env vars — supports both naming conventions:
// NEXT_PUBLIC_SUPABASE_* (manual setup) and SUPABASE_* (Vercel integration)

export function getSupabaseConfig() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  return { url, anonKey };
}
