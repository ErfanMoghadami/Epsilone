import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createR2PresignedPutUrl } from "@/lib/r2-upload-server";

const MAX_STEM_SIZE =
  1024 * 1024 * 1024;

const STEM_TYPES = new Map([
  [".zip", "application/zip"],
  [".rar", "application/vnd.rar"],
]);

function getExtension(
  fileName: string,
): string {
  const dotIndex =
    fileName.lastIndexOf(".");

  if (dotIndex === -1) {
    return "";
  }

  return fileName
    .slice(dotIndex)
    .toLowerCase();
}

export async function POST(
  request: Request,
) {
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

    // --------------------------------------------------
    // Request
    // --------------------------------------------------

    const body =
      await request.json();

    const beatId =
      typeof body.beatId === "string"
        ? body.beatId.trim()
        : "";

    const fileName =
      typeof body.fileName === "string"
        ? body.fileName.trim()
        : "";

    const fileSize =
      typeof body.fileSize === "number"
        ? body.fileSize
        : Number(body.fileSize);

    const contentType =
      typeof body.contentType === "string"
        ? body.contentType
            .trim()
            .toLowerCase()
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

    if (!fileName) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Stem Pack file name is required.",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isFinite(fileSize) ||
      fileSize <= 0 ||
      fileSize > MAX_STEM_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Stem Pack must be between 1 byte and 1 GB.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // Verify ownership
    // --------------------------------------------------

    const {
      data: beat,
      error: beatError,
    } =
      await supabase
        .from("beats")
        .select("id")
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

    // --------------------------------------------------
    // Validate extension
    // --------------------------------------------------

    const extension =
      getExtension(fileName);

    const expectedContentType =
      STEM_TYPES.get(extension);

    if (!expectedContentType) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only ZIP and RAR files are supported.",
        },
        { status: 400 },
      );
    }

    // Browser MIME types for RAR can vary.
    if (
      contentType &&
      contentType !== expectedContentType &&
      !(
        extension === ".rar" &&
        contentType ===
          "application/x-rar-compressed"
      ) &&
      !(
        contentType ===
        "application/octet-stream"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Stem Pack content type does not match the file extension.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // Create unique R2 key
    // --------------------------------------------------

    const uploadId =
      randomUUID();

    const stemKey =
      `stems/${user.id}/${beatId}/${uploadId}${extension}`;

    // --------------------------------------------------
    // Presigned URL
    // --------------------------------------------------

    const uploadUrl =
      await createR2PresignedPutUrl(
        stemKey,
        expectedContentType,
      );

    return NextResponse.json({
      success: true,

      stem: {
        key: stemKey,
        uploadUrl,
        contentType:
          expectedContentType,
      },
    });
  } catch (error) {
    console.error(
      "Stem presign error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to prepare Stem Pack upload.",
      },
      { status: 500 },
    );
  }
}