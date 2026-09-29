import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  deleteR2Object,
  headR2Object,
} from "@/lib/r2-upload-server";

const MAX_STEM_SIZE =
  1024 * 1024 * 1024;

function isValidStemKey(
  key: string,
  producerId: string,
  beatId: string,
) {
  const prefix =
    `stems/${producerId}/${beatId}/`;

  if (!key.startsWith(prefix)) {
    return false;
  }

  return (
    key.endsWith(".zip") ||
    key.endsWith(".rar")
  );
}

export async function POST(
  request: Request,
) {
  let newStemKey:
    | string
    | null = null;

  try {
    const supabase =
      await createClient();

    // --------------------------------------------------
    // Auth
    // --------------------------------------------------

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

    newStemKey =
      typeof body.stemKey === "string"
        ? body.stemKey.trim()
        : null;

    const fileName =
      typeof body.fileName === "string"
        ? body.fileName.trim()
        : "";

    if (!beatId || !newStemKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Beat ID and Stem Pack key are required.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // Verify ownership + get old Stem
    // --------------------------------------------------

    const {
      data: beat,
      error: beatError,
    } =
      await supabase
        .from("beats")
        .select(
          "id, stems_key, stems_file_name, stems_content_type, stems_file_size",
        )
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

    if (
      !isValidStemKey(
        newStemKey,
        user.id,
        beatId,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid Stem Pack key.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // Verify uploaded object in R2
    // --------------------------------------------------

    const stemObject =
      await headR2Object(
        newStemKey,
      );

    const size =
      Number(
        stemObject.ContentLength ?? 0,
      );

    const contentType =
      (
        stemObject.ContentType ?? ""
      ).toLowerCase();

    if (
      size <= 0 ||
      size > MAX_STEM_SIZE
    ) {
      throw new Error(
        "Uploaded Stem Pack size is invalid.",
      );
    }

    const isZip =
      newStemKey.endsWith(
        ".zip",
      );

    const isRar =
      newStemKey.endsWith(
        ".rar",
      );

    const validContentType =
      isZip
        ? contentType ===
          "application/zip"
        : isRar &&
          (
            contentType ===
              "application/vnd.rar" ||
            contentType ===
              "application/x-rar-compressed" ||
            contentType ===
              "application/octet-stream"
          );

    if (!validContentType) {
      throw new Error(
        "Uploaded Stem Pack content type is invalid.",
      );
    }

    // --------------------------------------------------
    // Save new Stem metadata
    // --------------------------------------------------

    const {
      error: updateError,
    } =
      await supabase
        .from("beats")
        .update({
          stems_key:
            newStemKey,

          stems_file_name:
            fileName ||
            (
              isRar
                ? "stems.rar"
                : "stems.zip"
            ),

          stems_content_type:
            contentType,

          stems_file_size:
            size,
        })
        .eq("id", beatId)
        .eq("producer_id", user.id);

    if (updateError) {
      throw new Error(
        updateError.message,
      );
    }

    // --------------------------------------------------
    // Remove previous Stem
    // --------------------------------------------------

    if (
      beat.stems_key &&
      beat.stems_key !== newStemKey
    ) {
      try {
        await deleteR2Object(
          beat.stems_key,
        );
      } catch (deleteError) {
        console.error(
          "Failed to delete previous Stem Pack:",
          deleteError,
        );
      }
    }

    return NextResponse.json({
      success: true,

      stem: {
        key: newStemKey,
        fileName:
          fileName ||
          (
            isRar
              ? "stems.rar"
              : "stems.zip"
          ),
        contentType,
        size,
      },
    });
  } catch (error) {
    console.error(
      "Stem finalize error:",
      error,
    );

    if (newStemKey) {
      try {
        await deleteR2Object(
          newStemKey,
        );
      } catch (cleanupError) {
        console.error(
          "Failed to clean up Stem Pack after finalize error:",
          cleanupError,
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save Stem Pack.",
      },
      { status: 500 },
    );
  }
}