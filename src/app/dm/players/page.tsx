"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Member {
  user_id: string;
  role: string;
  joined_at: string;
  display_name: string;
}

export default function DmPlayersPage() {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [campaignName, setCampaignName] = useState("");

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get campaign
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, name, invite_code")
      .eq("dm_user_id", user.id)
      .limit(1)
      .single();

    if (campaign) {
      setCampaignName(campaign.name);
      setInviteCode(campaign.invite_code);
      if (campaign.invite_code) {
        setInviteUrl(`${window.location.origin}/join/${campaign.invite_code}`);
      }

      // Get members with profile names
      const { data: memberData } = await supabase
        .from("campaign_members")
        .select("user_id, role, joined_at")
        .eq("campaign_id", campaign.id);

      if (memberData) {
        const enriched: Member[] = [];
        for (const m of memberData) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", m.user_id)
            .single();
          enriched.push({
            ...m,
            display_name: profile?.display_name || "Unknown",
          });
        }
        setMembers(enriched);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function generateInvite() {
    setGenerating(true);
    const res = await fetch("/api/campaigns/invite", { method: "POST" });
    const data = await res.json();
    if (data.invite_code) {
      setInviteCode(data.invite_code);
      setInviteUrl(`${window.location.origin}${data.invite_url}`);
    }
    setGenerating(false);
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="animate-pulse px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <div className="h-8 w-32 rounded bg-gray-800 mb-4" />
          <div className="h-24 rounded bg-gray-800/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-amber-400">Players</h1>
          <p className="mt-1 text-sm text-gray-400">{campaignName}</p>
        </div>

        {/* Invite section */}
        <div className="mb-8 rounded-lg bg-gray-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-200">Invite Players</h2>

          {inviteCode ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300 font-mono"
                />
                <button
                  onClick={copyLink}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-gray-950 hover:bg-amber-500"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Share this link with your players. They&apos;ll be able to sign up and join your campaign.
              </p>
              <button
                onClick={generateInvite}
                disabled={generating}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                {generating ? "Regenerating..." : "Regenerate link"}
              </button>
            </div>
          ) : (
            <button
              onClick={generateInvite}
              disabled={generating}
              className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-gray-950 hover:bg-amber-500 disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Invite Link"}
            </button>
          )}
        </div>

        {/* Members list */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-200">
            Current Members ({members.length})
          </h2>
          {members.length > 0 ? (
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.user_id}
                  className="flex items-center justify-between rounded-lg bg-gray-900 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-100">
                      {m.display_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Joined {new Date(m.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      m.role === "dm"
                        ? "bg-amber-900/50 text-amber-300"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {m.role.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No players have joined yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
