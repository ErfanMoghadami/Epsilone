import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteR2Object } from "@/lib/r2-upload-server";

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

    const beatId =
      typeof body.beatId === "string"
        ? body.beatId.trim()
        : "";

    if (!beatId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Beat ID is required.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // Get current Stem + verify ownership
    // --------------------------------------------------

    const {
      data: beat,
      error: beatError,
    } =
      await supabase
        .from("beats")
        .select("id, stems_key")
        .eq("id", beatId)
        .eq("producer_id", user.id)
        .single();

    if (beatError || !beat) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Beat not found or you do not have access to it.",
        },
        { status: 404 },
      );
    }

    const oldStemKey =
      beat.stems_key;

    // --------------------------------------------------
    // Remove DB reference
    // --------------------------------------------------

    const {
      error: updateError,
    } =
      await supabase
        .from("beats")
        .update({
          stems_key: null,
          stems_file_name: null,
          stems_content_type: null,
          stems_file_size: null,
        })
        .eq("id", beatId)
        .eq("producer_id", user.id);

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          error:
            updateError.message,
        },
        { status: 500 },
      );
    }

    // --------------------------------------------------
    // Delete R2 object
    // --------------------------------------------------

    if (oldStemKey) {
      try {
        await deleteR2Object(
          oldStemKey,
        );
      } catch (deleteError) {
        console.error(
          "Failed to delete Stem Pack from R2:",
          deleteError,
        );
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Stem remove error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove Stem Pack.",
      },
      { status: 500 },
    );
  }
}