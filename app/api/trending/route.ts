import { NextResponse } from "next/server";
import { applyDiscount, normalizeDiscountPercent } from "@/lib/discounts";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const r2PublicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "") ?? null;

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
};

function buildR2Url(key: string | null | undefined): string | null {
  if (!r2PublicUrl || !key) return null;
  return `${r2PublicUrl}/${key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const requestedMode = (params.get("mode") ?? "trending").trim();
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

    const requestedLimit = Number(params.get("limit") ?? 24);
    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 48)
      : 24;
    const days = mode === "popular_new" ? 30 : 7;

    const { data, error } = await supabase.rpc("get_ranked_beats", {
      p_mode: mode,
      p_limit: limit,
      p_producer_id: null,
      p_days: days,
    });

    if (error) {
      console.error("Trending ranking RPC failed:", error.message);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to load ranked beats.",
        },
        { status: 500 },
      );
    }

    const rpcRankedBeats = (data ?? []) as RankedBeat[];
    const rpcIds = [...new Set(rpcRankedBeats.map((beat) => beat.id))];
    let publishedIds = new Set<string>();
    const publishedDiscounts = new Map<string, number>();

    if (rpcIds.length > 0) {
      const { data: publishedRows, error: publishedError } = await supabase
        .from("beats")
        .select("id, discount_percent")
        .in("id", rpcIds)
        .eq("is_published", true);

      if (publishedError) {
        console.error("Trending publish-status lookup failed:", publishedError.message);
        return NextResponse.json(
          { success: false, error: "Failed to verify beat availability." },
          { status: 500 },
        );
      }

      publishedIds = new Set((publishedRows ?? []).map((beat) => beat.id));
      for (const beat of publishedRows ?? []) {
        publishedDiscounts.set(beat.id, normalizeDiscountPercent(beat.discount_percent));
      }
    }

    const rankedBeats = rpcRankedBeats.filter((beat) => publishedIds.has(beat.id));
    const ids = rankedBeats.map((beat) => beat.id);
    let assetById = new Map<string, BeatAssetRow>();

    // Reuse R2 keys if the legacy public URL fields are empty.
    if (ids.length > 0) {
      const { data: assetRows, error: assetError } = await supabase
        .from("beats")
        .select("id, cover_key, preview_key, cover_url, preview_url")
        .in("id", ids);

      if (assetError) {
        // Ranking still works if asset enrichment fails; log for diagnosis.
        console.error("Trending asset lookup failed:", assetError.message);
      } else {
        assetById = new Map<string, BeatAssetRow>(
          ((assetRows ?? []) as BeatAssetRow[]).map(
            (asset) => [asset.id, asset] as [string, BeatAssetRow],
          ),
        );
      }
    }

    const priceByBeat = new Map<string, { original: number; currency: string }>();
    if (ids.length > 0) {
      const { data: licensePrices, error: pricesError } = await supabase
        .from("beat_licenses")
        .select("beat_id, price, currency")
        .in("beat_id", ids)
        .eq("is_active", true);

      if (pricesError) {
        console.error("Trending license price lookup failed:", pricesError.message);
      } else {
        for (const license of licensePrices ?? []) {
          const price = Number(license.price);
          if (!Number.isFinite(price) || price < 0) continue;
          const current = priceByBeat.get(license.beat_id);
          if (!current || price < current.original) {
            priceByBeat.set(license.beat_id, { original: price, currency: license.currency });
          }
        }
      }
    }

    const results = rankedBeats.map((beat) => {
      const asset = assetById.get(beat.id);
      const price = priceByBeat.get(beat.id);
      const discountPercent = publishedDiscounts.get(beat.id) ?? 0;
      return {
        ...beat,
        discount_percent: discountPercent,
        original_starting_price: price?.original ?? null,
        starting_price: price ? applyDiscount(price.original, discountPercent) : null,
        currency: price?.currency ?? null,
        preview_url:
          beat.preview_url ??
          asset?.preview_url ??
          buildR2Url(asset?.preview_key),
        cover_url:
          beat.cover_url ??
          asset?.cover_url ??
          buildR2Url(asset?.cover_key),
      };
    });

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
