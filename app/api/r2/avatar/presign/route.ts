


import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createR2PresignedPutUrl } from "@/lib/r2-upload-server";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB (client sends a 512x512 JPEG)

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "You must be logged in." },
        { status: 401 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { success: false, error: "Could not verify your account." },
        { status: 500 },
      );
    }

    if (!profile || profile.role !== "producer") {
      return NextResponse.json(
        { success: false, error: "Only producers can upload a profile photo." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);

    const contentType =
      typeof body?.contentType === "string"
        ? body.contentType.trim().toLowerCase()
        : "";

    const size = Number(body?.size);

    if (contentType !== "image/jpeg") {
      return NextResponse.json(
        { success: false, error: "Profile photo must be a JPEG image." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(size) || size < 1 || size > MAX_AVATAR_SIZE) {
      return NextResponse.json(
        { success: false, error: "Profile photo must be between 1 byte and 2 MB." },
        { status: 400 },
      );
    }

    // Unique key per upload => no CDN/browser cache problems when the photo changes.
    const key = `avatars/${user.id}/${randomUUID()}.jpg`;

    const uploadUrl = await createR2PresignedPutUrl(key, "image/jpeg");

    return NextResponse.json({
      success: true,
      key,
      uploadUrl,
      contentType: "image/jpeg",
    });
  } catch (error) {
    console.error("Avatar presign error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to prepare avatar upload." },
      { status: 500 },
    );
  }
}
