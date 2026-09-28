"use client";

import { useState } from "react";

type CheckoutPaymentButtonProps = {
  orderId: string;
};

export default function CheckoutPaymentButton({
  orderId,
}: CheckoutPaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handlePayment() {
    try {
      setLoading(true);

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          gateway: "test",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to create payment");
        return;
      }

      window.location.href = `/payment/${data.payment.id}`;
    } catch (error) {
      console.error("Payment error:", error);
      alert("Something went wrong while creating payment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handlePayment}
      disabled={loading}
      className="mt-6 w-full rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? "Creating Payment..." : "Continue to Payment"}
    </button>
  );
}