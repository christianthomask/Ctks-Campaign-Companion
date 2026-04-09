import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find DM's campaign
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, invite_code")
      .eq("dm_user_id", user.id)
      .limit(1)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: "No campaign found" }, { status: 404 });
    }

    // Generate 8-character code
    const code = crypto.randomUUID().replace(/-/g, "").slice(0, 8);

    const { error } = await supabase
      .from("campaigns")
      .update({ invite_code: code })
      .eq("id", campaign.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to generate invite code", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      invite_code: code,
      invite_url: `/join/${code}`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Server error: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
