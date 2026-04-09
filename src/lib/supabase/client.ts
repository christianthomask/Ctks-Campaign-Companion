import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      `Missing Supabase environment variables. ` +
        `URL=${url ? "set" : "MISSING"}, ` +
        `ANON_KEY=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "missing"}, ` +
        `PUBLISHABLE_KEY=${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? "set" : "missing"}`
    );
  }

  return createBrowserClient(url, key);
}
