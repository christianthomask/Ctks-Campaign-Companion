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
      // Check if profile exists
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .single();

      if (!profile) {
        // Use RPC function to count profiles (bypasses RLS)
        const { data: countResult } = await supabase.rpc("get_profile_count");
        const profileCount = typeof countResult === "number" ? countResult : 0;

        const role = profileCount === 0 ? "dm" : "player";

        await supabase.from("profiles").insert({
          id: user.id,
          display_name: user.email?.split("@")[0] || "Adventurer",
          role,
        });

        redirect(role === "dm" ? "/dm/sessions" : "/player");
      }

      redirect(profile.role === "dm" ? "/dm/sessions" : "/player");
    }
  } catch (e) {
    if (e instanceof Error && "digest" in e) throw e;
  }

  redirect("/auth/login");
}
