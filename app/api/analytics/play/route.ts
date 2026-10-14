
import { randomUUID } from "node:crypto";
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

const MIN_PLAY_SECONDS = 3;
const MAX_URL_LENGTH = 2048;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const r2PublicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
}

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
}

const supabaseAdmin = createAdminClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

function getR2ObjectKey(url: string): string | null {
  if (!r2PublicUrl || !url.startsWith(`${r2PublicUrl}/`)) {
    return null;
  }

  const key = url.slice(r2PublicUrl.length + 1);

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

/**
 * Store the tracker session for diagnostics only.
 * It must NOT be used to deduplicate plays.
 */
function getTrackerSessionId(session: unknown): string | null {
  if (
    typeof session !== "string" ||
    !/^[a-zA-Z0-9_-]{6,128}$/.test(session)
  ) {
    return null;
  }

  return session;
}

export async function POST(request: Request) {
  try {
    // --------------------------------------------------------
    // 1. Validate the tracker payload
    // --------------------------------------------------------

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON payload",
        },
        { status: 400 }
      );
    }

    if (
      typeof payload !== "object" ||
      payload === null ||
      Array.isArray(payload)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid tracker payload",
        },
        { status: 400 }
      );
    }

    const body = payload as TrackerPayload;

    if (body.event !== "play") {
      return NextResponse.json({
        success: true,
        ignored: true,
      });
    }

    if (
      typeof body.url !== "string" ||
      !body.url.trim() ||
      body.url.length > MAX_URL_LENGTH
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid audio URL is required",
        },
        { status: 400 }
      );
    }

    const audioUrl = body.url.trim();

    if (
      typeof body.time !== "number" ||
      !Number.isFinite(body.time) ||
      body.time < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid playback time is required",
        },
        { status: 400 }
      );
    }

    // WaveformTracker should only send "play" after 3 seconds
    // of accumulated media-time. Do not count shorter events.
    if (body.time < MIN_PLAY_SECONDS) {
      return NextResponse.json({
        success: true,
        ignored: true,
        reason: "play_threshold_not_met",
      });
    }

    // Keep this only as metadata. Repeated plays from the same
    // session must still be inserted and counted independently.
    const trackerSessionId = getTrackerSessionId(body.session);

    // --------------------------------------------------------
    // 2. Get the logged-in Supabase user, if any
    // --------------------------------------------------------

    const supabaseServer = await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError) {
      console.error("Play analytics auth lookup failed:", authError.message);
    }

    const userId = user?.id ?? null;

    // --------------------------------------------------------
    // 3. Identify the R2 object, if applicable
    // --------------------------------------------------------

    const r2ObjectKey = getR2ObjectKey(audioUrl);

    // --------------------------------------------------------
    // 4. Find the published Beat
    // --------------------------------------------------------

    let beat: { id: string } | null = null;

    // 4A. Legacy audio_url
    const {
      data: legacyBeat,
      error: legacyBeatError,
    } = await supabaseAdmin
      .from("beats")
      .select("id")
      .eq("audio_url", audioUrl)
      .eq("is_published", true)
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

    // 4B. R2 preview_key
    if (!beat && r2ObjectKey) {
      const {
        data: r2Beat,
        error: r2BeatError,
      } = await supabaseAdmin
        .from("beats")
        .select("id")
        .eq("preview_key", r2ObjectKey)
        .eq("is_published", true)
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

    // 4C. Legacy preview_url fallback
    if (!beat) {
      const {
        data: previewBeat,
        error: previewBeatError,
      } = await supabaseAdmin
        .from("beats")
        .select("id")
        .eq("preview_url", audioUrl)
        .eq("is_published", true)
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
          error: "Published beat not found",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------------
    // 5. Insert EVERY valid play event
    // --------------------------------------------------------

    // Deliberately do not query for an existing play by user,
    // beat, or tracker session. Each valid event is a new play,
    // matching get_producer_beat_analytics().
    const { error: insertError } = await supabaseAdmin
      .from("recommendation_events")
      .insert({
        beat_id: beat.id,
        user_id: userId,
        request_id: randomUUID(),
        event_type: "played",
        position: null,
        match_score: null,
        tracker_session_id: trackerSessionId,
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
      `Play tracked: beat=${beat.id}, user=${userId ?? "anonymous"}, ` +
      `time=${body.time}, session=${trackerSessionId ?? "unavailable"}, ` +
      `source=${r2ObjectKey ? `r2:${r2ObjectKey}` : "legacy"}`
    );

    // --------------------------------------------------------
    // 6. Update the daily streak, if eligible
    // --------------------------------------------------------

    let streak: unknown = null;

    if (userId && user?.email_confirmed_at) {
      const {
        data: streakData,
        error: streakError,
      } = await supabaseAdmin.rpc("streak_register_play", {
        p_user_id: userId,
        p_beat_id: beat.id,
      });

      if (streakError) {
        // Do not fail the play event because of a streak error.
        console.error(
          "Streak register failed:",
          streakError.message
        );
      } else {
        streak = streakData;
      }
    }

    return NextResponse.json({
      success: true,
      counted: true,
      streak,
    });
  } catch (error) {
    console.error("Play analytics error:", error);

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
