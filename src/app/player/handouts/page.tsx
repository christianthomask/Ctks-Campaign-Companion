import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PlayerHandoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get player's campaign memberships
  const { data: memberships } = await supabase
    .from("campaign_members")
    .select("campaign_id")
    .eq("user_id", user.id);

  const campaignIds = memberships?.map((m) => m.campaign_id) || [];

  const { data: handouts } = campaignIds.length > 0
    ? await supabase
        .from("handouts")
        .select("id, title, content_type, content, published_at, created_at")
        .in("campaign_id", campaignIds)
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
    : { data: [] };

  return (
    <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-amber-400">Handouts</h1>
          <p className="mt-1 text-sm text-gray-400">From your DM</p>
        </div>

        {handouts && handouts.length > 0 ? (
          <div className="space-y-4">
            {handouts.map((handout) => (
              <div
                key={handout.id}
                className="rounded-lg bg-gray-900 p-4"
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="font-semibold text-gray-100">
                    {handout.title}
                  </h2>
                  <span className="text-xs text-gray-500">
                    {handout.published_at
                      ? new Date(handout.published_at).toLocaleDateString()
                      : ""}
                  </span>
                </div>
                <div className="mt-3 text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">
                  {handout.content}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-gray-900 p-8 text-center">
            <p className="text-gray-400">No handouts available yet.</p>
            <p className="mt-2 text-sm text-gray-500">
              Your DM will share handouts here during the campaign.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
