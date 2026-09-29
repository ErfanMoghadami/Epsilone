import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  deleteR2Objects,
  headR2Object,
} from "@/lib/r2-upload-server";

const MAX_AUDIO_SIZE = 100 * 1024 * 1024;
const MAX_COVER_SIZE = 10 * 1024 * 1024;

const AUDIO_CONTENT_TYPES = new Set([
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
]);

const COVER_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
]);

function getExtension(key: string): string {
  const dotIndex = key.lastIndexOf(".");

  if (dotIndex === -1) {
    return "";
  }

  return key.slice(dotIndex).toLowerCase();
}

function isValidAudioKey(
  key: string,
  producerId: string,
  uploadId: string,
): boolean {
  return (
    key ===
      `masters/${producerId}/${uploadId}/master.mp3` ||
    key ===
      `masters/${producerId}/${uploadId}/master.wav` ||
    key ===
      `masters/${producerId}/${uploadId}/master.flac`
  );
}

function isValidCoverKey(
  key: string,
  producerId: string,
  uploadId: string,
): boolean {
  return (
    key ===
      `covers/${producerId}/${uploadId}/cover.jpg` ||
    key ===
      `covers/${producerId}/${uploadId}/cover.jpeg` ||
    key ===
      `covers/${producerId}/${uploadId}/cover.png`
  );
}

export async function POST(request: Request) {
  let newKey: string | null = null;

  try {
    const supabase = await createClient();

    // --------------------------------------------------
    // AUTH
    // --------------------------------------------------

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in.",
        },
        { status: 401 },
      );
    }

    // --------------------------------------------------
    // PRODUCER CHECK
    // --------------------------------------------------

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not verify your account.",
        },
        { status: 500 },
      );
    }

    if (!profile || profile.role !== "producer") {
      return NextResponse.json(
        {
          success: false,
          error: "Only producers can edit beats.",
        },
        { status: 403 },
      );
    }

    // --------------------------------------------------
    // BODY
    // --------------------------------------------------

    const body = await request.json();

    const beatId =
      typeof body.beatId === "string"
        ? body.beatId.trim()
        : "";

    const uploadId =
      typeof body.uploadId === "string"
        ? body.uploadId.trim()
        : "";

    const fileType =
      body.fileType === "audio" ||
      body.fileType === "cover"
        ? body.fileType
        : null;

    const key =
      typeof body.key === "string"
        ? body.key.trim()
        : "";

    if (!beatId || !uploadId || !fileType || !key) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid edit upload request.",
        },
        { status: 400 },
      );
    }

    newKey = key;

    // --------------------------------------------------
    // VERIFY BEAT
    // --------------------------------------------------

    const { data: beat, error: beatError } = await supabase
      .from("beats")
      .select(
        `
          id,
          title,
          audio_key,
          cover_key
        `,
      )
      .eq("id", beatId)
      .eq("producer_id", user.id)
      .single();

    if (beatError || !beat) {
      return NextResponse.json(
        {
          success: false,
          error: "Beat not found or you do not have access to it.",
        },
        { status: 404 },
      );
    }

    // --------------------------------------------------
    // VALIDATE KEY
    // --------------------------------------------------

    if (fileType === "audio") {
      if (
        !isValidAudioKey(
          key,
          user.id,
          uploadId,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid audio upload key.",
          },
          { status: 400 },
        );
      }
    } else {
      if (
        !isValidCoverKey(
          key,
          user.id,
          uploadId,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid cover upload key.",
          },
          { status: 400 },
        );
      }
    }

    // --------------------------------------------------
    // VERIFY R2 OBJECT
    // --------------------------------------------------

    const object = await headR2Object(key);

    const size = Number(
      object.ContentLength ?? 0,
    );

    const contentType =
      (
        object.ContentType ?? ""
      ).toLowerCase();

    if (size <= 0) {
      throw new Error("Uploaded file is empty.");
    }

    if (fileType === "audio") {
      if (size > MAX_AUDIO_SIZE) {
        throw new Error(
          "Uploaded audio file is too large.",
        );
      }

      if (!AUDIO_CONTENT_TYPES.has(contentType)) {
        throw new Error(
          "Uploaded audio content type is invalid.",
        );
      }
    } else {
      if (size > MAX_COVER_SIZE) {
        throw new Error(
          "Uploaded cover file is too large.",
        );
      }

      if (!COVER_CONTENT_TYPES.has(contentType)) {
        throw new Error(
          "Uploaded cover content type is invalid.",
        );
      }
    }

    // --------------------------------------------------
    // UPDATE DATABASE
    // --------------------------------------------------

    const updateData =
      fileType === "audio"
        ? {
            audio_key: key,
            audio_url: null,
            preview_key: null,
            preview_url: null,
            analysis_status: "pending",
            analysis_error: null,
            analyzed_at: null,
          }
        : {
            cover_key: key,
            cover_url: null,
          };

    const {
      data: updatedBeat,
      error: updateError,
    } = await supabase
      .from("beats")
      .update(updateData)
      .eq("id", beatId)
      .eq("producer_id", user.id)
      .select(
        `
          id,
          title,
          bpm,
          key,
          genre,
          audio_key,
          cover_key,
          stems_key,
          stems_file_name,
          stems_content_type,
          stems_file_size,
          analysis_status,
          analysis_error,
          analyzed_at
        `,
      )
      .single();

    if (updateError || !updatedBeat) {
      throw new Error(
        updateError?.message ||
          "Failed to update beat.",
      );
    }

    // --------------------------------------------------
    // DELETE OLD R2 OBJECT
    // --------------------------------------------------

    const oldKey =
      fileType === "audio"
        ? beat.audio_key
        : beat.cover_key;

    if (
      oldKey &&
      oldKey !== key
    ) {
      try {
        await deleteR2Objects([oldKey]);
      } catch (deleteError) {
        console.error(
          "Failed to delete old R2 object:",
          deleteError,
        );
      }
    }

    return NextResponse.json({
      success: true,
      beat: updatedBeat,
    });
  } catch (error) {
    console.error(
      "R2 edit finalize error:",
      error,
    );

    if (newKey) {
      try {
        await deleteR2Objects([newKey]);
      } catch (cleanupError) {
        console.error(
          "Failed to clean up new R2 object:",
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
            : "Failed to replace beat file.",
      },
      { status: 500 },
    );
  }
}