
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUTHORITY_REGEX = /^[AS][a-zA-Z0-9]{35}$/;

type WorkerVerifyResponse = {
  success?: boolean;
  code?: number;
  alreadyVerified?: boolean;
  refId?: string | null;
  providerCode?: number | null;
  error?: string;
};

function redirectToPayment(
  request: Request,
  paymentId: string,
  result: "success" | "failed",
) {
  const url = new URL(
    `/payment/${encodeURIComponent(paymentId)}/${result}`,
    request.url,
  );

  return NextResponse.redirect(url, 303);
}

function getVpsConfig() {
  const workerUrl = process.env.VPS_WORKER_URL
    ?.trim()
    .replace(/\/+$/, "");

  const workerSecret = process.env.VPS_WORKER_SECRET?.trim();

  if (!workerUrl || !workerSecret) {
    return null;
  }

  try {
    const parsed = new URL(workerUrl);

    // Never send VPS_WORKER_SECRET over public HTTP.
    if (parsed.protocol !== "https:") {
      return null;
    }

    return { workerUrl, workerSecret };
  } catch {
    return null;
  }
}

async function getPaymentStatus(
  admin: ReturnType<typeof createAdminClient>,
  paymentId: string,
) {
  const { data, error } = await admin
    .from("payments")
    .select("status")
    .eq("id", paymentId)
    .maybeSingle();

  if (error) {
    console.error("Payment status recheck failed:", error);
    return null;
  }

  return data?.status ?? null;
}

