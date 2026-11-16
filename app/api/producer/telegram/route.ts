
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BotApiPayload = {
  ok?: boolean;
  status?: string;
  linked?: boolean;
};

type ProducerAuth =
  | { producerId: string }
  | { response: NextResponse };

async function requireProducer(): Promise<ProducerAuth> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      response: NextResponse.json(
        { success: false, error: "لطفاً وارد حساب خودت شو." },
        { status: 401 },
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Telegram profile lookup failed:", profileError);

    return {
      response: NextResponse.json(
        { success: false, error: "بررسی حساب کاربری ممکن نشد." },
        { status: 500 },
      ),
    };
  }

  if (!profile || profile.role !== "producer") {
    return {
      response: NextResponse.json(
        { success: false, error: "این بخش فقط برای Producerهاست." },
        { status: 403 },
      ),
    };
  }

  // Never accept producer_id from the browser.
  return { producerId: user.id };
}

function getBotConfig() {
  const rawUrl = process.env.TELEGRAM_BOT_INTERNAL_URL?.trim();
  const secret = process.env.TELEGRAM_INTERNAL_API_SECRET?.trim();

  if (!rawUrl || !secret) {
    throw new Error("Telegram Bot environment variables are missing.");
  }

  const url = new URL(rawUrl);

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("Invalid Telegram Bot internal URL.");
  }

  return {
    baseUrl: url.origin,
    secret,
  };
}

async function callBot(
  path: string,
  method: "GET" | "POST",
  body?: unknown,
) {
  const config = getBotConfig();

  const response = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.secret}`,
      ...(body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  const payload = (await response
    .json()
    .catch(() => null)) as BotApiPayload | null;

  return { response, payload };
}

function botUnavailable() {
  return NextResponse.json(
    {
      success: false,
      error: "ارتباط با سرویس Telegram برقرار نشد. کمی بعد دوباره امتحان کن.",
    },
    { status: 502 },
  );
}

// ----------------------------------------
// GET: CHECK CONNECTION STATUS
// ----------------------------------------

export async function GET() {
  const auth = await requireProducer();

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const query = new URLSearchParams({
      producer_id: auth.producerId,
    });

    const { response, payload } = await callBot(
      `/internal/v1/producer-links/status?${query.toString()}`,
      "GET",
    );

    if (
      !response.ok ||
      !payload?.ok ||
      typeof payload.linked !== "boolean"
    ) {
      console.error(
        "Telegram link status API failed:",
        response.status,
        payload?.status,
      );

      return botUnavailable();
    }

    return NextResponse.json(
      {
        success: true,
        linked: payload.linked,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Telegram connection status error:", error);
    return botUnavailable();
  }
}

// ----------------------------------------
// POST: CLAIM TELEGRAM LINK CODE
// ----------------------------------------

export async function POST(request: Request) {
  const auth = await requireProducer();

  if ("response" in auth) {
    return auth.response;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "اطلاعات ارسال‌شده معتبر نیست." },
      { status: 400 },
    );
  }

  const code =
    typeof body === "object" &&
    body !== null &&
    "code" in body &&
    typeof body.code === "string"
      ? body.code.trim().toUpperCase()
      : "";

  if (!/^[A-HJ-NP-Z2-9]{10}$/.test(code)) {
    return NextResponse.json(
      { success: false, error: "کد اتصال باید ۱۰ کاراکتر معتبر باشد." },
      { status: 400 },
    );
  }

  try {
    const { response, payload } = await callBot(
      "/internal/v1/producer-links/claim",
      "POST",
      {
        producer_id: auth.producerId,
        code,
      },
    );

    if (response.ok && payload?.ok) {
      return NextResponse.json({
        success: true,
        linked: true,
        message: "حساب تلگرام با موفقیت متصل شد.",
      });
    }

    switch (payload?.status) {
      case "invalid_or_expired_code":
        return NextResponse.json(
          {
            success: false,
            error: "کد اشتباه یا منقضی شده. در ربات دوباره /link را بزن.",
          },
          { status: 400 },
        );

      case "expired_code":
        return NextResponse.json(
          {
            success: false,
            error: "زمان اعتبار کد تمام شده. دوباره /link را اجرا کن.",
          },
          { status: 410 },
        );

      case "producer_already_linked":
        return NextResponse.json(
          {
            success: false,
            error: "این حساب Producer قبلاً به یک حساب تلگرام متصل شده است.",
          },
          { status: 409 },
        );

      case "telegram_account_already_linked":
        return NextResponse.json(
          {
            success: false,
            error: "این حساب تلگرام قبلاً به یک Producer دیگر متصل شده است. ابتدا اتصال قبلی را از ربات قطع کن.",
          },
          { status: 409 },
        );

      default:
        console.error(
          "Telegram link claim failed:",
          response.status,
          payload?.status,
        );

        return botUnavailable();
    }
  } catch (error) {
    console.error("Telegram link claim error:", error);
    return botUnavailable();
  }
}

// ----------------------------------------
// DELETE: UNLINK TELEGRAM ACCOUNT
// ----------------------------------------

export async function DELETE() {
  const auth = await requireProducer();

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { response, payload } = await callBot(
      "/internal/v1/producer-links/unlink",
      "POST",
      {
        producer_id: auth.producerId,
      },
    );

    if (response.ok && payload?.ok) {
      return NextResponse.json({
        success: true,
        linked: false,
        message: "اتصال تلگرام با موفقیت قطع شد.",
      });
    }

    console.error(
      "Telegram unlink failed:",
      response.status,
      payload?.status,
    );

    return botUnavailable();
  } catch (error) {
    console.error("Telegram unlink error:", error);
    return botUnavailable();
  }
}
