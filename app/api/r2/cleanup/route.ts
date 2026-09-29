import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteR2Objects } from "@/lib/r2-upload-server";

export async function POST(
  request: Request,
) {
  try {
    const supabase =
      await createClient();

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You must be logged in.",
        },
        { status: 401 },
      );
    }

    const body =
      await request.json();

    const uploadId =
      typeof body.uploadId ===
      "string"
        ? body.uploadId.trim()
        : "";

    if (!uploadId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Upload ID is required.",
        },
        { status: 400 },
      );
    }

    const keys = [
      `masters/${user.id}/${uploadId}/master.mp3`,
      `masters/${user.id}/${uploadId}/master.wav`,
      `masters/${user.id}/${uploadId}/master.flac`,
      `covers/${user.id}/${uploadId}/cover.jpg`,
      `stems/${user.id}/${uploadId}/stems.zip`,
      `stems/${user.id}/${uploadId}/stems.rar`,
    ];

    await deleteR2Objects(keys);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "R2 cleanup error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to clean up upload.",
      },
      { status: 500 },
    );
  }
}