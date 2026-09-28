import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  deleteR2Objects,
  headR2Object,
} from "@/lib/r2-upload-server";

const MAX_AUDIO_SIZE = 500 * 1024 * 1024;
const MAX_COVER_SIZE = 10 * 1024 * 1024;

const AUDIO_CONTENT_TYPES = new Set([
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
]);

function isValidUploadKey(
  key: string,
  producerId: string,
  uploadId: string,
) {
  return (
    key ===
      `masters/${producerId}/${uploadId}/master.mp3` ||
    key ===
      `masters/${producerId}/${uploadId}/master.wav` ||
    key ===
      `masters/${producerId}/${uploadId}/master.flac`
  );
}

export async function POST(request: Request) {
  let audioKey: string | null = null;
  let coverKey: string | null = null;

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

    const title =
      typeof body.title === "string" ? body.title.trim() : "";

    const bpm = Number(body.bpm);

    const key =
      typeof body.key === "string" ? body.key.trim() : "";

    const genre =
      typeof body.genre === "string" ? body.genre.trim() : "";

    audioKey =
      typeof body.audioKey === "string"
        ? body.audioKey.trim()
        : null;

    coverKey =
      typeof body.coverKey === "string"
        ? body.coverKey.trim()
        : null;

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

    if (!Number.isInteger(bpm) || bpm < 20 || bpm > 300) {
      return NextResponse.json(
        {
          success: false,
          error: "BPM must be an integer between 20 and 300.",
        },
        { status: 400 },
      );
    }

    if (!key || key.length > 30) {
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
      !isValidUploadKey(audioKey, user.id, uploadId) ||
      coverKey !==
        `covers/${user.id}/${uploadId}/cover.jpg`
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid upload keys.",
        },
        { status: 400 },
      );
    }

    // ------------------------------------------------------
    // Idempotency
    // ------------------------------------------------------

    const { data: existingBeat, error: existingBeatError } =
      await supabase
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

    const [audioObject, coverObject] = await Promise.all([
      headR2Object(audioKey),
      headR2Object(coverKey),
    ]);

    const audioSize = Number(audioObject.ContentLength ?? 0);
    const coverSize = Number(coverObject.ContentLength ?? 0);

    const audioType = (
      audioObject.ContentType ?? ""
    ).toLowerCase();

    const coverType = (
      coverObject.ContentType ?? ""
    ).toLowerCase();

    if (
      audioSize <= 0 ||
      audioSize > MAX_AUDIO_SIZE
    ) {
      throw new Error(
        "Uploaded audio size is invalid.",
      );
    }

    if (
      coverSize <= 0 ||
      coverSize > MAX_COVER_SIZE
    ) {
      throw new Error(
        "Uploaded cover size is invalid.",
      );
    }

    if (!AUDIO_CONTENT_TYPES.has(audioType)) {
      throw new Error(
        "Uploaded audio content type is invalid.",
      );
    }

    if (coverType !== "image/jpeg") {
      throw new Error(
        "Uploaded cover must be a JPEG.",
      );
    }

    // ------------------------------------------------------
    // Create DB record
    // ------------------------------------------------------

    const { data: beat, error: insertError } =
      await supabase
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
          producer_id: user.id,
          analysis_status: "pending",
        })
        .select("id")
        .single();

    if (insertError || !beat) {
      throw new Error(
        insertError?.message ||
          "Failed to create beat record.",
      );
    }

    return NextResponse.json({
      success: true,
      alreadyFinalized: false,
      beatId: beat.id,
    });
  } catch (error) {
    console.error("R2 finalize error:", error);

    if (audioKey || coverKey) {
      await deleteR2Objects(
        [audioKey, coverKey].filter(
          (value): value is string => Boolean(value),
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