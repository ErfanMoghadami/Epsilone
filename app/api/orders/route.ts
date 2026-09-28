import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CartItem = {
  beatId: string;
  licenseId: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // --------------------------------------------------
    // 1. Get authenticated user
    // --------------------------------------------------

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in to checkout.",
        },
        { status: 401 },
      );
    }

    // --------------------------------------------------
    // 2. Read cart
    // --------------------------------------------------

    const body = await request.json();

    const items = body?.items as CartItem[];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cart is empty.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 3. Validate cart item shape
    // --------------------------------------------------

    const validItems = items.filter(
      (item) =>
        item &&
        typeof item.beatId === "string" &&
        typeof item.licenseId === "string",
    );

    if (validItems.length !== items.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid cart items.",
        },
        { status: 400 },
      );
    }

    // Prevent duplicate beat/license pairs
    const uniqueKeys = new Set(
      validItems.map(
        (item) => `${item.beatId}:${item.licenseId}`,
      ),
    );

    if (uniqueKeys.size !== validItems.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Duplicate cart items are not allowed.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 4. Load real licenses from DB
    // --------------------------------------------------

    const licenseIds = validItems.map(
      (item) => item.licenseId,
    );

    const beatIds = validItems.map(
      (item) => item.beatId,
    );

    const { data: licenses, error: licensesError } =
      await supabase
        .from("beat_licenses")
        .select(
          "id, beat_id, license_type, price, currency, is_active",
        )
        .in("id", licenseIds)
        .eq("is_active", true);

    if (licensesError) {
      return NextResponse.json(
        {
          success: false,
          error: licensesError.message,
        },
        { status: 500 },
      );
    }

    if (!licenses || licenses.length !== validItems.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            "One or more selected licenses are no longer available.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 5. Load real beats from DB
    // --------------------------------------------------

    const { data: beats, error: beatsError } = await supabase
      .from("beats")
      .select("id, title, producer_id")
      .in("id", beatIds);

    if (beatsError) {
      return NextResponse.json(
        {
          success: false,
          error: beatsError.message,
        },
        { status: 500 },
      );
    }

    if (!beats || beats.length !== validItems.length) {
      return NextResponse.json(
        {
          success: false,
          error: "One or more beats no longer exist.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 6. Build verified order items
    // --------------------------------------------------

    const verifiedItems = validItems.map((cartItem) => {
      const license = licenses.find(
        (item) => item.id === cartItem.licenseId,
      );

      const beat = beats.find(
        (item) => item.id === cartItem.beatId,
      );

      if (!license || !beat) {
        throw new Error("Invalid cart item.");
      }

      if (license.beat_id !== beat.id) {
        throw new Error(
          "License does not belong to selected beat.",
        );
      }

      if (!beat.producer_id) {
        throw new Error(
          `Beat "${beat.title}" has no producer.`,
        );
      }

      return {
        beat_id: beat.id,
        producer_id: beat.producer_id,
        title_snapshot: beat.title,
        unit_price: Number(license.price),
        license_type: license.license_type,
        currency: license.currency,
      };
    });

    // --------------------------------------------------
    // 7. Make sure all currencies match
    // --------------------------------------------------

    const currencies = new Set(
      verifiedItems.map((item) => item.currency),
    );

    if (currencies.size !== 1) {
      return NextResponse.json(
        {
          success: false,
          error: "All items in one order must use the same currency.",
        },
        { status: 400 },
      );
    }

    const currency = verifiedItems[0].currency;

    const subtotal = verifiedItems.reduce(
      (sum, item) => sum + item.unit_price,
      0,
    );

    // --------------------------------------------------
    // 8. Create order
    // --------------------------------------------------

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        buyer_id: user.id,
        status: "pending",
        currency,
        subtotal,
        total: subtotal,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        {
          success: false,
          error:
            orderError?.message ?? "Failed to create order.",
        },
        { status: 500 },
      );
    }

    // --------------------------------------------------
    // 9. Create order items
    // --------------------------------------------------

    const orderItems = verifiedItems.map((item) => ({
      order_id: order.id,
      beat_id: item.beat_id,
      producer_id: item.producer_id,
      title_snapshot: item.title_snapshot,
      unit_price: item.unit_price,
      license_type: item.license_type,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      // Best-effort cleanup
      await supabase
        .from("orders")
        .delete()
        .eq("id", order.id);

      return NextResponse.json(
        {
          success: false,
          error: itemsError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      subtotal,
      total: subtotal,
      currency,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create order.",
      },
      { status: 500 },
    );
  }
}