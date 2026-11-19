
"use client";

import Link from "next/link";
import { useState } from "react";

type CheckoutPaymentButtonProps = {
  orderId: string;
};

type PaymentResponse = {
  success?: boolean;
  payment?: {
    id?: string;
  };
  paymentUrl?: string;
  error?: string;
};

export default function CheckoutPaymentButton({
  orderId,
}: CheckoutPaymentButtonProps) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePayment() {
    if (!accepted || loading) return;

    setLoading(true);
    setError("");

    try {
      // Step 1: Record License Sheet acceptance.
      const acceptanceResponse = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}/accept-license`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ accepted: true }),
        },
      );

      const acceptanceData = await acceptanceResponse.json();

      if (
        !acceptanceResponse.ok ||
        !acceptanceData.success
      ) {
        throw new Error(
          acceptanceData.error ||
            "Could not record License Sheet acceptance.",
        );
      }

      // Step 2: Create a real ZarinPal payment.
      const paymentResponse = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          gateway: "zarinpal",
        }),
      });

      const paymentData =
        (await paymentResponse.json()) as PaymentResponse;

      if (
        !paymentResponse.ok ||
        !paymentData.success ||
        !paymentData.payment?.id ||
        !paymentData.paymentUrl
      ) {
        throw new Error(
          paymentData.error ||
            "Failed to create ZarinPal payment.",
        );
      }

      // Step 3: Validate the redirect destination.
      const paymentUrl = new URL(paymentData.paymentUrl);

      if (
        paymentUrl.protocol !== "https:" ||
        paymentUrl.hostname !== "www.zarinpal.com" ||
        !paymentUrl.pathname.startsWith("/pg/StartPay/")
      ) {
        throw new Error("Invalid ZarinPal payment URL.");
      }

      // Step 4: Redirect the buyer to ZarinPal.
      window.location.assign(paymentUrl.toString());
    } catch (cause) {
      console.error("Checkout error:", cause);

      setError(
        cause instanceof Error
          ? cause.message
          : "Something went wrong. Please try again.",
      );

      setLoading(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) =>
            setAccepted(event.target.checked)
          }
          disabled={loading}
          className="mt-1 h-4 w-4 shrink-0 accent-white"
        />

        <span className="space-y-2 text-sm leading-7 text-zinc-300">
          <span
            lang="fa"
            dir="rtl"
            className="block text-right"
          >
            قرارداد لایسنس بیت و شرایط اختصاصی تمام بیت‌های این
            سفارش را مطالعه کرده‌ام و می‌پذیرم.
          </span>

          <span
            lang="en"
            className="block text-left text-zinc-400"
          >
            I have read and accept the Beat License Agreement
            and the specific license terms for every Beat in
            this order.
          </span>

          <Link
            href={`/checkout/${encodeURIComponent(orderId)}/license-sheet`}
            target="_blank"
            rel="noreferrer"
            className="inline-block underline underline-offset-4 hover:text-white"
          >
            مشاهده License Sheet این سفارش / View Order License Sheet
          </Link>
        </span>
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handlePayment}
        disabled={!accepted || loading}
        className="w-full rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading
          ? "در حال انتقال به درگاه… / Redirecting to ZarinPal…"
          : "پرداخت با زرین‌پال / Pay with ZarinPal"}
      </button>
    </div>
  );
}
