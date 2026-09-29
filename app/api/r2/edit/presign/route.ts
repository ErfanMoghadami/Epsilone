import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createR2PresignedPutUrl } from "@/lib/r2-upload-server";

const MAX_AUDIO_SIZE = 100 * 1024 * 1024;
const MAX_COVER_SIZE = 10 * 1024 * 1024;

const AUDIO_TYPES = new Map([
  [".mp3", "audio/mpeg"],
  [".wav", "audio/wav"],
  [".flac", "audio/flac"],
]);

const COVER_TYPES = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
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
    // PRODUCER CHECK
    // --------------------------------------------------

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

    const fileType =
      body.fileType === "audio" ||
      body.fileType === "cover"
        ? body.fileType
        : null;

    const fileName =
      typeof body.fileName === "string"
        ? body.fileName.trim()
        : "";

    const contentType =
      typeof body.contentType === "string"
        ? body.contentType.trim().toLowerCase()
        : "";

    const fileSize = getNumber(body.fileSize);

    if (!beatId) {
      return NextResponse.json(
        {
          success: false,
          error: "Beat ID is required.",
        },
        { status: 400 },
      );
    }

    if (!fileType) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type.",
        },
        { status: 400 },
      );
    }

    if (!fileName) {
      return NextResponse.json(
        {
          success: false,
          error: "File name is required.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // VERIFY BEAT OWNERSHIP
    // --------------------------------------------------

    const { data: beat, error: beatError } = await supabase
      .from("beats")
      .select("id")
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
    // AUDIO
    // --------------------------------------------------

    if (fileType === "audio") {
      const extension = getExtension(fileName);
      const expectedType = AUDIO_TYPES.get(extension);

      if (!expectedType) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Only MP3, WAV, and FLAC audio files are supported.",
          },
          { status: 400 },
        );
      }

      if (
        contentType &&
        contentType !== expectedType &&
        !(
          expectedType === "audio/wav" &&
          contentType === "audio/x-wav"
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

      if (
        fileSize === null ||
        fileSize < 1 ||
        fileSize > MAX_AUDIO_SIZE
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Audio file must be between 1 byte and 100 MB.",
          },
          { status: 400 },
        );
      }

      const uploadId = randomUUID();

      const key =
        `masters/${user.id}/${uploadId}/master${extension}`;

      const uploadUrl = await createR2PresignedPutUrl(
        key,
        expectedType,
      );

      return NextResponse.json({
        success: true,
        uploadId,
        fileType: "audio",
        key,
        uploadUrl,
        contentType: expectedType,
      });
    }

    // --------------------------------------------------
    // COVER
    // --------------------------------------------------

    const extension = getExtension(fileName);
    const expectedType = COVER_TYPES.get(extension);

    if (!expectedType) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only JPG, JPEG, and PNG cover images are supported.",
        },
        { status: 400 },
      );
    }

    if (
      contentType &&
      contentType !== expectedType
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cover file type does not match its extension.",
        },
        { status: 400 },
      );
    }

    if (
      fileSize === null ||
      fileSize < 1 ||
      fileSize > MAX_COVER_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Cover file must be between 1 byte and 10 MB.",
        },
        { status: 400 },
      );
    }

    const uploadId = randomUUID();

    const key =
      `covers/${user.id}/${uploadId}/cover${extension}`;

    const uploadUrl = await createR2PresignedPutUrl(
      key,
      expectedType,
    );

    return NextResponse.json({
      success: true,
      uploadId,
      fileType: "cover",
      key,
      uploadUrl,
      contentType: expectedType,
    });
  } catch (error) {
    console.error("R2 edit presign error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to prepare file replacement.",
      },
      { status: 500 },
    );
  }
}