
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const r2PublicUrl =
  process.env.R2_PUBLIC_URL?.replace(/\/+$/, "") ?? null;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
}

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const ALLOWED_MODES = new Set([
  "trending",
  "popular_new",
  "most_favorited",
  "most_played",
]);

type RankedBeat = {
  id: string;
  title: string | null;
  audio_url: string | null;
  preview_url: string | null;
  cover_url: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  moods: string[] | null;
  atmosphere: string[] | null;
  instruments: string[] | null;
  scenes: string[] | null;
  energy: number | null;
  semantic_tags: string[] | null;
  ai_genres: string[] | null;
  ai_subgenres: string[] | null;
  match_score: number | null;
  favorite_count: number;
  recent_favorite_count: number;
  producer_id: string | null;
  producer_username: string | null;
  producer_display_name: string | null;
  play_count: number;
  recent_play_count: number;
  trend_score: number;
  created_at: string | null;
};

type BeatAssetRow = {
  id: string;
  cover_key: string | null;
  preview_key: string | null;
  cover_url: string | null;
  preview_url: string | null;
  exclusive_sold_at: string | null;
};

function buildR2Url(
  key: string | null | undefined,
): string | null {
  if (!r2PublicUrl || !key) {
    return null;
  }

  return `${r2PublicUrl}/${key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;

    const requestedMode = (
      params.get("mode") ?? "trending"
    ).trim();

    const mode = ALLOWED_MODES.has(requestedMode)
      ? requestedMode
      : null;

    if (!mode) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid ranking mode.",
        },
        { status: 400 },
      );
    }

    const requestedLimit = Number(
      params.get("limit") ?? 24,
    );

    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 48)
      : 24;

    const days = mode === "popular_new" ? 30 : 7;

    // --------------------------------------------------------
    // 1. Load ranked beats
    // --------------------------------------------------------

    const { data, error } = await supabase.rpc(
      "get_ranked_beats",
      {
        p_mode: mode,
        p_limit: limit,
        p_producer_id: null,
        p_days: days,
      },
    );

    if (error) {
      console.error(
        "Trending ranking RPC failed:",
        error.message,
      );

      return NextResponse.json(
        {
          success: false,
          error: "Failed to load ranked beats.",
        },
        { status: 500 },
      );
    }

    const rankedBeats = (data ?? []) as RankedBeat[];
    const ids = rankedBeats.map((beat) => beat.id);

    // Start empty; populate it only after the database lookup.
    let assetById = new Map<string, BeatAssetRow>();

    // --------------------------------------------------------
    // 2. Load asset URLs and exclusive sale status
    // --------------------------------------------------------

    if (ids.length > 0) {
      const {
        data: assetRows,
        error: assetError,
      } = await supabase
        .from("beats")
        .select(
          "id, cover_key, preview_key, cover_url, preview_url, exclusive_sold_at",
        )
        .in("id", ids);

      if (assetError) {
        console.error(
          "Trending availability lookup failed:",
          assetError.message,
        );

        return NextResponse.json(
          {
            success: false,
            error: "Could not verify beat availability.",
          },
          { status: 500 },
        );
      }

      const assets = (assetRows ?? []) as BeatAssetRow[];

      assetById = new Map<string, BeatAssetRow>(
        assets.map(
          (asset): [string, BeatAssetRow] => [
            asset.id,
            asset,
          ],
        ),
      );
    }

    // --------------------------------------------------------
    // 3. Hide exclusively sold beats and resolve asset URLs
    // --------------------------------------------------------
    // If a beat's availability could not be confirmed from
    // the asset lookup, it is not included in public results.

    const results = rankedBeats
      .filter((beat) => {
        const asset = assetById.get(beat.id);

        return (
          asset !== undefined &&
          asset.exclusive_sold_at === null
        );
      })
      .map((beat) => {
        const asset = assetById.get(beat.id)!;

        return {
          ...beat,
          preview_url:
            beat.preview_url ??
            asset.preview_url ??
            buildR2Url(asset.preview_key),
          cover_url:
            beat.cover_url ??
            asset.cover_url ??
            buildR2Url(asset.cover_key),
        };
      });

    // --------------------------------------------------------
    // 4. Return results
    // --------------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        mode,
        days,
        results,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Trending API error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load ranked beats.",
      },
      { status: 500 },
    );
  }
}
