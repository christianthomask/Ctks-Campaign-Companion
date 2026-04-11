"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PlayerDashboard() {
  const [hasCampaign, setHasCampaign] = useState<boolean | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from("campaign_members")
        .select("campaign_id")
        .eq("user_id", user.id)
        .limit(1);

      if (memberships && memberships.length > 0) {
        setHasCampaign(true);
        const { data: campaign } = await supabase
          .from("campaigns")
          .select("name")
          .eq("id", memberships[0].campaign_id)
          .single();
        if (campaign) setCampaignName(campaign.name);
      } else {
        setHasCampaign(false);
      }
    }
    check();
  }, []);

  async function handleJoin() {
    setJoining(true);
    setJoinError("");

    // Extract code from URL or raw input
    let code = inviteInput.trim();
    const urlMatch = code.match(/\/join\/([a-zA-Z0-9]+)/);
    if (urlMatch) code = urlMatch[1];

    const res = await fetch("/api/campaigns/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_code: code }),
    });

    const data = await res.json();
    setJoining(false);

    if (!res.ok) {
      setJoinError(data.error || "Failed to join");
      return;
    }

    router.refresh();
    setHasCampaign(true);
    setCampaignName(data.campaign_name || "");
  }

  if (hasCampaign === null) {
    return (
      <div className="animate-pulse px-4 py-6">
        <div className="mx-auto max-w-lg">
          <div className="h-8 w-48 rounded bg-gray-800 mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-gray-800/50" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!hasCampaign) {
    return (
      <main className="min-h-screen bg-gray-950 text-gray-100 p-4">
        <div className="max-w-lg mx-auto space-y-6">
          <h1 className="text-2xl font-bold text-amber-400">Welcome!</h1>
          <p className="text-gray-400">
            You&apos;re not part of a campaign yet. Ask your DM for an invite link, or paste an invite code below.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="Paste invite link or code"
              className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none"
            />
            <button
              onClick={handleJoin}
              disabled={joining || !inviteInput.trim()}
              className="rounded-lg bg-amber-600 px-6 py-3 font-medium text-gray-950 hover:bg-amber-500 disabled:opacity-50"
            >
              {joining ? "..." : "Join"}
            </button>
          </div>
          {joinError && <p className="text-sm text-red-400">{joinError}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">{campaignName}</h1>
          <p className="text-sm text-gray-400">Player Dashboard</p>
        </div>
        <p className="text-sm text-gray-500">
          Use the navigation above to access your character sheet, reference sheets, and handouts.
        </p>
      </div>
    </main>
  );
}
