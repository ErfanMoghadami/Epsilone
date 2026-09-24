import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT = 10;
const WINDOW_MS = 60_000;

const rateLimitStore = new Map<
  string,
  RateLimitEntry
>();

function getClientIp(request: Request): string {
  const forwardedFor =
    request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp =
    request.headers.get("x-real-ip");

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
    remaining:
      RATE_LIMIT - existing.count,
    resetAt: existing.resetAt,
  };
}

export async function POST(request: Request) {
  try {
    // --------------------------------------------------------
    // 1. Rate limit
    // --------------------------------------------------------

    const clientIp = getClientIp(request);
    const rateLimit =
      checkRateLimit(clientIp);

    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil(
        (rateLimit.resetAt - Date.now()) /
          1000
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
            "Retry-After":
              String(retryAfter),
          },
        }
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
        userError.message
      );
    }

    const userId = user?.id ?? null;

    // --------------------------------------------------------
    // 3. Read request body
    // --------------------------------------------------------

    const body = await request.json();
    const query = body?.query;

    if (
      typeof query !== "string" ||
      !query.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "query must be a non-empty string",
        },
        { status: 400 }
      );
    }

    if (query.trim().length > 500) {
      return NextResponse.json(
        {
          success: false,
          error:
            "query must be 500 characters or less",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // 4. Worker configuration
    // --------------------------------------------------------

    const workerUrl =
      process.env.VPS_WORKER_URL;

    const workerSecret =
      process.env.VPS_WORKER_SECRET;

    if (!workerUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            "VPS_WORKER_URL is not configured",
        },
        { status: 500 }
      );
    }

    if (!workerSecret) {
      return NextResponse.json(
        {
          success: false,
          error:
            "VPS_WORKER_SECRET is not configured",
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------------
    // 5. Send query + user_id to Worker
    // --------------------------------------------------------

    const response = await fetch(
      `${workerUrl}/recommend`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${workerSecret}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          query: query.trim(),
          user_id: userId,
        }),
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            data?.error ||
            "Worker recommendation failed",
        },
        {
          status: response.status,
        }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(
      "Recommendation API error:",
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