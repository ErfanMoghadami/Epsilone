import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { createClient } from "@/lib/supabase/server";
import { getR2UploadUrl } from "@/lib/r2";

export async function POST(request: Request) {
  try {
    // --------------------------------------------------------
    // 1. Check authentication
    // --------------------------------------------------------

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
        { status: 401 }
      );
    }

    // --------------------------------------------------------
    // 2. Check producer role
    // --------------------------------------------------------

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile ||
      profile.role !== "producer"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Only producers can upload beats.",
        },
        { status: 403 }
      );
    }

    // --------------------------------------------------------
    // 3. Read request data
    // --------------------------------------------------------

    const body = await request.json();

    const audioFileName = body?.audioFileName;
    const audioContentType = body?.audioContentType;
    const coverContentType = body?.coverContentType;

    if (
      typeof audioFileName !== "string" ||
      !audioFileName.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "audioFileName is required.",
        },
        { status: 400 }
      );
    }

    if (
      typeof audioContentType !== "string" ||
      !audioContentType.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "audioContentType is required.",
        },
        { status: 400 }
      );
    }

    if (
      typeof coverContentType !== "string" ||
      !coverContentType.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "coverContentType is required.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // 4. Validate file types
    // --------------------------------------------------------

    const allowedAudioTypes = [
      "audio/mpeg",
      "audio/wav",
      "audio/x-wav",
      "audio/flac",
      "audio/x-flac",
    ];

    const allowedCoverTypes = [
      "image/jpeg",
      "image/png",
    ];

    if (
      !allowedAudioTypes.includes(
        audioContentType
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unsupported audio format. Use MP3, WAV, or FLAC.",
        },
        { status: 400 }
      );
    }

    if (
      !allowedCoverTypes.includes(
        coverContentType
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unsupported cover format. Use JPG or PNG.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // 5. Generate unique upload ID
    // --------------------------------------------------------

    const uploadId = randomUUID();

    const audioExtension =
      path.extname(audioFileName) || ".mp3";

    const audioKey =
      `masters/${user.id}/${uploadId}/master${audioExtension}`;

    const coverExtension =
      coverContentType === "image/png"
        ? ".png"
        : ".jpg";

    const coverKey =
      `covers/${user.id}/${uploadId}/cover${coverExtension}`;

    // --------------------------------------------------------
    // 6. Generate presigned URLs
    // --------------------------------------------------------

    const audioUploadUrl =
      await getR2UploadUrl(
        audioKey,
        audioContentType,
        900
      );

    const coverUploadUrl =
      await getR2UploadUrl(
        coverKey,
        coverContentType,
        900
      );

    return NextResponse.json({
      success: true,

      uploadId,

      audio: {
        key: audioKey,
        uploadUrl: audioUploadUrl,
      },

      cover: {
        key: coverKey,
        uploadUrl: coverUploadUrl,
      },
    });
  } catch (error) {
    console.error(
      "R2 presign error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate R2 upload URLs.",
      },
      { status: 500 }
    );
  }
}