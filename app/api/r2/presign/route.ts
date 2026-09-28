import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createR2PresignedPutUrl } from "@/lib/r2-upload-server";

const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_COVER_SIZE = 10 * 1024 * 1024; // 10 MB

const AUDIO_TYPES = new Map([
  [".mp3", "audio/mpeg"],
  [".wav", "audio/wav"],
  [".flac", "audio/flac"],
]);

function getExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex === -1) {
    return "";
  }

  return fileName.slice(dotIndex).toLowerCase();
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export async function POST(request: Request) {
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
    // PRODUCER ROLE CHECK
    // --------------------------------------------------

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Producer profile lookup error:", profileError);

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
          error: "Only producers can upload beats.",
        },
        { status: 403 },
      );
    }

    // --------------------------------------------------
    // REQUEST BODY
    // --------------------------------------------------

    const body = await request.json();

    const audioFileName =
      typeof body.audioFileName === "string"
        ? body.audioFileName.trim()
        : "";

    const audioContentType =
      typeof body.audioContentType === "string"
        ? body.audioContentType.trim().toLowerCase()
        : "";

    const coverContentType =
      typeof body.coverContentType === "string"
        ? body.coverContentType.trim().toLowerCase()
        : "";

    const audioSize = getNumber(body.audioSize);
    const coverSize = getNumber(body.coverSize);

    // --------------------------------------------------
    // AUDIO VALIDATION
    // --------------------------------------------------

    if (!audioFileName) {
      return NextResponse.json(
        {
          success: false,
          error: "Audio file name is required.",
        },
        { status: 400 },
      );
    }

    const audioExtension = getExtension(audioFileName);
    const expectedAudioType = AUDIO_TYPES.get(audioExtension);

    if (!expectedAudioType) {
      return NextResponse.json(
        {
          success: false,
          error: "Only MP3, WAV, and FLAC audio files are supported.",
        },
        { status: 400 },
      );
    }

    if (
      audioContentType &&
      audioContentType !== expectedAudioType &&
      !(
        expectedAudioType === "audio/wav" &&
        audioContentType === "audio/x-wav"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Audio file type does not match its extension.",
        },
        { status: 400 },
      );
    }

    if (audioSize === null || audioSize < 1 || audioSize > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "Audio file must be between 1 byte and 100 MB.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // COVER VALIDATION
    // --------------------------------------------------

    if (
      coverContentType !== "image/jpeg" &&
      coverContentType !== "image/png"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Cover must be a JPEG or PNG image.",
        },
        { status: 400 },
      );
    }

    if (coverSize === null || coverSize < 1 || coverSize > MAX_COVER_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "Cover file must be between 1 byte and 10 MB.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // CREATE UPLOAD ID
    // --------------------------------------------------

    const uploadId = randomUUID();

    const audioKey =
      `masters/${user.id}/${uploadId}/master${audioExtension}`;

    const coverKey =
      `covers/${user.id}/${uploadId}/cover.jpg`;

    // --------------------------------------------------
    // PRESIGNED URLS
    // --------------------------------------------------

    const audioUploadUrl = await createR2PresignedPutUrl(
      audioKey,
      expectedAudioType,
    );

    const coverUploadUrl = await createR2PresignedPutUrl(
      coverKey,
      "image/jpeg",
    );

    return NextResponse.json({
      success: true,
      uploadId,
      audio: {
        key: audioKey,
        uploadUrl: audioUploadUrl,
        contentType: expectedAudioType,
      },
      cover: {
        key: coverKey,
        uploadUrl: coverUploadUrl,
        contentType: "image/jpeg",
      },
    });
  } catch (error) {
    console.error("R2 presign error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to prepare R2 upload.",
      },
      { status: 500 },
    );
  }
}
