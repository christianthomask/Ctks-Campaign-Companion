import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavLink } from "@/components/ui/NavLink";

export const dynamic = "force-dynamic";

export default async function PlayerLayout({
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

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/95 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-4">
          <div className="flex gap-1">
            <NavLink href="/player/reference">Reference</NavLink>
            <NavLink href="/player/character">Character</NavLink>
            <NavLink href="/player/handouts">Handouts</NavLink>
          </div>
          <span className="text-xs text-gray-500">Player</span>
        </div>
      </nav>
      {children}
    </div>
  );
}
