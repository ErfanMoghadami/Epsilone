
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveTerms } from "@/lib/licenses";

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
    // 2. Read and validate cart
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

    // Prevent duplicate beat/license pairs.
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

    const licenseIds = validItems.map(
      (item) => item.licenseId,
    );

    // A cart can contain different licenses for the same beat.
    const beatIds = [
      ...new Set(validItems.map((item) => item.beatId)),
    ];

    // --------------------------------------------------
    // 3. Load real licenses from DB
    // --------------------------------------------------

    const {
      data: licenses,
      error: licensesError,
    } = await supabase
      .from("beat_licenses")
      .select(
        "id, beat_id, license_type, price, currency, is_active, includes_stems, terms",
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
    // 4. Load real beats from DB
    // --------------------------------------------------

    const {
      data: beats,
      error: beatsError,
    } = await supabase
      .from("beats")
      .select(
        "id, title, producer_id, stems_key, exclusive_sold_at",
      )
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

    if (!beats || beats.length !== beatIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: "One or more beats no longer exist.",
        },
        { status: 400 },
      );
    }

    // A beat that has already been sold exclusively
    // must not be available for another purchase.
    const soldBeat = beats.find(
      (beat) => beat.exclusive_sold_at !== null,
    );

    if (soldBeat) {
      return NextResponse.json(
        {
          success: false,
          error:
            `"${soldBeat.title}" is no longer available for purchase.`,
        },
        { status: 409 },
      );
    }

    // --------------------------------------------------
    // 5. Check exclusive availability
    // --------------------------------------------------
    // This checks both completed exclusive sales and
    // active reservations made by other pending orders.

    const availabilityChecks = await Promise.all(
      beatIds.map(async (beatId) => {
        const { data, error } = await supabase.rpc(
          "is_exclusive_beat_available",
          {
            p_beat_id: beatId,
          },
        );

        return {
          beatId,
          available: data,
          error,
        };
      }),
    );

    const availabilityError = availabilityChecks.find(
      (result) => result.error,
    );

    if (availabilityError?.error) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Could not verify beat availability. Please try again.",
        },
        { status: 500 },
      );
    }

    const unavailableBeat = availabilityChecks.find(
      (result) => result.available !== true,
    );

    if (unavailableBeat) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A beat in your cart is sold exclusively or temporarily reserved. Please refresh your cart.",
        },
        { status: 409 },
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

      // A license cannot include stems if the beat
      // no longer has a Stem Pack.
      if (
        license.includes_stems &&
        (!beat.stems_key || beat.stems_key.trim() === "")
      ) {
        throw new Error(
          `The selected license for "${beat.title}" includes stems, but the Stem Pack is no longer available.`,
        );
      }

      const unitPrice = Number(license.price);

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(
          `Invalid price for "${beat.title}".`,
        );
      }

      return {
        beat_id: beat.id,
        producer_id: beat.producer_id,
        title_snapshot: beat.title,
        unit_price: unitPrice,
        license_type: license.license_type,
        currency:
          typeof license.currency === "string"
            ? license.currency.trim().toUpperCase()
            : "",
        includes_stems: Boolean(license.includes_stems),

        // Preserve the effective terms as they were
        // when the order was created.
        license_terms: resolveTerms(
          license.license_type,
          license.terms,
        ),
      };
    });

    // --------------------------------------------------
    // 7. Validate order currency
    // --------------------------------------------------

    const currencies = new Set(
      verifiedItems.map((item) => item.currency),
    );

    if (currencies.size !== 1) {
      return NextResponse.json(
        {
          success: false,
          error:
            "All items in one order must use the same currency.",
        },
        { status: 400 },
      );
    }

    const currency = verifiedItems[0].currency;

    if (currency !== "TOMAN") {
      return NextResponse.json(
        {
          success: false,
          error: "Only TOMAN orders are currently supported.",
        },
        { status: 400 },
      );
    }

    const subtotal = verifiedItems.reduce(
      (sum, item) => sum + item.unit_price,
      0,
    );

    // --------------------------------------------------
    // 8. Create pending order
    // --------------------------------------------------

    const {
      data: order,
      error: orderError,
    } = await supabase
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
    // 9. Create order items and snapshot license terms
    // --------------------------------------------------

    const capturedAt = new Date().toISOString();

    const orderItems = verifiedItems.map((item) => ({
      order_id: order.id,
      beat_id: item.beat_id,
      producer_id: item.producer_id,
      title_snapshot: item.title_snapshot,
      unit_price: item.unit_price,
      license_type: item.license_type,
      includes_stems: item.includes_stems,

      // Immutable copy of the terms at purchase time.
      license_terms_snapshot: {
        license_type: item.license_type,
        terms: item.license_terms,
        includes_stems: item.includes_stems,
        captured_at: capturedAt,
      },
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      // Best-effort cleanup.
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

    // --------------------------------------------------
    // 10. Reserve Exclusive licenses
    // --------------------------------------------------
    // Reservation happens only after the order and its
    // items exist, so the database can validate the order.
    // The reservation RPC must enforce exclusivity atomically.

    const needsExclusiveReservation = verifiedItems.some(
      (item) =>
        item.license_type.trim().toLowerCase() === "exclusive",
    );

    if (needsExclusiveReservation) {
      const {
        data: reservationData,
        error: reservationError,
      } = await supabase.rpc("reserve_exclusive_order", {
        p_order_id: order.id,
      });

      const reservationReportedFailure =
        reservationData === false ||
        (typeof reservationData === "object" &&
          reservationData !== null &&
          "success" in reservationData &&
          reservationData.success === false);

      if (
        reservationError ||
        reservationReportedFailure
      ) {
        // Best-effort cleanup if the reservation fails.
        await supabase
          .from("order_items")
          .delete()
          .eq("order_id", order.id);

        await supabase
          .from("orders")
          .delete()
          .eq("id", order.id)
          .eq("buyer_id", user.id);

        return NextResponse.json(
          {
            success: false,
            error:
              "This Exclusive license is no longer available. Please refresh your cart and try again.",
          },
          { status: 409 },
        );
      }
    }

    // --------------------------------------------------
    // 11. Return order information
    // --------------------------------------------------

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
