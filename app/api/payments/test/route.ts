import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type TestPaymentBody = {
  paymentId?: string;
  result?: "success" | "failed";
};

export async function POST(request: Request) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_TEST_PAYMENTS !== "true"
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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

    let body: TestPaymentBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const paymentId = body.paymentId?.trim();
    const result = body.result;

    if (!paymentId) {
      return NextResponse.json(
        { error: "paymentId is required" },
        { status: 400 },
      );
    }

    if (result !== "success" && result !== "failed") {
      return NextResponse.json(
        { error: 'result must be "success" or "failed"' },
        { status: 400 },
      );
    }

    // Get the payment and verify that it belongs to the logged-in buyer.
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select(
        `
          id,
          order_id,
          gateway,
          status,
          amount,
          currency
        `,
      )
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.gateway !== "test") {
      return NextResponse.json(
        { error: "This endpoint only supports test payments" },
        { status: 400 },
      );
    }

    // Verify order ownership.
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        `
          id,
          buyer_id,
          status
        `,
      )
      .eq("id", payment.order_id)
      .eq("buyer_id", user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (payment.status !== "pending") {
      return NextResponse.json(
        {
          error: `Payment cannot be processed because its status is "${payment.status}"`,
        },
        { status: 400 },
      );
    }

    if (order.status !== "pending") {
      return NextResponse.json(
        {
          error: `Order cannot be processed because its status is "${order.status}"`,
        },
        { status: 400 },
      );
    }

    if (result === "success") {
      const { data: orderItems, error: orderItemsError } = await supabase
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
      const { data: availableBeats, error: availableBeatsError } = await supabase
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
          { error: "One or more beats in this order are OFF. The payment was not completed." },
          { status: 409 },
        );
      }

      const transactionId = `TEST-${crypto.randomUUID()}`;

      const { data: updatedPayment, error: updatePaymentError } = await supabase
        .from("payments")
        .update({
          status: "paid",
          transaction_id: transactionId,
          paid_at: new Date().toISOString(),
        })
        .eq("id", payment.id)
        .eq("status", "pending")
        .select(
          `
              id,
              order_id,
              gateway,
              transaction_id,
              status,
              amount,
              currency,
              paid_at
            `,
        )
        .single();

      if (updatePaymentError || !updatedPayment) {
        console.error("Failed to update payment:", updatePaymentError);

        return NextResponse.json(
          { error: "Failed to update payment" },
          { status: 500 },
        );
      }

      const { data: updatedOrder, error: updateOrderError } = await supabase
        .from("orders")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .eq("status", "pending")
        .select(
          `
              id,
              status,
              paid_at
            `,
        )
        .single();

      if (updateOrderError || !updatedOrder) {
        console.error("Failed to update order:", updateOrderError);

        return NextResponse.json(
          {
            error: "Payment was updated, but order status could not be updated",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        result: "success",
        payment: updatedPayment,
        order: updatedOrder,
      });
    }

    const { data: updatedPayment, error: updatePaymentError } = await supabase
      .from("payments")
      .update({
        status: "failed",
      })
      .eq("id", payment.id)
      .eq("status", "pending")
      .select(
        `
            id,
            order_id,
            gateway,
            transaction_id,
            status,
            amount,
            currency,
            paid_at
          `,
      )
      .single();

    if (updatePaymentError || !updatedPayment) {
      console.error("Failed to update failed payment:", updatePaymentError);

      return NextResponse.json(
        { error: "Failed to update payment" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      result: "failed",
      payment: updatedPayment,
      order: {
        id: order.id,
        status: order.status,
      },
    });
  } catch (error) {
    console.error("Test payment error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
