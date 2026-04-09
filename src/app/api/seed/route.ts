import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import sessionData from "@/data/sessions/joy-of-extradimensional-spaces.json";

export async function POST() {
  const supabase = await createClient();

  // Require authenticated DM
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "dm") {
    return NextResponse.json({ error: "DM access required" }, { status: 403 });
  }

  // Check if campaign already exists (idempotent)
  const { data: existingCampaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("name", "Candlekeep Mysteries")
    .eq("dm_user_id", user.id)
    .single();

  let campaignId: string;

  if (existingCampaign) {
    campaignId = existingCampaign.id;
  } else {
    const { data: newCampaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        name: "Candlekeep Mysteries",
        description:
          "A series of adventures centered around the legendary library-fortress of Candlekeep",
        dm_user_id: user.id,
      })
      .select("id")
      .single();

    if (campaignError || !newCampaign) {
      return NextResponse.json(
        { error: "Failed to create campaign", details: campaignError?.message },
        { status: 500 }
      );
    }

    campaignId = newCampaign.id;

    // Add DM as campaign member
    await supabase.from("campaign_members").insert({
      campaign_id: campaignId,
      user_id: user.id,
      role: "dm",
    });
  }

  // Check if session already exists
  const { data: existingSession } = await supabase
    .from("sessions")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("session_number", 1)
    .single();

  let sessionId: string;

  if (existingSession) {
    // Update existing session content
    await supabase
      .from("sessions")
      .update({ content: sessionData as unknown as Record<string, unknown> })
      .eq("id", existingSession.id);

    sessionId = existingSession.id;
  } else {
    const { data: newSession, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        campaign_id: campaignId,
        title: sessionData.meta.title,
        session_number: 1,
        subtitle: sessionData.meta.subtitle,
        content: sessionData as unknown as Record<string, unknown>,
      })
      .select("id")
      .single();

    if (sessionError || !newSession) {
      return NextResponse.json(
        { error: "Failed to create session", details: sessionError?.message },
        { status: 500 }
      );
    }

    sessionId = newSession.id;
  }

  // Initialize puzzle tracker state
  const puzzleState = sessionData.quick_reference.puzzle_tracker.map((p) => ({
    letter: p.letter,
    room: p.room,
    found: false,
  }));

  await supabase.from("session_state").upsert(
    {
      session_id: sessionId,
      state_key: "puzzle_tracker",
      state_value: { entries: puzzleState } as unknown as Record<string, unknown>,
    },
    { onConflict: "session_id,state_key" }
  );

  return NextResponse.json({
    success: true,
    campaign_id: campaignId,
    session_id: sessionId,
  });
}
