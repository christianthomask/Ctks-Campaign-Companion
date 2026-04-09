import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SeedButton } from "./seed-button";

export default async function SessionsPage() {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, title, subtitle, session_number, campaign_id")
    .order("session_number", { ascending: true });

  return (
    <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-amber-400">Sessions</h1>
          <p className="mt-1 text-sm text-gray-400">Your session prep library</p>
        </div>

        {/* Session list */}
        {sessions && sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/dm/sessions/${session.id}`}
                className="block rounded-lg bg-gray-900 p-4 transition-colors hover:bg-gray-800"
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="font-semibold text-gray-100">
                    {session.title}
                  </h2>
                  <span className="text-xs text-gray-500">
                    #{session.session_number}
                  </span>
                </div>
                {session.subtitle && (
                  <p className="mt-1 text-sm text-gray-400">
                    {session.subtitle}
                  </p>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-gray-900 p-8 text-center">
            <p className="text-gray-400">No sessions yet.</p>
            <p className="mt-2 text-sm text-gray-500">
              Seed the demo session to get started.
            </p>
            <SeedButton />
          </div>
        )}
      </div>
    </div>
  );
}
