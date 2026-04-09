import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/sessions/versions/restore
 * Restores a previous session version by copying its content as a new version.
 *
 * Body: { session_id: string, version_number: number }
 * Returns: { version_number: number, message: string }
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  let body: { session_id?: string; version_number?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { session_id, version_number } = body;

  if (!session_id || !version_number) {
    return NextResponse.json(
      { error: "session_id and version_number are required" },
      { status: 400 }
    );
  }

  // Fetch the session to verify ownership and get current version number
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, current_version, campaign_id")
    .eq("id", session_id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 }
    );
  }

  // Verify the user is the DM for this campaign
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", session.campaign_id)
    .eq("dm_user_id", user.id)
    .single();

  if (!campaign) {
    return NextResponse.json(
      { error: "Access denied" },
      { status: 403 }
    );
  }

  // Fetch the version to restore
  const { data: versionToRestore, error: versionError } = await supabase
    .from("session_versions")
    .select("content, raw_markdown")
    .eq("session_id", session_id)
    .eq("version_number", version_number)
    .single();

  if (versionError || !versionToRestore) {
    return NextResponse.json(
      { error: "Version not found" },
      { status: 404 }
    );
  }

  // Create a new version with the old content
  const newVersionNumber = (session.current_version ?? 0) + 1;

  const { error: insertError } = await supabase
    .from("session_versions")
    .insert({
      session_id,
      version_number: newVersionNumber,
      content: versionToRestore.content,
      raw_markdown: versionToRestore.raw_markdown,
      notes: `Restored from version ${version_number}`,
    });

  if (insertError) {
    return NextResponse.json(
      { error: "Failed to create version", details: insertError.message },
      { status: 500 }
    );
  }

  // Update the session to point to the new version
  const { error: updateError } = await supabase
    .from("sessions")
    .update({
      content: versionToRestore.content,
      raw_markdown: versionToRestore.raw_markdown,
      current_version: newVersionNumber,
    })
    .eq("id", session_id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update session", details: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    version_number: newVersionNumber,
    message: `Restored version ${version_number} as new version ${newVersionNumber}`,
  });
}
