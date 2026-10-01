import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT = 10;
const WINDOW_MS = 60_000;

const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");

  if (realIp) {
    return realIp;
  }

  return "unknown";
}

function checkRateLimit(ip: string) {
  const now = Date.now();

  const existing = rateLimitStore.get(ip);

  if (!existing || now >= existing.resetAt) {
    const entry: RateLimitEntry = {
      count: 1,
      resetAt: now + WINDOW_MS,
    };

    rateLimitStore.set(ip, entry);

    return {
      allowed: true,
      remaining: RATE_LIMIT - 1,
      resetAt: entry.resetAt,
    };
  }

  if (existing.count >= RATE_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;

  return {
    allowed: true,
    remaining: RATE_LIMIT - existing.count,
    resetAt: existing.resetAt,
  };
}

export async function POST(request: Request) {
  try {
    // --------------------------------------------------------
    // 1. Rate limit
    // --------------------------------------------------------

    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(clientIp);

    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil(
        (rateLimit.resetAt - Date.now()) / 1000,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Too many recommendation requests. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
          },
        },
      );
    }

    // --------------------------------------------------------
    // 2. Get current Supabase user
    // --------------------------------------------------------

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(
        "Could not get Supabase user:",
        userError.message,
      );
    }

    const userId = user?.id ?? null;

    // --------------------------------------------------------
    // 3. Read request body
    // --------------------------------------------------------

    const body = await request.json();
    const query = body?.query;

    if (typeof query !== "string" || !query.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "query must be a non-empty string",
        },
        { status: 400 },
      );
    }

    if (query.trim().length > 500) {
      return NextResponse.json(
        {
          success: false,
          error: "query must be 500 characters or less",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------------
    // 4. Worker configuration
    // --------------------------------------------------------

    const workerUrl = process.env.VPS_WORKER_URL
      ?.trim()
      .replace(/\/+$/, "");

    const workerSecret = process.env.VPS_WORKER_SECRET?.trim();

    if (!workerUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "VPS_WORKER_URL is not configured",
        },
        { status: 500 },
      );
    }

    if (!workerSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "VPS_WORKER_SECRET is not configured",
        },
        { status: 500 },
      );
    }

    console.log("Recommendation worker config:", {
      workerUrl,
      workerSecretPresent: Boolean(workerSecret),
    });

    // --------------------------------------------------------
    // 5. Send query + user_id to Worker
    // --------------------------------------------------------

    let response: Response;

    try {
      response = await fetch(`${workerUrl}/recommend`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${workerSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query.trim(),
          user_id: userId,
        }),
        cache: "no-store",
      });
    } catch (error) {
      const fetchError = error as Error & {
        cause?: unknown;
      };

      console.error("Recommendation worker fetch failed:", {
        message: fetchError.message,
        name: fetchError.name,
        cause: fetchError.cause,
        workerUrl,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Recommendation worker is unavailable.",
        },
        { status: 502 },
      );
    }

    // --------------------------------------------------------
    // 6. Read Worker response safely
    // --------------------------------------------------------

    const rawBody = await response.text();

    console.log("Recommendation worker response:", {
      status: response.status,
      ok: response.ok,
      bodyPreview: rawBody.slice(0, 500),
    });

    let data: any = {};

    try {
      data = rawBody ? JSON.parse(rawBody) : {};
    } catch (error) {
      console.error(
        "Invalid JSON from recommendation worker:",
        {
          status: response.status,
          bodyPreview: rawBody.slice(0, 500),
          error,
        },
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Recommendation worker returned an invalid response.",
        },
        { status: 502 },
      );
    }

    if (!response.ok) {
      console.error(
        "Recommendation worker returned an error:",
        {
          status: response.status,
          body: data,
        },
      );

      return NextResponse.json(
        {
          success: false,
          error:
            data?.error || "Worker recommendation failed",
        },
        {
          status: response.status,
        },
      );
    }

    const results = Array.isArray(data?.results)
      ? data.results
      : [];

    // --------------------------------------------------------
    // 7. Collect beat IDs
    // --------------------------------------------------------

    const beatIds = results
      .map((beat: { id?: unknown }) => beat.id)
      .filter(
        (id: unknown): id is string =>
          typeof id === "string",
      );

    // --------------------------------------------------------
    // 8. Load R2 storage keys
    // --------------------------------------------------------

    let storageRows: {
      id: string;
      preview_key: string | null;
      cover_key: string | null;
    }[] = [];

    let producerRows: {
      id: string;
      username: string | null;
    }[] = [];

    if (beatIds.length > 0) {
      const {
        data: rows,
        error: storageError,
      } = await supabase
        .from("beats")
        .select("id, preview_key, cover_key")
        .in("id", beatIds);

      if (storageError) {
        console.error(
          "Failed to load R2 keys:",
          storageError.message,
        );
      } else {
        storageRows = rows ?? [];
      }
    }

    const storageMap = new Map(
      storageRows.map((row) => [row.id, row]),
    );

    // --------------------------------------------------------
    // 9. Load producer IDs directly from beats
    // --------------------------------------------------------

    let beatProducerRows: {
      id: string;
      producer_id: string | null;
    }[] = [];

    if (beatIds.length > 0) {
      const {
        data: beatRows,
        error: beatRowsError,
      } = await supabase
        .from("beats")
        .select("id, producer_id")
        .in("id", beatIds);

      if (beatRowsError) {
        console.error(
          "Failed to load beat producer IDs:",
          beatRowsError.message,
        );
      } else {
        beatProducerRows = beatRows ?? [];
      }
    }

    const beatProducerMap = new Map(
      beatProducerRows.map((row) => [
        row.id,
        row.producer_id,
      ]),
    );

    // --------------------------------------------------------
    // 10. Load producer usernames
    // --------------------------------------------------------

    const producerIds = [
      ...new Set(
        beatProducerRows
          .map((row) => row.producer_id)
          .filter(
            (id): id is string =>
              typeof id === "string",
          ),
      ),
    ];

    if (producerIds.length > 0) {
      const {
        data: producers,
        error: producerError,
      } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", producerIds)
        .eq("role", "producer");

      if (producerError) {
        console.error(
          "Failed to load producer usernames:",
          producerError.message,
        );
      } else {
        producerRows = producers ?? [];
      }
    }

    const producerMap = new Map(
      producerRows.map((producer) => [
        producer.id,
        producer,
      ]),
    );

    // --------------------------------------------------------
    // 11. R2 public URL helper
    // --------------------------------------------------------

    const r2PublicUrl = process.env.R2_PUBLIC_URL
      ?.trim()
      .replace(/\/+$/, "");

    function buildR2Url(
      key: string | null,
    ): string | null {
      if (!r2PublicUrl || !key) {
        return null;
      }

      return `${r2PublicUrl}/${key
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`;
    }

    // --------------------------------------------------------
    // 12. Enrich results
    // --------------------------------------------------------

    const enrichedResults = results.map(
      (beat: {
        id: string;
        producer_id?: string | null;
        preview_url?: string | null;
        cover_url?: string | null;
      }) => {
        const storage = storageMap.get(beat.id);

        const producerId =
          beat.producer_id ??
          beatProducerMap.get(beat.id) ??
          null;

        const producer = producerId
          ? producerMap.get(producerId)
          : undefined;

        return {
          ...beat,

          preview_url:
            beat.preview_url ??
            buildR2Url(
              storage?.preview_key ?? null,
            ),

          cover_url:
            beat.cover_url ??
            buildR2Url(
              storage?.cover_key ?? null,
            ),

          producer_username:
            producer?.username ?? null,
        };
      },
    );

    // --------------------------------------------------------
    // 13. Return response
    // --------------------------------------------------------

    return NextResponse.json({
      ...data,
      results: enrichedResults,
    });
  } catch (error) {
    console.error("Recommendation API error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown server error",
      },
      { status: 500 },
    );
  }
}