export async function GET(request: Request) {
  const callbackUrl = new URL(request.url);

  const authority =
    callbackUrl.searchParams.get("Authority")?.trim();

  const bankStatus =
    callbackUrl.searchParams.get("Status")?.trim().toUpperCase();

  if (!authority || !AUTHORITY_REGEX.test(authority)) {
    return NextResponse.json(
      { error: "Invalid or missing payment Authority." },
      { status: 400 },
    );
  }

  let admin: ReturnType<typeof createAdminClient>;

  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("Supabase admin initialization failed:", error);

    return NextResponse.json(
      { error: "Payment service is temporarily unavailable." },
      { status: 503 },
    );
  }

  // Find the exact payment created before redirecting to ZarinPal.
  const {
    data: payment,
    error: paymentLookupError,
  } = await admin
    .from("payments")
    .select(`
      id,
      order_id,
      gateway,
      gateway_authority,
      transaction_id,
      status,
      amount,
      currency
    `)
    .eq("gateway", "zarinpal")
    .eq("gateway_authority", authority)
    .maybeSingle();

  if (paymentLookupError) {
    console.error(
      "ZarinPal payment lookup failed:",
      paymentLookupError,
    );

    return NextResponse.json(
      { error: "Could not locate the payment." },
      { status: 500 },
    );
  }

  if (!payment) {
    return NextResponse.json(
      { error: "Payment not found for this Authority." },
      { status: 404 },
    );
  }

  // A repeated callback must never complete a sale twice.
  if (payment.status === "paid") {
    return redirectToPayment(request, payment.id, "success");
  }

  if (payment.status !== "pending") {
    return redirectToPayment(request, payment.id, "failed");
  }

  // The bank's cancellation response is not a successful payment.
  if (bankStatus === "NOK") {
    const {
      data: cancelledPayment,
      error: cancelError,
    } = await admin
      .from("payments")
      .update({ status: "cancelled" })
      .eq("id", payment.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (cancelError) {
      console.error(
        "Could not mark cancelled payment:",
        cancelError,
      );

      return NextResponse.json(
        { error: "Could not update payment status." },
        { status: 500 },
      );
    }

    if (!cancelledPayment) {
      const currentStatus = await getPaymentStatus(
        admin,
        payment.id,
      );

      if (currentStatus === "paid") {
        return redirectToPayment(
          request,
          payment.id,
          "success",
        );
      }
    }

    return redirectToPayment(request, payment.id, "failed");
  }

  if (bankStatus !== "OK") {
    return NextResponse.json(
      { error: "Unexpected ZarinPal callback status." },
      { status: 400 },
    );
  }

  // Load the order from our own database.
  const {
    data: order,
    error: orderError,
  } = await admin
    .from("orders")
    .select(`
      id,
      buyer_id,
      status,
      total,
      currency
    `)
    .eq("id", payment.order_id)
    .maybeSingle();

  if (orderError || !order) {
    console.error("Callback order lookup failed:", orderError);

    return NextResponse.json(
      { error: "The payment order could not be located." },
      { status: 500 },
    );
  }

  if (order.status !== "pending") {
    console.error("Verified callback belongs to a non-pending order:", {
      paymentId: payment.id,
      orderId: order.id,
      orderStatus: order.status,
    });

    return NextResponse.json(
      {
        error:
          "The bank callback was received, but the order is no longer pending. Manual reconciliation is required. Do not pay again.",
        paymentId: payment.id,
      },
      { status: 409 },
    );
  }

  // Epsilone's ZarinPal integration supports Toman orders only.
  if (
    payment.currency !== "TOMAN" ||
    order.currency !== "TOMAN"
  ) {
    console.error("ZarinPal currency mismatch:", {
      paymentId: payment.id,
      paymentCurrency: payment.currency,
      orderCurrency: order.currency,
    });

    return NextResponse.json(
      { error: "Payment currency mismatch. Manual review required." },
      { status: 409 },
    );
  }

  // The amount must come from the database, never from callback parameters.
  const paymentAmount = Number(payment.amount);
  const orderTotal = Number(order.total);

  if (
    !Number.isSafeInteger(paymentAmount) ||
    paymentAmount <= 0 ||
    !Number.isSafeInteger(orderTotal) ||
    paymentAmount !== orderTotal
  ) {
    console.error("ZarinPal amount mismatch:", {
      paymentId: payment.id,
      paymentAmount,
      orderTotal,
    });

    return NextResponse.json(
      { error: "Payment amount mismatch. Manual review required." },
      { status: 409 },
    );
  }

  // Epsilone stores Toman; ZarinPal receives Rial.
  const amountRial = paymentAmount * 10;

  if (
    !Number.isSafeInteger(amountRial) ||
    amountRial < 10_000
  ) {
    return NextResponse.json(
      { error: "Invalid ZarinPal verification amount." },
      { status: 400 },
    );
  }

  // Verify only through the authenticated VPS endpoint.
  const vps = getVpsConfig();

  if (!vps) {
    console.error(
      "VPS_WORKER_URL must use HTTPS and VPS credentials must be configured.",
    );

    return NextResponse.json(
      {
        error:
          "Secure payment verification is not configured. The payment remains pending. Do not pay again.",
        paymentId: payment.id,
      },
      { status: 503 },
    );
  }

  let verifyResponse: Response;

  try {
    verifyResponse = await fetch(
      `${vps.workerUrl}/zarinpal/verify`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${vps.workerSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authority,
          amountRial,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      },
    );
  } catch (error) {
    console.error(
      "VPS ZarinPal verification connection failed:",
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json(
      {
        error:
          "Could not reach the payment verification service. The payment remains pending. Do not pay again.",
        paymentId: payment.id,
      },
      { status: 503 },
    );
  }

  const verifyData =
    (await verifyResponse.json().catch(() => null)) as
      | WorkerVerifyResponse
      | null;

  if (!verifyResponse.ok || !verifyData?.success) {
    console.error("ZarinPal verification was rejected:", {
      paymentId: payment.id,
      httpStatus: verifyResponse.status,
      providerCode: verifyData?.providerCode ?? null,
      error: verifyData?.error ?? null,
    });

    // A provider response with a definite failure code means
    // this attempt failed. Network/authentication errors do not.
    const providerCode = verifyData?.providerCode;

    if (
      typeof providerCode === "number" &&
      providerCode !== 100 &&
      providerCode !== 101
    ) {
      const { error: failedUpdateError } = await admin
        .from("payments")
        .update({ status: "failed" })
        .eq("id", payment.id)
        .eq("status", "pending");

      if (failedUpdateError) {
        console.error(
          "Could not mark rejected payment as failed:",
          failedUpdateError,
        );
      }
    }

    return NextResponse.json(
      {
        error:
          "ZarinPal could not verify the payment. Check the payment status before trying again.",
        paymentId: payment.id,
        providerCode: providerCode ?? null,
      },
      { status: 502 },
    );
  }

  // ZarinPal: 100 = verified now, 101 = already verified.
  if (
    verifyData.code !== 100 &&
    verifyData.code !== 101
  ) {
    return NextResponse.json(
      {
        error: "Unexpected ZarinPal verification response.",
        paymentId: payment.id,
      },
      { status: 502 },
    );
  }

  const refId =
    typeof verifyData.refId === "string"
      ? verifyData.refId.trim()
      : "";

  if (!/^\d+$/.test(refId)) {
    console.error("Successful verification did not return a valid Ref ID:", {
      paymentId: payment.id,
      code: verifyData.code,
    });

    return NextResponse.json(
      {
        error:
          "ZarinPal verification succeeded but did not return a valid Ref ID. Manual review is required. Do not pay again.",
        paymentId: payment.id,
      },
      { status: 503 },
    );
  }

  // Finalize order and payment in one database transaction.
  // The existing RPC checks ownership, gateway, amount, currency,
  // locks the rows and preserves Exclusive reservation triggers.
  const {
    data: completion,
    error: completionError,
  } = await admin.rpc("complete_verified_payment", {
    p_payment_id: payment.id,
    p_buyer_id: order.buyer_id,
    p_gateway: "zarinpal",
    p_transaction_id: refId,
  });

  if (completionError || completion?.success !== true) {
    console.error("Verified payment could not be finalized:", {
      paymentId: payment.id,
      orderId: order.id,
      refId,
      error: completionError,
      completion,
    });

    // Handle the case where the DB committed but the HTTP response
    // was lost, or another callback finalized the same payment.
    const latestStatus = await getPaymentStatus(
      admin,
      payment.id,
    );

    if (latestStatus === "paid") {
      return redirectToPayment(
        request,
        payment.id,
        "success",
      );
    }

    // Do not mark the payment failed: the bank has verified it.
    // It must remain available for safe reconciliation/retry.
    return NextResponse.json(
      {
        error:
          "The bank verified your payment, but Epsilone could not finish the order. Do not pay again. Contact support and provide this Payment ID.",
        paymentId: payment.id,
        refId,
      },
      { status: 503 },
    );
  }

  return redirectToPayment(request, payment.id, "success");
}
