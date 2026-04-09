import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "dm") {
        redirect("/dm/sessions");
      } else if (profile) {
        redirect("/player");
      }
    }
  } catch (e) {
    // If it's a redirect, re-throw (Next.js uses thrown redirects)
    if (e instanceof Error && "digest" in e) throw e;
    // Otherwise Supabase is misconfigured — fall through to login
  }

  redirect("/auth/login");
}
