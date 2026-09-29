import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getR2SignedUrl } from "@/lib/r2";

type DownloadRouteProps = {
  params: Promise<{
    beatId: string;
  }>;
};

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .trim();
}

function getExtensionFromKey(key: string): string {
  const dotIndex = key.lastIndexOf(".");

  if (dotIndex === -1) {
    return "";
  }

  return key.slice(dotIndex).toLowerCase();
}

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

    const requestUrl = new URL(request.url);
    const downloadType =
      requestUrl.searchParams.get("type") === "stems"
        ? "stems"
        : "master";

    const supabase = await createClient();

    // ---------------------------------------------------------
    // 1. Get authenticated user
    // ---------------------------------------------------------

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
    // 2. Find paid orders belonging to current user
    // ---------------------------------------------------------

    const { data: paidOrders, error: paidOrdersError } =
      await supabase
        .from("orders")
        .select("id")
        .eq("buyer_id", user.id)
        .eq("status", "paid");

    if (paidOrdersError) {
      console.error(
        "Failed to load paid orders:",
        paidOrdersError,
      );

      return NextResponse.json(
        { error: "Failed to verify purchase" },
        { status: 500 },
      );
    }

    if (!paidOrders || paidOrders.length === 0) {
      return NextResponse.json(
        { error: "You have not purchased this beat" },
        { status: 403 },
      );
    }

    const paidOrderIds = paidOrders.map(
      (order) => order.id,
    );

    // ---------------------------------------------------------
    // 3. Verify purchase and Stem entitlement
    // ---------------------------------------------------------

    let orderItemsQuery = supabase
      .from("order_items")
      .select(
        `
          id,
          order_id,
          beat_id,
          includes_stems
        `,
      )
      .eq("beat_id", beatId)
      .in("order_id", paidOrderIds);

    if (downloadType === "stems") {
      orderItemsQuery = orderItemsQuery.eq(
        "includes_stems",
        true,
      );
    }

    const {
      data: orderItems,
      error: orderItemsError,
    } = await orderItemsQuery;

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
      if (downloadType === "stems") {
        return NextResponse.json(
          {
            error:
              "Your purchase does not include the Stem Pack.",
          },
          { status: 403 },
        );
      }

      return NextResponse.json(
        { error: "You have not purchased this beat" },
        { status: 403 },
      );
    }

    // ---------------------------------------------------------
    // 4. Get beat storage information
    // ---------------------------------------------------------

    const { data: beat, error: beatError } = await supabase
      .from("beats")
      .select(
        `
          id,
          title,
          audio_key,
          audio_url,
          stems_key,
          stems_file_name
        `,
      )
      .eq("id", beatId)
      .single();

    if (beatError || !beat) {
      return NextResponse.json(
        { error: "Beat not found" },
        { status: 404 },
      );
    }

    // ---------------------------------------------------------
    // 5. Stem download
    // ---------------------------------------------------------

    if (downloadType === "stems") {
      if (!beat.stems_key) {
        return NextResponse.json(
          {
            error: "Stem Pack is no longer available.",
          },
          { status: 404 },
        );
      }

      const fallbackStemFilename =
        `epsilone-stems${getExtensionFromKey(
          beat.stems_key,
        )}`;

      const safeStemFilename =
        sanitizeFilename(
          beat.stems_file_name ||
            fallbackStemFilename,
        ) || fallbackStemFilename;

      const signedUrl = await getR2SignedUrl(
        beat.stems_key,
        300,
        safeStemFilename,
      );

      return NextResponse.redirect(signedUrl);
    }

    // ---------------------------------------------------------
    // 6. Master download
    // ---------------------------------------------------------

    if (beat.audio_key) {
      const extension =
        getExtensionFromKey(beat.audio_key) || ".mp3";

      const safeTitle = sanitizeFilename(
        beat.title ?? "epsilone-beat",
      );

      const filename =
        `${safeTitle || "epsilone-beat"}${extension}`;

      const signedUrl = await getR2SignedUrl(
        beat.audio_key,
        300,
        filename,
      );

      return NextResponse.redirect(signedUrl);
    }

    // ---------------------------------------------------------
    // 7. Legacy Supabase Storage master
    // ---------------------------------------------------------

    if (beat.audio_url) {
      return NextResponse.redirect(beat.audio_url);
    }

    // ---------------------------------------------------------
    // 8. No master file
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