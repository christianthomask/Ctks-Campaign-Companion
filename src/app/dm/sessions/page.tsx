import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UploadButton } from "./upload-button";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const supabase = await createClient();

  // Get the DM's campaign (or first campaign)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name")
    .eq("dm_user_id", user!.id)
    .limit(1)
    .single();

  const { data: sessions } = campaign
    ? await supabase
        .from("sessions")
        .select("id, title, subtitle, session_number, current_version")
        .eq("campaign_id", campaign.id)
        .order("session_number", { ascending: true })
    : { data: null };

  return (
    <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-amber-400">Sessions</h1>
            <p className="mt-1 text-sm text-gray-400">
              {campaign ? campaign.name : "Your session prep library"}
            </p>
          </div>
          {campaign && <UploadButton campaignId={campaign.id} />}
        </div>

        {/* No campaign yet */}
        {!campaign && (
          <div className="rounded-lg bg-gray-900 p-8 text-center">
            <p className="text-gray-400">No campaign found.</p>
            <p className="mt-2 text-sm text-gray-500">
              Upload your first session prep file to automatically create a campaign.
            </p>
            <div className="mt-4">
              <UploadButton campaignId="auto" />
            </div>
          </div>
        )}

        {/* Session list */}
        {campaign && sessions && sessions.length > 0 ? (
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
                  <div className="flex items-center gap-2">
                    {session.current_version && (
                      <span className="text-xs text-gray-600">
                        v{String(session.current_version)}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      #{session.session_number}
                    </span>
                  </div>
                </div>
                {session.subtitle && (
                  <p className="mt-1 text-sm text-gray-400">
                    {session.subtitle}
                  </p>
                )}
              </Link>
            ))}
          </div>
        ) : campaign ? (
          <div className="rounded-lg bg-gray-900 p-8 text-center">
            <p className="text-gray-400">No sessions yet.</p>
            <p className="mt-2 text-sm text-gray-500">
              Upload a <code className="text-gray-300">.md</code> session prep file to get started.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
