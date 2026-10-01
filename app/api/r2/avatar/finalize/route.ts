import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { deleteR2Object, headR2Object } from "@/lib/r2-upload-server";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

export async function POST(request: Request) {
  let newKey: string | null = null;

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
      .select("role, avatar_key")
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

    const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!publicBase || !supabaseUrl || !serviceRoleKey) {
      console.error("Avatar finalize: missing env vars");

      return NextResponse.json(
        { success: false, error: "Server is not configured correctly." },
        { status: 500 },
      );
    }

    const body = await request.json().catch(() => null);

    const key = typeof body?.key === "string" ? body.key.trim() : "";

    // The key must belong to THIS user (prevents pointing your avatar at someone else's file).
    const keyPattern = new RegExp(`^avatars/${user.id}/[0-9a-f-]{36}\\.jpg$`);

    if (!keyPattern.test(key)) {
      return NextResponse.json(
        { success: false, error: "Invalid avatar key." },
        { status: 400 },
      );
    }

    newKey = key;

    // Verify what actually landed in R2 (the presign step can't enforce size).
    let size = 0;
    let type = "";

    try {
      const head = await headR2Object(key);
      size = Number(head.ContentLength ?? 0);
      type = (head.ContentType ?? "").toLowerCase();
    } catch {
      newKey = null; // nothing to delete
      return NextResponse.json(
        { success: false, error: "Uploaded file was not found." },
        { status: 400 },
      );
    }

    if (size <= 0 || size > MAX_AVATAR_SIZE || type !== "image/jpeg") {
      await deleteR2Object(key).catch(() => {});
      newKey = null;

      return NextResponse.json(
        { success: false, error: "Uploaded file is not a valid JPEG under 2 MB." },
        { status: 400 },
      );
    }

    // Update ONLY avatar columns with the service role.
    // (So you don't need an UPDATE policy on profiles that could let users change their own `role`.)
    const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const avatarUrl = `${publicBase}/${key}`;

    const { error: updateError } = await admin
      .from("profiles")
      .update({ avatar_key: key, avatar_url: avatarUrl })
      .eq("id", user.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Success: the new key is now referenced, so don't delete it in the catch block.
    newKey = null;

    // Best-effort cleanup of the previous avatar.
    const oldKey = profile.avatar_key as string | null;

    if (oldKey && oldKey !== key && oldKey.startsWith(`avatars/${user.id}/`)) {
      await deleteR2Object(oldKey).catch((error) =>
        console.error("Failed to delete old avatar:", error),
      );
    }

    return NextResponse.json({ success: true, avatarUrl });
  } catch (error) {
    console.error("Avatar finalize error:", error);

    if (newKey) {
      await deleteR2Object(newKey).catch(() => {});
    }

    return NextResponse.json(
      { success: false, error: "Failed to save profile photo." },
      { status: 500 },
    );
  }
}
