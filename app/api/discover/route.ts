import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const r2PublicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
}

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const ALLOWED_SORTS = new Set([
  "newest",
  "popular",
  "price_asc",
  "price_desc",
  "bpm_asc",
  "bpm_desc",
]);

type ProducerFacet = {
  id: string;
  username: string | null;
  display_name: string | null;
};

function buildR2Url(key: string | null): string | null {
  if (!r2PublicUrl || !key) {
    return null;
  }

  return `${r2PublicUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function parseInteger(value: string | null): number | null {
  if (!value || !value.trim()) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

function parseNumber(value: string | null): number | null {
  if (!value || !value.trim()) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function parseList(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, 20);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
type DiscoverRpcRow = {
  id: string;
  title: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  moods: string[] | null;
  semantic_tags: string[] | null;
  preview_url: string | null;
  preview_key: string | null;
  cover_url: string | null;
  cover_key: string | null;
  producer_id: string | null;
  producer_username: string | null;
  producer_display_name: string | null;
  starting_price: number | null;
  currency: string | null;
  play_count: number | null;
  total_count: number | null;
};
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const params = url.searchParams;

    const query = params.get("q")?.trim() || null;

    if (query && query.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: "Search query must be 100 characters or less.",
        },
        { status: 400 },
      );
    }

    const genre = params.get("genre")?.trim() || null;

    const musicalKey = params.get("key")?.trim() || null;

    const producerId = params.get("producer")?.trim() || null;

    if (producerId && !isUuid(producerId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid producer ID.",
        },
        { status: 400 },
      );
    }

    const moods = parseList(params.get("moods"));

    const tags = parseList(params.get("tags"));

    const bpmMin = parseInteger(params.get("bpmMin"));

    const bpmMax = parseInteger(params.get("bpmMax"));

    const priceMin = parseNumber(params.get("priceMin"));

    const priceMax = parseNumber(params.get("priceMax"));

    if (bpmMin !== null && (bpmMin < 20 || bpmMin > 300)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid minimum BPM.",
        },
        { status: 400 },
      );
    }

    if (bpmMax !== null && (bpmMax < 20 || bpmMax > 300)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid maximum BPM.",
        },
        { status: 400 },
      );
    }

    if (bpmMin !== null && bpmMax !== null && bpmMin > bpmMax) {
      return NextResponse.json(
        {
          success: false,
          error: "Minimum BPM cannot exceed maximum BPM.",
        },
        { status: 400 },
      );
    }

    if (priceMin !== null && (priceMin < 0 || priceMin > 100000)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid minimum price.",
        },
        { status: 400 },
      );
    }

    if (priceMax !== null && (priceMax < 0 || priceMax > 100000)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid maximum price.",
        },
        { status: 400 },
      );
    }

    if (priceMin !== null && priceMax !== null && priceMin > priceMax) {
      return NextResponse.json(
        {
          success: false,
          error: "Minimum price cannot exceed maximum price.",
        },
        { status: 400 },
      );
    }

    const requestedSort = params.get("sort") || "newest";

    const sort = ALLOWED_SORTS.has(requestedSort) ? requestedSort : "newest";

    const limitRaw = parseInteger(params.get("limit"));

    const offsetRaw = parseInteger(params.get("offset"));

    const limit = Math.min(Math.max(limitRaw ?? 24, 1), 48);

    const offset = Math.max(offsetRaw ?? 0, 0);

    // --------------------------------------------------------
    // Discovery
    // --------------------------------------------------------

    const { data, error } = await supabase.rpc("discover_beats", {
      p_query: query,
      p_genre: genre,
      p_key: musicalKey,
      p_producer_id: producerId || null,
      p_moods: moods.length > 0 ? moods : null,
      p_tags: tags.length > 0 ? tags : null,
      p_bpm_min: bpmMin,
      p_bpm_max: bpmMax,
      p_price_min: priceMin,
      p_price_max: priceMax,
      p_sort: sort,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.error("Discovery RPC error:", {
        message: error.message,
        name: error.name,
        cause: error.cause,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Failed to load beats.",
        },
        { status: 500 },
      );
    }

    const results = ((data ?? []) as DiscoverRpcRow[]).map(
      (beat: DiscoverRpcRow) => ({
        ...beat,

        preview_url: beat.preview_url ?? buildR2Url(beat.preview_key),

        cover_url: beat.cover_url ?? buildR2Url(beat.cover_key),
      }),
    );

    let facets: {
      genres: string[];
      keys: string[];
      tags: string[];
      producers: ProducerFacet[];
    } | null = null;

    if (params.get("includeFacets") === "true") {
      // ------------------------------------------------------
      // Genres / Keys / Tags
      // ------------------------------------------------------

      const { data: facetBeats, error: facetBeatsError } = await supabase
        .from("beats")
        .select("genre, key, semantic_tags")
        .in("analysis_status", ["completed", "skipped"])
        .limit(5000);

      if (facetBeatsError) {
        console.error("Facet beat query error:", facetBeatsError.message);
      }

      const genreSet = new Set<string>();
      const keySet = new Set<string>();
      const tagSet = new Set<string>();

      for (const beat of facetBeats ?? []) {
        if (typeof beat.genre === "string" && beat.genre.trim()) {
          genreSet.add(beat.genre.trim());
        }

        if (typeof beat.key === "string" && beat.key.trim()) {
          keySet.add(beat.key.trim());
        }

        if (Array.isArray(beat.semantic_tags)) {
          for (const tag of beat.semantic_tags) {
            if (typeof tag === "string" && tag.trim()) {
              tagSet.add(tag.trim());
            }
          }
        }
      }

      // ------------------------------------------------------
      // Producers
      // ------------------------------------------------------

      const { data: producerData, error: producerError } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .eq("role", "producer")
        .order("display_name", {
          ascending: true,
        });

      if (producerError) {
        console.error("Producer facet query error:", producerError.message);
      }

      facets = {
        genres: [...genreSet].sort((a, b) => a.localeCompare(b)),

        keys: [...keySet].sort((a, b) => a.localeCompare(b)),

        tags: [...tagSet].sort((a, b) => a.localeCompare(b)).slice(0, 200),

        producers: (producerData ?? []) as ProducerFacet[],
      };
    }

    const totalCount =
      results.length > 0 ? Number(results[0].total_count ?? 0) : 0;

    return NextResponse.json({
      success: true,
      results,
      totalCount,
      facets,
      pagination: {
        limit,
        offset,
        hasMore: offset + results.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Discovery API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 },
    );
  }
}
