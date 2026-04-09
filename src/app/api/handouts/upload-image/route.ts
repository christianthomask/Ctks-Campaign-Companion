import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const campaignId = formData.get("campaign_id") as string | null;
    const title = formData.get("title") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PNG, JPG, and WebP images are accepted" },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "Image too large (max 5MB)" },
        { status: 413 }
      );
    }

    if (!campaignId) {
      return NextResponse.json(
        { error: "campaign_id is required" },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const ext = file.name.split(".").pop() || "png";
    const storagePath = `${campaignId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("handout-images")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Failed to upload image", details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("handout-images")
      .getPublicUrl(storagePath);

    // Create handout record
    const { data: handout, error: insertError } = await supabase
      .from("handouts")
      .insert({
        campaign_id: campaignId,
        title: title || file.name.replace(/\.[^.]+$/, ""),
        content_type: "image",
        content: "",
        storage_path: urlData.publicUrl,
        file_name: file.name,
        stage: "draft",
        category: "map",
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to create handout", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      handout_id: handout?.id,
      storage_path: urlData.publicUrl,
      message: "Image uploaded successfully",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}
