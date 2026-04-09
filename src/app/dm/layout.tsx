import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavLink } from "@/components/ui/NavLink";

export const dynamic = "force-dynamic";

export default async function DmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/");
  }

  if (profile.role !== "dm") {
    redirect("/");
  }

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/95 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-4">
          <div className="flex gap-1">
            <NavLink href="/dm/sessions">Sessions</NavLink>
            <NavLink href="/dm/handouts">Handouts</NavLink>
            <NavLink href="/dm/players">Players</NavLink>
          </div>
          <span className="text-xs text-gray-500">DM</span>
        </div>
      </nav>
      {children}
    </div>
  );
}
