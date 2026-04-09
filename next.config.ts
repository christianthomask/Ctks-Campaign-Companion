import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Expose SUPABASE_* env vars to the browser as NEXT_PUBLIC_ variants
  // This bridges the Vercel-Supabase integration (which sets SUPABASE_*)
  // with Next.js client-side code (which requires NEXT_PUBLIC_* prefix)
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY,
  },
};

export default nextConfig;
