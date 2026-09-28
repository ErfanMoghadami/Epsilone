import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getR2SignedUrl } from "@/lib/r2";

type DownloadRouteProps = {
  params: Promise<{
    beatId: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: DownloadRouteProps,
) {
  try {
    const { beatId } = await params;

    if (!beatId) {
      return NextResponse.json(
        { error: "Beat ID is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // ---------------------------------------------------------
    // 1. Find order items for this beat
    // ---------------------------------------------------------

    const { data: orderItems, error: orderItemsError } =
      await supabase
        .from("order_items")
        .select("id, order_id, beat_id")
        .eq("beat_id", beatId);

    if (orderItemsError) {
      console.error(
        "Failed to load order items:",
        orderItemsError,
      );

      return NextResponse.json(
        { error: "Failed to verify purchase" },
        { status: 500 },
      );
    }

    if (!orderItems || orderItems.length === 0) {
      return NextResponse.json(
        { error: "You have not purchased this beat" },
        { status: 403 },
      );
    }

    const orderIds = orderItems.map((item) => item.order_id);

    // ---------------------------------------------------------
    // 2. Verify paid order belongs to current user
    // ---------------------------------------------------------

    const { data: paidOrder, error: paidOrderError } =
      await supabase
        .from("orders")
        .select("id, buyer_id, status")
        .in("id", orderIds)
        .eq("buyer_id", user.id)
        .eq("status", "paid")
        .limit(1)
        .maybeSingle();

    if (paidOrderError) {
      console.error(
        "Failed to verify paid order:",
        paidOrderError,
      );

      return NextResponse.json(
        { error: "Failed to verify purchase" },
        { status: 500 },
      );
    }

    if (!paidOrder) {
      return NextResponse.json(
        { error: "You have not purchased this beat" },
        { status: 403 },
      );
    }

    // ---------------------------------------------------------
    // 3. Get beat storage information
    // ---------------------------------------------------------

    const { data: beat, error: beatError } = await supabase
      .from("beats")
      .select("id, title, audio_key, audio_url")
      .eq("id", beatId)
      .single();

    if (beatError || !beat) {
      return NextResponse.json(
        { error: "Beat not found" },
        { status: 404 },
      );
    }

    // ---------------------------------------------------------
    // 4. New R2 beats
    // ---------------------------------------------------------

    if (beat.audio_key) {
      const safeTitle = (beat.title ?? "epsilone-beat")
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
        .trim();
    
      const filename = `${safeTitle || "epsilone-beat"}.mp3`;
    
      const signedUrl = await getR2SignedUrl(
        beat.audio_key,
        300,
        filename,
      );
    
      return NextResponse.redirect(signedUrl);
    }

    // ---------------------------------------------------------
    // 5. Legacy Supabase Storage beats
    // ---------------------------------------------------------

    if (beat.audio_url) {
      return NextResponse.redirect(beat.audio_url);
    }

    // ---------------------------------------------------------
    // 6. No master file
    // ---------------------------------------------------------

    return NextResponse.json(
      { error: "Master audio file is not available" },
      { status: 404 },
    );
  } catch (error) {
    console.error("Download API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}