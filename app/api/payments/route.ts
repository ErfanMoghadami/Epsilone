import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type CreatePaymentBody = {
  orderId?: string;
  gateway?: string;
};

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

    // Load the order and make sure it belongs to the logged-in buyer.
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        `
          id,
          buyer_id,
          status,
          currency,
          total
        `,
      )
      .eq("id", orderId)
      .eq("buyer_id", user.id)
      .single();

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

    const supabaseAdmin = createAdminClient();
    const { data: orderItems, error: orderItemsError } = await supabaseAdmin
      .from("order_items")
      .select("beat_id")
      .eq("order_id", order.id);

    if (orderItemsError || !orderItems || orderItems.length === 0) {
      return NextResponse.json(
        { error: "Could not verify order items" },
        { status: 500 },
      );
    }

    const orderBeatIds = [...new Set(orderItems.map((item) => item.beat_id))];
    const { data: availableBeats, error: availableBeatsError } = await supabaseAdmin
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

    if ((availableBeats ?? []).length !== orderBeatIds.length) {
      return NextResponse.json(
        { error: "One or more beats in this order are OFF. Remove them from your cart and create a new order." },
        { status: 409 },
      );
    }

    const amount = Number(order.total);

    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json(
        { error: "Invalid order amount" },
        { status: 400 },
      );
    }

    // Reuse an existing pending payment for this order/gateway.
    const { data: existingPayment, error: existingPaymentError } =
      await supabase
        .from("payments")
        .select(
          `
            id,
            order_id,
            gateway,
            transaction_id,
            status,
            amount,
            currency,
            created_at
          `,
        )
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

    // Create a new pending payment.
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        order_id: order.id,
        gateway,
        transaction_id: null,
        status: "pending",
        amount,
        currency: order.currency,
      })
      .select(
        `
          id,
          order_id,
          gateway,
          transaction_id,
          status,
          amount,
          currency,
          created_at
        `,
      )
      .single();

    if (paymentError || !payment) {
      console.error("Failed to create payment:", paymentError);

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