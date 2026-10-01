import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteR2Objects, headR2Object } from "@/lib/r2-upload-server";
import { musicalKey } from "@/lib/uploadConfig";

const MAX_AUDIO_SIZE = 100 * 1024 * 1024;

const MAX_COVER_SIZE = 10 * 1024 * 1024;

const MAX_STEM_SIZE = 1024 * 1024 * 1024;

const AUDIO_CONTENT_TYPES = new Set([
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
]);

const STEM_CONTENT_TYPES = new Set([
  "application/zip",
  "application/vnd.rar",
  "application/x-rar-compressed",
  "application/octet-stream",
]);

function isValidAudioUploadKey(
  key: string,
  producerId: string,
  uploadId: string,
) {
  return (
    key === `masters/${producerId}/${uploadId}/master.mp3` ||
    key === `masters/${producerId}/${uploadId}/master.wav` ||
    key === `masters/${producerId}/${uploadId}/master.flac`
  );
}

function isValidStemUploadKey(
  key: string,
  producerId: string,
  uploadId: string,
) {
  return (
    key === `stems/${producerId}/${uploadId}/stems.zip` ||
    key === `stems/${producerId}/${uploadId}/stems.rar`
  );
}

export async function POST(request: Request) {
  let audioKey: string | null = null;

  let coverKey: string | null = null;

  let stemsKey: string | null = null;

  let createdBeatId: string | null = null;

  try {
    const supabase = await createClient();

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

    const { data: profile, error: profileError } = await supabase
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
          error: "Only producers can create beats.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    const uploadId =
      typeof body.uploadId === "string" ? body.uploadId.trim() : "";

    const title = typeof body.title === "string" ? body.title.trim() : "";

    const bpm = Number(body.bpm);

    const key = typeof body.key === "string" ? body.key.trim() : "";

    const genre = typeof body.genre === "string" ? body.genre.trim() : "";

    audioKey = typeof body.audioKey === "string" ? body.audioKey.trim() : null;

    coverKey = typeof body.coverKey === "string" ? body.coverKey.trim() : null;

    stemsKey =
      typeof body.stemsKey === "string" && body.stemsKey.trim() !== ""
        ? body.stemsKey.trim()
        : null;
    const aiAnalysisEnabled =
      typeof body.aiAnalysisEnabled === "boolean"
        ? body.aiAnalysisEnabled
        : true;
    if (!uploadId) {
      return NextResponse.json(
        {
          success: false,
          error: "Upload ID is required.",
        },
        { status: 400 },
      );
    }

    if (!title || title.length > 150) {
      return NextResponse.json(
        {
          success: false,
          error: "Title is required and must be 150 characters or less.",
        },
        { status: 400 },
      );
    }

    if (!Number.isInteger(bpm) || bpm < 50 || bpm > 250) {
      return NextResponse.json(
        {
          success: false,
          error: "BPM must be an integer between 50 and 250.",
        },
        { status: 400 },
      );
    }

    if (!musicalKey.includes(key)) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid musical key is required.",
        },
        { status: 400 },
      );
    }

    if (!genre || genre.length > 80) {
      return NextResponse.json(
        {
          success: false,
          error: "Genre is required and must be 80 characters or less.",
        },
        { status: 400 },
      );
    }

    if (
      !audioKey ||
      !coverKey ||
      !isValidAudioUploadKey(audioKey, user.id, uploadId) ||
      coverKey !== `covers/${user.id}/${uploadId}/cover.jpg`
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid upload keys.",
        },
        { status: 400 },
      );
    }

    if (stemsKey && !isValidStemUploadKey(stemsKey, user.id, uploadId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Stem Pack key.",
        },
        { status: 400 },
      );
    }

    // ------------------------------------------------------
    // Idempotency
    // ------------------------------------------------------

    const { data: existingBeat, error: existingBeatError } = await supabase
      .from("beats")
      .select("id")
      .eq("upload_id", uploadId)
      .maybeSingle();

    if (existingBeatError) {
      throw new Error(existingBeatError.message);
    }

    if (existingBeat) {
      return NextResponse.json({
        success: true,
        alreadyFinalized: true,
        beatId: existingBeat.id,
      });
    }

    // ------------------------------------------------------
    // Verify R2 objects
    // ------------------------------------------------------

    const objectChecks = await Promise.all([
      headR2Object(audioKey),
      headR2Object(coverKey),
      stemsKey ? headR2Object(stemsKey) : Promise.resolve(null),
    ]);

    const audioObject = objectChecks[0];

    const coverObject = objectChecks[1];

    const stemObject = objectChecks[2];

    const audioSize = Number(audioObject.ContentLength ?? 0);

    const coverSize = Number(coverObject.ContentLength ?? 0);

    const stemSize = stemObject ? Number(stemObject.ContentLength ?? 0) : 0;

    const audioType = (audioObject.ContentType ?? "").toLowerCase();

    const coverType = (coverObject.ContentType ?? "").toLowerCase();

    const stemType = stemObject
      ? (stemObject.ContentType ?? "").toLowerCase()
      : "";

    if (audioSize <= 0 || audioSize > MAX_AUDIO_SIZE) {
      throw new Error("Uploaded audio size is invalid.");
    }

    if (coverSize <= 0 || coverSize > MAX_COVER_SIZE) {
      throw new Error("Uploaded cover size is invalid.");
    }

    if (!AUDIO_CONTENT_TYPES.has(audioType)) {
      throw new Error("Uploaded audio content type is invalid.");
    }

    if (coverType !== "image/jpeg") {
      throw new Error("Uploaded cover must be a JPEG.");
    }

    if (stemsKey) {
      if (!stemObject) {
        throw new Error("Stem Pack could not be found.");
      }

      if (stemSize <= 0 || stemSize > MAX_STEM_SIZE) {
        throw new Error("Uploaded Stem Pack size is invalid.");
      }

      if (!STEM_CONTENT_TYPES.has(stemType)) {
        throw new Error("Uploaded Stem Pack content type is invalid.");
      }
    }

    // ------------------------------------------------------
    // Create DB record
    // ------------------------------------------------------

    const { data: beat, error: insertError } = await supabase
      .from("beats")
      .insert({
        upload_id: uploadId,
        title,
        bpm,
        key,
        genre,
        audio_url: null,
        cover_url: null,
        audio_key: audioKey,
        cover_key: coverKey,
        stems_key: stemsKey,
        stems_file_name: stemsKey
          ? stemsKey.endsWith(".rar")
            ? "stems.rar"
            : "stems.zip"
          : null,
        stems_content_type: stemsKey ? stemType : null,
        stems_file_size: stemsKey ? stemSize : null,
        producer_id: user.id,

        ai_analysis_enabled: aiAnalysisEnabled,

        analysis_status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !beat) {
      throw new Error(insertError?.message || "Failed to create beat record.");
    }

    createdBeatId = beat.id;

    // ------------------------------------------------------
    // Create default licenses
    // ------------------------------------------------------

    const defaultLicenses = [
      {
        beat_id: beat.id,
        license_type: "Basic",
        price: 10,
        currency: "USD",
        is_active: true,
        includes_stems: false,
      },
      {
        beat_id: beat.id,
        license_type: "Premium",
        price: 25,
        currency: "USD",
        is_active: true,
        includes_stems: Boolean(stemsKey),
      },
      {
        beat_id: beat.id,
        license_type: "Exclusive",
        price: 50,
        currency: "USD",
        is_active: true,
        includes_stems: Boolean(stemsKey),
      },
    ];

    const { error: licenseInsertError } = await supabase
      .from("beat_licenses")
      .insert(defaultLicenses);

    if (licenseInsertError) {
      throw new Error(
        `Failed to create default licenses: ${licenseInsertError.message}`,
      );
    }

    return NextResponse.json({
      success: true,
      alreadyFinalized: false,
      beatId: beat.id,
    });
  } catch (error) {
    console.error("R2 finalize error:", error);

    if (createdBeatId) {
      try {
        const cleanupSupabase = await createClient();

        const { error: deleteBeatError } = await cleanupSupabase
          .from("beats")
          .delete()
          .eq("id", createdBeatId);

        if (deleteBeatError) {
          console.error(
            "Failed to clean up beat after finalize error:",
            deleteBeatError.message,
          );
        }
      } catch (cleanupError) {
        console.error("Failed to initialize beat cleanup:", cleanupError);
      }
    }

    if (audioKey || coverKey || stemsKey) {
      await deleteR2Objects(
        [audioKey, coverKey, stemsKey].filter((value): value is string =>
          Boolean(value),
        ),
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to finalize beat upload.",
      },
      { status: 500 },
    );
  }
}
