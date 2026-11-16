
type BotApiResponse = {
  ok: boolean;
  status: string;
};

type ProducerNotification = {
  event_id: string;
  producer_id: string;
  event_type: string;
  title: string;
  body: string;
  action_url?: string;
};

function getBotConfig() {
  const baseUrl = process.env.TELEGRAM_BOT_INTERNAL_URL;
  const secret = process.env.TELEGRAM_INTERNAL_API_SECRET;

  if (!baseUrl || !secret) {
    throw new Error(
      "Telegram Bot internal API configuration is missing."
    );
  }

  if (!baseUrl.startsWith("https://")) {
    throw new Error(
      "Telegram Bot internal API must use HTTPS."
    );
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    secret,
  };
}

async function botPost<T>(
  path: string,
  body: unknown
): Promise<T> {
  const config = getBotConfig();

  const response = await fetch(
    `${config.baseUrl}${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    }
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `Telegram Bot API failed (${response.status}): ${
        payload?.status ?? "unknown_error"
      }`
    );
  }

  return payload as T;
}

// ----------------------------------------
// CLAIM PRODUCER TELEGRAM CONNECTION
// ----------------------------------------

export async function claimProducerTelegramLink(
  producerId: string,
  code: string
): Promise<BotApiResponse> {
  return botPost<BotApiResponse>(
    "/internal/v1/producer-links/claim",
    {
      producer_id: producerId,
      code,
    }
  );
}

// ----------------------------------------
// SEND PRODUCER NOTIFICATION
// ----------------------------------------

export async function sendProducerTelegramNotification(
  notification: ProducerNotification
): Promise<BotApiResponse> {
  return botPost<BotApiResponse>(
    "/internal/v1/notifications",
    notification
  );
}
