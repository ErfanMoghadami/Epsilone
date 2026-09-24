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

const supabaseAdmin = createAdminClient(
  supabaseUrl,
  serviceRoleKey
);

export async function POST(request: Request) {
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
    } = await supabaseServer.auth.getUser();

    const userId = user?.id ?? null;

    // --------------------------------------------------------
    // 3. Find Beat
    // --------------------------------------------------------

    const { data: beat, error: beatError } =
      await supabaseAdmin
        .from("beats")
        .select("id")
        .eq("audio_url", body.url)
        .maybeSingle();

    if (beatError) {
      console.error(
        "Beat lookup failed:",
        beatError.message
      );

      return NextResponse.json(
        {
          success: false,
          error: "Beat lookup failed",
        },
        { status: 500 }
      );
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
    // 4. Store play event
    // --------------------------------------------------------

    const { error: insertError } =
      await supabaseAdmin
        .from("recommendation_events")
        .insert({
          beat_id: beat.id,
          user_id: userId,
          request_id: crypto.randomUUID(),
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
      `Play tracked: beat=${beat.id}, user=${userId ?? "anonymous"}`
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