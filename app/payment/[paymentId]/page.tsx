import { notFound, redirect } from "next/navigation";

import PaymentTestControls from "@/components/PaymentTestControls";
import { createClient } from "@/lib/supabase/server";

type PaymentPageProps = {
  params: Promise<{
    paymentId: string;
  }>;
};

export default async function PaymentPage({
  params,
}: PaymentPageProps) {
  const { paymentId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select(
      `
        id,
        order_id,
        gateway,
        status,
        amount,
        currency,
        transaction_id,
        paid_at,
        created_at
      `,
    )
    .eq("id", paymentId)
    .single();

  if (paymentError || !payment) {
    notFound();
  }

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
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-white">
      <div className="mb-8">
        <p className="mb-2 text-sm text-zinc-500">
          Order #{order.id}
        </p>

        <h1 className="text-3xl font-bold">Payment</h1>

        <p className="mt-2 text-zinc-500">
          Complete your payment to finish the order.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Payment ID</span>
            <span className="max-w-[260px] truncate text-sm">
              {payment.id}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Gateway</span>
            <span>{payment.gateway}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Status</span>
            <span className="font-medium capitalize">
              {payment.status}
            </span>
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Amount</span>

              <span className="text-2xl font-bold">
                {payment.currency === "USD"
                  ? "$"
                  : payment.currency}{" "}
                {Number(payment.amount).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {payment.status === "pending" ? (
          <PaymentTestControls paymentId={payment.id} />
        ) : (
          <div className="mt-6 rounded-xl border border-zinc-800 p-4 text-center">
            <p className="text-sm text-zinc-400">
              Payment status:{" "}
              <span className="font-medium text-white">
                {payment.status}
              </span>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}