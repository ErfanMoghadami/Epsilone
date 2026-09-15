import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const beatId = body?.beatId;

    if (!beatId) {
      return NextResponse.json(
        {
          success: false,
          error: "beatId is required",
        },
        { status: 400 }
      );
    }

    const workerUrl = process.env.VPS_WORKER_URL;
    const workerSecret = process.env.VPS_WORKER_SECRET;

    if (!workerUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "VPS_WORKER_URL is not configured",
        },
        { status: 500 }
      );
    }

    if (!workerSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "VPS_WORKER_SECRET is not configured",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${workerUrl}/analyze/${beatId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${workerSecret}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data?.error || "Worker analysis failed",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Analyze beat error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown server error",
      },
      { status: 500 }
    );
  }
}