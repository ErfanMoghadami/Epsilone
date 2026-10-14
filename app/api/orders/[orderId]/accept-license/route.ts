import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

type LicenseSnapshot = {
  version?: string;
  items?: unknown[];
};

type AcceptanceSnapshot = {
  version?: string;
};

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const { orderId } = await context.params;

    let body: { accepted?: boolean };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body.",
        },
        { status: 400 },
      );
    }

    if (!orderId || body.accepted !== true) {
      return NextResponse.json(
        {
          success: false,
          error: "You must accept the License Sheet.",
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        { status: 401 },
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        buyer_id,
        status,
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
        {
          success: false,
          error: "Order not found.",
        },
        { status: 404 },
      );
    }

    if (order.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: "This order is no longer awaiting payment.",
        },
        { status: 409 },
      );
    }

    const licenseSnapshot =
      order.license_document_snapshot as LicenseSnapshot | null;

    if (
      !licenseSnapshot ||
      !Array.isArray(licenseSnapshot.items) ||
      licenseSnapshot.items.length === 0 ||
      !order.license_document_version ||
      licenseSnapshot.version !== order.license_document_version
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The order-specific License Sheet is missing or invalid. Create a new order and try again.",
        },
        { status: 409 },
      );
    }

    // An already accepted, unchanged version is idempotent.
    if (
      order.license_accepted_at &&
      order.license_accepted_by === user.id
    ) {
      const prior =
        order.license_acceptance_snapshot as
          | AcceptanceSnapshot
          | null;

      if (prior?.version === order.license_document_version) {
        return NextResponse.json({
          success: true,
          alreadyAccepted: true,
          acceptedAt: order.license_accepted_at,
        });
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "The recorded acceptance does not match this License Sheet version.",
        },
        { status: 409 },
      );
    }

    const acceptedAt = new Date().toISOString();

    const acceptanceSnapshot = {
      version: order.license_document_version,
      orderId: order.id,
      buyerId: user.id,
      acceptedAt,
      document: licenseSnapshot,
    };

    const admin = createAdminClient();

    // Compare-and-set: record acceptance only if the order is
    // still pending and no previous acceptance exists.
    const {
      data: updatedOrder,
      error: updateError,
    } = await admin
      .from("orders")
      .update({
        license_accepted_at: acceptedAt,
        license_accepted_by: user.id,
        license_acceptance_user_agent:
          request.headers.get("user-agent")?.slice(0, 1000) ?? null,
        license_acceptance_snapshot: acceptanceSnapshot,
      })
      .eq("id", order.id)
      .eq("buyer_id", user.id)
      .eq("status", "pending")
      .is("license_accepted_at", null)
      .select("id, license_accepted_at")
      .maybeSingle();

    if (updateError) {
      console.error(
        "License acceptance update failed:",
        updateError,
      );

      return NextResponse.json(
        {
          success: false,
          error: "Could not record your acceptance.",
        },
        { status: 500 },
      );
    }

    if (!updatedOrder) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The order changed while recording acceptance. Refresh and try again.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      acceptedAt: updatedOrder.license_accepted_at,
      version: order.license_document_version,
    });
  } catch (error) {
    console.error("License acceptance error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to record License Sheet acceptance.",
      },
      { status: 500 },
    );
  }
}