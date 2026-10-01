import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "You must be logged in." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    const beatId = typeof body?.beatId === "string" ? body.beatId.trim() : "";

    if (!beatId) {
      return NextResponse.json(
        { success: false, error: "beatId is required" },
        { status: 400 },
      );
    }

    // فقط صاحب beat اجازه داره
    const { data: beat } = await supabase
      .from("beats")
      .select("id")
      .eq("id", beatId)
      .eq("producer_id", user.id)
      .maybeSingle();

    if (!beat) {
      return NextResponse.json(
        { success: false, error: "Beat not found" },
        { status: 404 },
      );
    }

    const workerUrl = process.env.VPS_WORKER_URL;
    const workerSecret = process.env.VPS_WORKER_SECRET;

    if (!workerUrl || !workerSecret) {
      console.error("Analyze beat: worker env vars missing");
      return NextResponse.json(
        { success: false, error: "Analysis is not configured." },
        { status: 500 },
      );
    }

    const response = await fetch(
      `${workerUrl}/analyze/${encodeURIComponent(beat.id)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${workerSecret}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data?.error || "Worker analysis failed" },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Analyze beat error:", error);
    return NextResponse.json(
      { success: false, error: "Analysis failed." },
      { status: 500 },
    );
  }
}