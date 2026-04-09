import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseSessionMarkdown } from "@/lib/parser/sessionParser";

const MAX_FILE_SIZE = 500 * 1024; // 500KB

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse multipart form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    const campaignId = formData.get("campaign_id") as string | null;
    const notes = formData.get("notes") as string | null;

    // Validate inputs
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".md")) {
      return NextResponse.json(
        { error: "Only .md files are accepted" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 500KB)" },
        { status: 413 }
      );
    }

    // Resolve campaign — create one if "auto" or missing
    let resolvedCampaignId = campaignId;

    if (!campaignId || campaignId === "auto") {
      // Find existing campaign or create one
      const { data: existingCampaign } = await supabase
        .from("campaigns")
        .select("id")
        .eq("dm_user_id", user.id)
        .limit(1)
        .single();

      if (existingCampaign) {
        resolvedCampaignId = existingCampaign.id;
      } else {
        const { data: newCampaign, error: campError } = await supabase
          .from("campaigns")
          .insert({
            name: "My Campaign",
            description: "Created automatically on first session upload",
            dm_user_id: user.id,
          })
          .select("id")
          .single();

        if (campError || !newCampaign) {
          return NextResponse.json(
            { error: "Failed to create campaign", details: campError?.message },
            { status: 500 }
          );
        }

        resolvedCampaignId = newCampaign.id;

        // Add DM as campaign member
        await supabase.from("campaign_members").insert({
          campaign_id: resolvedCampaignId,
          user_id: user.id,
          role: "dm",
        });
      }
    } else {
      // Verify campaign ownership
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("id")
        .eq("id", campaignId)
        .eq("dm_user_id", user.id)
        .single();

      if (!campaign) {
        return NextResponse.json(
          { error: "Campaign not found or access denied" },
          { status: 403 }
        );
      }
    }

    // Read and parse the markdown
    const rawMarkdown = await file.text();

    let parsed;
    try {
      parsed = parseSessionMarkdown(rawMarkdown);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Parse error";
      return NextResponse.json(
        { error: `Failed to parse markdown: ${message}` },
        { status: 422 }
      );
    }

    const title = parsed.meta.title;

    // Check if session with this title already exists
    const { data: existingSession } = await supabase
      .from("sessions")
      .select("id, current_version, session_number")
      .eq("campaign_id", resolvedCampaignId)
      .eq("title", title)
      .single();

    let sessionId: string;
    let versionNumber: number;
    let isNew: boolean;

    if (existingSession) {
      // Update existing session
      versionNumber = (existingSession.current_version ?? 0) + 1;
      sessionId = existingSession.id;
      isNew = false;

      const { error: updateError } = await supabase
        .from("sessions")
        .update({
          content: parsed as unknown as Record<string, unknown>,
          subtitle: parsed.meta.subtitle || null,
          raw_markdown: rawMarkdown,
          current_version: versionNumber,
        })
        .eq("id", sessionId);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update session", details: updateError.message },
          { status: 500 }
        );
      }
    } else {
      // Determine session number
      const { count } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", resolvedCampaignId);

      const sessionNumber = (count ?? 0) + 1;
      versionNumber = 1;
      isNew = true;

      const { data: newSession, error: createError } = await supabase
        .from("sessions")
        .insert({
          campaign_id: resolvedCampaignId,
          title,
          session_number: sessionNumber,
          subtitle: parsed.meta.subtitle || null,
          content: parsed as unknown as Record<string, unknown>,
          raw_markdown: rawMarkdown,
          current_version: 1,
        })
        .select("id")
        .single();

      if (createError || !newSession) {
        return NextResponse.json(
          { error: "Failed to create session", details: createError?.message },
          { status: 500 }
        );
      }

      sessionId = newSession.id;
    }

    // Create version record
    const { error: versionError } = await supabase
      .from("session_versions")
      .insert({
        session_id: sessionId,
        version_number: versionNumber,
        content: parsed as unknown as Record<string, unknown>,
        raw_markdown: rawMarkdown,
        notes: notes || null,
      });

    if (versionError) {
      console.error("Failed to create version record:", versionError);
    }

    // Initialize puzzle tracker state if there are puzzle books
    if (parsed.quick_reference.puzzle_tracker.length > 0) {
      const puzzleState = parsed.quick_reference.puzzle_tracker.map((p) => ({
        letter: p.letter,
        room: p.room,
        found: false,
      }));

      await supabase.from("session_state").upsert(
        {
          session_id: sessionId,
          state_key: "puzzle_tracker",
          state_value: { entries: puzzleState } as unknown as Record<
            string,
            unknown
          >,
        },
        { onConflict: "session_id,state_key" }
      );
    }

    return NextResponse.json({
      session_id: sessionId,
      version_number: versionNumber,
      title,
      is_new: isNew,
      message: isNew
        ? `New session created`
        : `Session updated to version ${versionNumber}`,
    });
  } catch (e) {
    // Top-level catch — return the actual error so we can debug
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("Upload route error:", message, stack);
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    );
  }
}
