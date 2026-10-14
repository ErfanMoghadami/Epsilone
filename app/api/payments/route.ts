
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
    const gateway = body.gateway?.trim() || "test";

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 },
      );
    }

    // For now we only support the test gateway.
    if (gateway !== "test") {
      return NextResponse.json(
        { error: "Unsupported payment gateway" },
        { status: 400 },
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
    // Verify the order-specific License Sheet.
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
    // Verify the payable amount.
    // ------------------------------------------------------

    const amount = Number(order.total);

    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json(
        { error: "Invalid order amount" },
        { status: 400 },
      );
    }

    // ------------------------------------------------------
    // Reuse an existing pending payment for this order/gateway.
    // License acceptance is checked before reusing a payment.
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
      return NextResponse.json({
        success: true,
        payment: existingPayment,
        reused: true,
      });
    }

    // ------------------------------------------------------
    // Create a new pending payment.
    // ------------------------------------------------------

    const { data: payment, error: paymentError } =
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
          status,
          amount,
          currency,
          created_at
        `)
        .single();

    if (paymentError || !payment) {
      console.error(
        "Failed to create payment:",
        paymentError,
      );

      return NextResponse.json(
        { error: "Failed to create payment" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      payment,
      reused: false,
    });
  } catch (error) {
    console.error("Payment API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
