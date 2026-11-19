
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type CreatePaymentBody = {
  orderId?: string;
  gateway?: string;
};

type LicenseDocumentSnapshot = {
  version?: string;
  items?: unknown[];
  [key: string]: unknown;
};

type LicenseAcceptanceSnapshot = {
  version?: string;
  orderId?: string;
  buyerId?: string;
  document?: LicenseDocumentSnapshot;
};

const ZARINPAL_AUTHORITY_REGEX = /^[AS][a-zA-Z0-9]{35}$/;

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;

    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, sortJson(record[key])]),
    );
  }

  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(sortJson(value)) ?? "";
}

function getVpsWorkerConfig() {
  const workerUrl = process.env.VPS_WORKER_URL
    ?.trim()
    .replace(/\/+$/, "");

  const workerSecret = process.env.VPS_WORKER_SECRET?.trim();

  if (!workerUrl || !workerSecret) {
    return null;
  }

  try {
    const parsed = new URL(workerUrl);

    const secure =
      parsed.protocol === "https:" ||
      (
        process.env.NODE_ENV !== "production" &&
        parsed.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(parsed.hostname)
      );

    if (!secure) {
      return null;
    }
  } catch {
    return null;
  }

  return { workerUrl, workerSecret };
}

function buildZarinpalPaymentUrl(authority: string): string {
  return `https://www.zarinpal.com/pg/StartPay/${authority}`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    let body: CreatePaymentBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const orderId = body.orderId?.trim();
    const gateway = body.gateway?.trim() || "zarinpal";

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 },
      );
    }

    if (gateway !== "test" && gateway !== "zarinpal") {
      return NextResponse.json(
        { error: "Unsupported payment gateway" },
        { status: 400 },
      );
    }

    // Test payments must never be available in production
    // unless explicitly enabled.
    if (
      gateway === "test" &&
      process.env.NODE_ENV === "production" &&
      process.env.ALLOW_TEST_PAYMENTS !== "true"
    ) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 },
      );
    }

    // Load the order and verify ownership.
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        buyer_id,
        status,
        currency,
        total,
        license_document_version,
        license_document_snapshot,
        license_accepted_at,
        license_accepted_by,
        license_acceptance_snapshot
      `)
      .eq("id", orderId)
      .eq("buyer_id", user.id)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 },
      );
    }

    if (order.status !== "pending") {
      return NextResponse.json(
        {
          error: `Order cannot be paid because its status is "${order.status}"`,
        },
        { status: 400 },
      );
    }

    // ------------------------------------------------------
    // Verify the exact order-specific License Sheet.
    // ------------------------------------------------------

    const licenseDocument =
      order.license_document_snapshot as
        | LicenseDocumentSnapshot
        | null;

    const acceptance =
      order.license_acceptance_snapshot as
        | LicenseAcceptanceSnapshot
        | null;

    const documentIsValid = Boolean(
      licenseDocument &&
        typeof licenseDocument.version === "string" &&
        licenseDocument.version.length > 0 &&
        licenseDocument.version ===
          order.license_document_version &&
        Array.isArray(licenseDocument.items) &&
        licenseDocument.items.length > 0,
    );

    const acceptedDocumentMatches = Boolean(
      documentIsValid &&
        acceptance?.document &&
        canonicalJson(acceptance.document) ===
          canonicalJson(licenseDocument),
    );

    const licenseWasAccepted = Boolean(
      documentIsValid &&
        order.license_accepted_at &&
        order.license_accepted_by === user.id &&
        acceptance?.version ===
          order.license_document_version &&
        acceptance?.orderId === order.id &&
        acceptance?.buyerId === user.id &&
        acceptedDocumentMatches,
    );

    if (!documentIsValid) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This order does not have a valid License Sheet. Create a new order and try again.",
        },
        { status: 409 },
      );
    }

    if (!licenseWasAccepted) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You must accept the exact License Sheet for this order before creating a payment.",
        },
        { status: 409 },
      );
    }

    // ------------------------------------------------------
    // Verify the order's Beats are still available.
    // ------------------------------------------------------

    const supabaseAdmin = createAdminClient();

    const {
      data: orderItems,
      error: orderItemsError,
    } = await supabaseAdmin
      .from("order_items")
      .select("beat_id")
      .eq("order_id", order.id);

    if (
      orderItemsError ||
      !orderItems ||
      orderItems.length === 0
    ) {
      return NextResponse.json(
        { error: "Could not verify order items" },
        { status: 500 },
      );
    }

    const orderBeatIds = [
      ...new Set(orderItems.map((item) => item.beat_id)),
    ];

    const {
      data: availableBeats,
      error: availableBeatsError,
    } = await supabaseAdmin
      .from("beats")
      .select("id")
      .in("id", orderBeatIds)
      .eq("is_published", true);

    if (availableBeatsError) {
      return NextResponse.json(
        { error: "Could not verify beat availability" },
        { status: 500 },
      );
    }

    if (
      (availableBeats ?? []).length !== orderBeatIds.length
    ) {
      return NextResponse.json(
        {
          error:
            "One or more beats in this order are OFF. Remove them from your cart and create a new order.",
        },
        { status: 409 },
      );
    }

    // ------------------------------------------------------
    // Validate the payable amount and currency.
    // ------------------------------------------------------

    const amount = Number(order.total);

    if (
      !Number.isSafeInteger(amount) ||
      amount < 0
    ) {
      return NextResponse.json(
        { error: "Invalid order amount" },
        { status: 400 },
      );
    }

    let amountRial: number | null = null;
    let workerConfig: ReturnType<typeof getVpsWorkerConfig> = null;

    if (gateway === "zarinpal") {
      // ZarinPal is only enabled for Toman orders.
      if (order.currency !== "TOMAN") {
        return NextResponse.json(
          {
            error:
              "ZarinPal only supports TOMAN orders. USD orders cannot be paid through this gateway.",
          },
          { status: 400 },
        );
      }

      if (amount <= 0) {
        return NextResponse.json(
          { error: "Order amount must be greater than zero." },
          { status: 400 },
        );
      }

      // Epsilone stores Toman. ZarinPal receives Rial.
      amountRial = amount * 10;

      if (
        !Number.isSafeInteger(amountRial) ||
        amountRial < 10_000
      ) {
        return NextResponse.json(
          { error: "Invalid ZarinPal payment amount." },
          { status: 400 },
        );
      }

      workerConfig = getVpsWorkerConfig();

      if (!workerConfig) {
        console.error(
          "ZarinPal worker configuration is missing or invalid.",
        );

        return NextResponse.json(
          {
            error:
              "ZarinPal payment service is not configured correctly.",
          },
          { status: 503 },
        );
      }
    }

    // ------------------------------------------------------
    // Reuse an existing pending payment for this order/gateway.
    // ------------------------------------------------------

    const {
      data: existingPayment,
      error: existingPaymentError,
    } = await supabase
      .from("payments")
      .select(`
        id,
        order_id,
        gateway,
        transaction_id,
        gateway_authority,
        status,
        amount,
        currency,
        created_at
      `)
      .eq("order_id", order.id)
      .eq("gateway", gateway)
      .eq("status", "pending")
      .maybeSingle();

    if (existingPaymentError) {
      console.error(
        "Failed to check existing payment:",
        existingPaymentError,
      );

      return NextResponse.json(
        { error: "Failed to check existing payment" },
        { status: 500 },
      );
    }

    if (existingPayment) {
      // A previous ZarinPal request already has an Authority.
      // Reuse it instead of creating another bank request.
      if (
        gateway === "zarinpal" &&
        typeof existingPayment.gateway_authority === "string" &&
        ZARINPAL_AUTHORITY_REGEX.test(
          existingPayment.gateway_authority,
        )
      ) {
        return NextResponse.json({
          success: true,
          payment: existingPayment,
          paymentUrl: buildZarinpalPaymentUrl(
            existingPayment.gateway_authority,
          ),
          reused: true,
        });
      }

      if (gateway === "test") {
        return NextResponse.json({
          success: true,
          payment: existingPayment,
          reused: true,
        });
      }
    }

    // ------------------------------------------------------
    // Create a new pending payment if one does not exist.
    // ------------------------------------------------------

    let payment = existingPayment;

    if (!payment) {
      const { data: newPayment, error: paymentError } =
        await supabase
          .from("payments")
          .insert({
            order_id: order.id,
            gateway,
            transaction_id: null,
            status: "pending",
            amount,
            currency: order.currency,
          })
          .select(`
            id,
            order_id,
            gateway,
            transaction_id,
            gateway_authority,
            status,
            amount,
            currency,
            created_at
          `)
          .single();

      if (paymentError || !newPayment) {
        console.error(
          "Failed to create payment:",
          paymentError,
        );

        return NextResponse.json(
          { error: "Failed to create payment" },
          { status: 500 },
        );
      }

      payment = newPayment;
    }

    // Test gateway retains its existing behavior.
    if (gateway === "test") {
      return NextResponse.json({
        success: true,
        payment,
        reused: false,
      });
    }

    // ------------------------------------------------------
    // Ask the VPS to create the ZarinPal payment request.
    // ------------------------------------------------------

    if (!workerConfig || amountRial === null) {
      return NextResponse.json(
        { error: "ZarinPal worker is not configured" },
        { status: 503 },
      );
    }

    let workerResponse: Response;

    try {
      workerResponse = await fetch(
        `${workerConfig.workerUrl}/zarinpal/request`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${workerConfig.workerSecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amountRial,
            description: `Epsilone order ${order.id.slice(0, 8)}`,
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(20_000),
        },
      );
    } catch (error) {
      console.error(
        "ZarinPal VPS request failed:",
        error instanceof Error ? error.message : error,
      );

      return NextResponse.json(
        {
          error:
            "Could not connect to the payment service. You can safely retry.",
        },
        { status: 502 },
      );
    }

    const workerData = await workerResponse
      .json()
      .catch(() => null);

    if (
      !workerResponse.ok ||
      !workerData?.success ||
      typeof workerData.authority !== "string" ||
      !ZARINPAL_AUTHORITY_REGEX.test(workerData.authority) ||
      typeof workerData.paymentUrl !== "string"
    ) {
      console.error("ZarinPal VPS request rejected:", {
        status: workerResponse.status,
        error: workerData?.error,
        providerCode: workerData?.providerCode,
      });

      return NextResponse.json(
        {
          error:
            workerData?.error ||
            "ZarinPal could not create the payment request.",
        },
        { status: 502 },
      );
    }

    // Never redirect to an arbitrary URL returned by another server.
    let paymentUrl: URL;

    try {
      paymentUrl = new URL(workerData.paymentUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid payment URL received from payment service." },
        { status: 502 },
      );
    }

    if (
      paymentUrl.protocol !== "https:" ||
      paymentUrl.hostname !== "www.zarinpal.com" ||
      paymentUrl.pathname !==
        `/pg/StartPay/${workerData.authority}`
    ) {
      console.error(
        "Unexpected ZarinPal payment URL:",
        workerData.paymentUrl,
      );

      return NextResponse.json(
        { error: "Invalid payment URL received from payment service." },
        { status: 502 },
      );
    }

    // ------------------------------------------------------
    // Save Authority before redirecting the Buyer.
    // ------------------------------------------------------

    const {
      data: updatedPayment,
      error: authoritySaveError,
    } = await supabaseAdmin
      .from("payments")
      .update({
        gateway_authority: workerData.authority,
      })
      .eq("id", payment.id)
      .eq("status", "pending")
      .select(`
        id,
        order_id,
        gateway,
        transaction_id,
        gateway_authority,
        status,
        amount,
        currency,
        created_at
      `)
      .single();

    if (authoritySaveError || !updatedPayment) {
      console.error(
        "Failed to save ZarinPal authority:",
        authoritySaveError,
      );

      return NextResponse.json(
        {
          error:
            "Payment request was created, but could not be saved. Please retry.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      paymentUrl: paymentUrl.toString(),
      reused: Boolean(existingPayment),
    });
  } catch (error) {
    console.error("Payment API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
