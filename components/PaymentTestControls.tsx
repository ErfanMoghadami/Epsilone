"use client";

import { useState } from "react";

type PaymentTestControlsProps = {
  paymentId: string;
};

export default function PaymentTestControls({
  paymentId,
}: PaymentTestControlsProps) {
  const [loading, setLoading] = useState(false);

  async function processPayment(
    result: "success" | "failed",
  ) {
    try {
      setLoading(true);

      const response = await fetch("/api/payments/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentId,
          result,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Payment failed");
        return;
      }

      if (result === "success") {
        window.location.href = `/payment/${paymentId}/success`;
      } else {
        window.location.href = `/payment/${paymentId}/failed`;
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 space-y-3">
      <button
        type="button"
        onClick={() => processPayment("success")}
        disabled={loading}
        className="w-full rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Processing..." : "Test Successful Payment"}
      </button>

      <button
        type="button"
        onClick={() => processPayment("failed")}
        disabled={loading}
        className="w-full rounded-xl border border-zinc-700 px-5 py-3 font-semibold text-white transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Test Failed Payment
      </button>
    </div>
  );
}