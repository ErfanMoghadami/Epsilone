import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

type TrackerPayload = {
  event?: string;
  url?: string;
  time?: number;
  duration?: number;
  page?: string;
  session?: string;
  title?: string;
};

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const r2PublicUrl =
  process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is not configured."
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is not configured."
  );
}

const supabaseAdmin =
  createAdminClient(
    supabaseUrl,
    serviceRoleKey
  );

function getR2ObjectKey(
  url: string
): string | null {
  if (!r2PublicUrl) {
    return null;
  }

  if (!url.startsWith(`${r2PublicUrl}/`)) {
    return null;
  }

  const key = url.slice(
    r2PublicUrl.length + 1
  );

  if (!key) {
    return null;
  }

  try {
    return key
      .split("/")
      .map(decodeURIComponent)
      .join("/");
  } catch {
    return key;
  }
}

export async function POST(
  request: Request
) {
  try {
    // --------------------------------------------------------
    // 1. Read tracker event
    // --------------------------------------------------------

    const body =
      (await request.json()) as TrackerPayload;

    if (body.event !== "play") {
      return NextResponse.json({
        success: true,
        ignored: true,
      });
    }

    if (!body.url) {
      return NextResponse.json(
        {
          success: false,
          error: "url is required",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // 2. Get logged-in Supabase user
    // --------------------------------------------------------

    const supabaseServer =
      await createServerClient();

    const {
      data: { user },
    } =
      await supabaseServer.auth.getUser();

    const userId =
      user?.id ?? null;

    // --------------------------------------------------------
    // 3. Identify storage source
    // --------------------------------------------------------

    const r2ObjectKey =
      getR2ObjectKey(body.url);

    // --------------------------------------------------------
    // 4. Find Beat
    // --------------------------------------------------------

    let beat: {
      id: string;
    } | null = null;

    // --------------------------------------------------------
    // 4A. Legacy Supabase URL
    // --------------------------------------------------------

    const {
      data: legacyBeat,
      error: legacyBeatError,
    } =
      await supabaseAdmin
        .from("beats")
        .select("id")
        .eq("audio_url", body.url)
        .maybeSingle();

    if (legacyBeatError) {
      console.error(
        "Legacy beat lookup failed:",
        legacyBeatError.message
      );

      return NextResponse.json(
        {
          success: false,
          error: "Beat lookup failed",
        },
        { status: 500 }
      );
    }

    if (legacyBeat) {
      beat = legacyBeat;
    }

    // --------------------------------------------------------
    // 4B. R2 Preview URL
    // --------------------------------------------------------

    if (!beat && r2ObjectKey) {
      const {
        data: r2Beat,
        error: r2BeatError,
      } =
        await supabaseAdmin
          .from("beats")
          .select("id")
          .eq(
            "preview_key",
            r2ObjectKey
          )
          .maybeSingle();

      if (r2BeatError) {
        console.error(
          "R2 beat lookup failed:",
          r2BeatError.message
        );

        return NextResponse.json(
          {
            success: false,
            error: "Beat lookup failed",
          },
          { status: 500 }
        );
      }

      if (r2Beat) {
        beat = r2Beat;
      }
    }

    // --------------------------------------------------------
    // 4C. Legacy preview_url fallback
    // --------------------------------------------------------

    if (!beat) {
      const {
        data: previewBeat,
        error: previewBeatError,
      } =
        await supabaseAdmin
          .from("beats")
          .select("id")
          .eq(
            "preview_url",
            body.url
          )
          .maybeSingle();

      if (previewBeatError) {
        console.error(
          "Preview URL lookup failed:",
          previewBeatError.message
        );

        return NextResponse.json(
          {
            success: false,
            error: "Beat lookup failed",
          },
          { status: 500 }
        );
      }

      if (previewBeat) {
        beat = previewBeat;
      }
    }

    if (!beat) {
      return NextResponse.json(
        {
          success: false,
          error: "Beat not found",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------------
    // 5. Store play event
    // --------------------------------------------------------

    const {
      error: insertError,
    } = await supabaseAdmin
      .from("recommendation_events")
      .insert({
        beat_id: beat.id,
        user_id: userId,
        request_id:
          crypto.randomUUID(),
        event_type: "played",
        position: null,
        match_score: null,
      });

    if (insertError) {
      console.error(
        "Play analytics insert failed:",
        insertError.message
      );

      return NextResponse.json(
        {
          success: false,
          error: "Analytics insert failed",
        },
        { status: 500 }
      );
    }

    console.log(
      `Play tracked: beat=${beat.id}, user=${
        userId ?? "anonymous"
      }, source=${
        r2ObjectKey
          ? `r2:${r2ObjectKey}`
          : "legacy"
      }`
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Play analytics error:",
      error
    );

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