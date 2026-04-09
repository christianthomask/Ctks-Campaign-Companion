import { createClient } from "@/lib/supabase/server";
import { HandoutManager } from "@/components/handouts/HandoutManager";

export const dynamic = "force-dynamic";

export default async function DmHandoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("dm_user_id", user!.id)
    .limit(1)
    .single();

  if (!campaign) {
    return (
      <div className="flex min-h-full items-center justify-center px-4">
        <p className="text-gray-400">No campaign found. Upload a session first.</p>
      </div>
    );
  }

  const { data: handouts } = await supabase
    .from("handouts")
    .select("*")
    .eq("campaign_id", campaign.id)
    .order("sort_order", { ascending: true });

  return (
    <HandoutManager
      campaignId={campaign.id}
      initialHandouts={handouts || []}
    />
  );
}
