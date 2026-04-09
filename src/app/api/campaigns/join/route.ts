import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const inviteCode = String(body.invite_code || "").trim();

    if (!inviteCode) {
      return NextResponse.json({ error: "Invite code required" }, { status: 400 });
    }

    // Find campaign by invite code
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, name")
      .eq("invite_code", inviteCode)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("campaign_members")
      .select("campaign_id")
      .eq("campaign_id", campaign.id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({
        already_member: true,
        campaign_id: campaign.id,
        campaign_name: campaign.name,
      });
    }

    // Join the campaign
    const { error } = await supabase.from("campaign_members").insert({
      campaign_id: campaign.id,
      user_id: user.id,
      role: "player",
    });

    if (error) {
      return NextResponse.json(
        { error: "Failed to join campaign", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      campaign_id: campaign.id,
      campaign_name: campaign.name,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Server error: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
