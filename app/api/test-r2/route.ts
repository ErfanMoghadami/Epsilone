import { NextResponse } from "next/server";
import {
  deleteFromR2,
  getR2Object,
  uploadToR2,
} from "@/lib/r2";
import { randomUUID } from "node:crypto";

export async function GET() {
  const key = `tests/${randomUUID()}.txt`;

  const testContent =
    "Epsilone R2 connection test successful.";

  try {
    // --------------------------------------------------------
    // 1. Upload
    // --------------------------------------------------------

    await uploadToR2(
      key,
      Buffer.from(testContent, "utf-8"),
      "text/plain"
    );

    // --------------------------------------------------------
    // 2. Read
    // --------------------------------------------------------

    const response =
      await getR2Object(key);

    if (!response.Body) {
      throw new Error(
        "R2 returned an empty response."
      );
    }

    const downloaded =
      await response.Body.transformToString();

    // --------------------------------------------------------
    // 3. Delete
    // --------------------------------------------------------

    await deleteFromR2(key);

    // --------------------------------------------------------
    // 4. Verify
    // --------------------------------------------------------

    if (downloaded !== testContent) {
      throw new Error(
        "Uploaded and downloaded content do not match."
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "R2 Upload → Read → Delete test passed.",
    });
  } catch (error) {
    console.error(
      "R2 test failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown R2 error.",
      },
      {
        status: 500,
      }
    );
  }
}