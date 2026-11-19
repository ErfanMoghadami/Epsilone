import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendProducerTelegramNotification } from "@/lib/telegram-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 3;
const MAX_RETRY_DELAY_SECONDS = 60 * 60;

type ClaimedSaleNotification = {
  id: string;
  order_id: string;
  producer_id: string;
  event_id: string;
  attempts: number;
};

type OrderItemForNotification = {
  title_snapshot: string | null;
  license_type: string | null;
};

function isAuthorized(request: Request): boolean {
  const expected = process.env.TELEGRAM_SALE_OUTBOX_CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!expected || !authorization?.startsWith("Bearer ")) {
    return false;
  }

  const providedBytes = Buffer.from(authorization.slice(7));
  const expectedBytes = Buffer.from(expected);

  return (
    providedBytes.length === expectedBytes.length &&
    timingSafeEqual(providedBytes, expectedBytes)
  );
}

function retryDelaySeconds(attempts: number): number {
  const exponent = Math.max(0, Math.min(attempts - 1, 10));

  return Math.min(
    30 * 2 ** exponent,
    MAX_RETRY_DELAY_SECONDS,
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 1800);
  }

  return String(error).slice(0, 1800);
}

// ----------------------------------------
// RELEASE FAILED EVENT FOR RETRY
// ----------------------------------------

async function scheduleRetry(
  admin: ReturnType<typeof createAdminClient>,
  row: ClaimedSaleNotification,
  error: unknown,
): Promise<void> {
  const delaySeconds = retryDelaySeconds(row.attempts);

  const nextAttemptAt = new Date(
    Date.now() + delaySeconds * 1000,
  ).toISOString();

  const { data, error: updateError } = await admin
    .from("producer_telegram_sale_outbox")
    .update({
      status: "pending",
      next_attempt_at: nextAttemptAt,
      locked_at: null,
      last_error: errorMessage(error),
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("status", "processing")
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw updateError;
  }

  if (!data) {
    throw new Error(
      `Could not release outbox row ${row.id} for retry.`,
    );
  }
}

// ----------------------------------------
// MARK EVENT AS SENT
// ----------------------------------------

async function markSent(
  admin: ReturnType<typeof createAdminClient>,
  row: ClaimedSaleNotification,
): Promise<void> {
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("producer_telegram_sale_outbox")
    .update({
      status: "sent",
      sent_at: now,
      locked_at: null,
      last_error: null,
      updated_at: now,
    })
    .eq("id", row.id)
    .eq("status", "processing")
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      `Could not mark outbox row ${row.id} as sent.`,
    );
  }
}

// ----------------------------------------
// DELIVER ONE PRODUCER SALE
// ----------------------------------------

async function deliverOne(
  admin: ReturnType<typeof createAdminClient>,
  row: ClaimedSaleNotification,
): Promise<void> {
  // Verify the order is still paid.
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, status")
    .eq("id", row.order_id)
    .maybeSingle();

  if (orderError) {
    throw orderError;
  }

  if (!order || order.status !== "paid") {
    throw new Error(
      `Order ${row.order_id} is missing or is not paid.`,
    );
  }

  // Load only this Producer's items.
  const { data: items, error: itemsError } = await admin
    .from("order_items")
    .select("title_snapshot, license_type")
    .eq("order_id", row.order_id)
    .eq("producer_id", row.producer_id);

  if (itemsError) {
    throw itemsError;
  }

  const orderItems =
    (items ?? []) as OrderItemForNotification[];

  if (orderItems.length === 0) {
    throw new Error(
      `No order items found for producer ${row.producer_id} in order ${row.order_id}.`,
    );
  }

  const itemLines = orderItems.slice(0, 10).map((item, index) => {
    const title = (
      item.title_snapshot || "Untitled beat"
    ).slice(0, 180);

    const license = item.license_type || "License";

    return `${index + 1}. ${title} (${license})`;
  });

  if (orderItems.length > 10) {
    itemLines.push(
      `+ ${orderItems.length - 10} more item(s)`,
    );
  }

  const body = [
    "A real ZarinPal payment has been verified and your sale is complete.",
    "",
    `Your item(s): ${orderItems.length}`,
    ...itemLines,
    "",
    `Order ID: ${row.order_id}`,
  ].join("\n").slice(0, 3400);

  // Send through the existing Rust Telegram Bot API.
  const result = await sendProducerTelegramNotification({
    event_id: row.event_id,
    producer_id: row.producer_id,
    event_type: "sale.completed",
    title: "New Sale on Epsilone!",
    body,
    action_url: "https://www.epsilone.ir/producer",
  });

  // A 202 response with event_already_processing
  // is NOT a delivery confirmation.
  if (
    !result.ok ||
    ![
      "notification_sent",
      "duplicate_event_ignored",
    ].includes(result.status)
  ) {
    throw new Error(
      `Telegram Bot did not confirm delivery: ${result.status}`,
    );
  }
}

// ----------------------------------------
// GET: PROCESS OUTBOX
// ----------------------------------------

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  let admin: ReturnType<typeof createAdminClient>;

  try {
    admin = createAdminClient();
  } catch (error) {
    console.error(
      "Sale notification outbox admin client failed:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Outbox service is not configured.",
      },
      { status: 503 },
    );
  }

  // Atomically claim available notifications.
  const { data, error } = await admin.rpc(
    "claim_producer_telegram_sale_notifications",
    {
      p_limit: BATCH_SIZE,
    },
  );

  if (error) {
    console.error(
      "Could not claim Telegram sale notifications:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Could not claim sale notifications.",
      },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as ClaimedSaleNotification[];

  let sent = 0;
  let retryScheduled = 0;
  let retryReleaseErrors = 0;

  for (const row of rows) {
    try {
      await deliverOne(admin, row);

      await markSent(admin, row);

      sent += 1;
    } catch (deliveryError) {
      console.error(
        "Telegram sale notification failed:",
        {
          outboxId: row.id,
          orderId: row.order_id,
          producerId: row.producer_id,
          error: errorMessage(deliveryError),
        },
      );

      try {
        await scheduleRetry(
          admin,
          row,
          deliveryError,
        );

        retryScheduled += 1;
      } catch (releaseError) {
        retryReleaseErrors += 1;

        console.error(
          "Could not schedule Telegram sale retry:",
          {
            outboxId: row.id,
            error: errorMessage(releaseError),
          },
        );

        // The SQL claim function can recover this row
        // after its five-minute stale-lock window.
      }
    }
  }

  return NextResponse.json({
    ok: true,
    claimed: rows.length,
    sent,
    retry_scheduled: retryScheduled,
    retry_release_errors: retryReleaseErrors,
  });
}