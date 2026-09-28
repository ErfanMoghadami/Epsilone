import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import CheckoutPaymentButton from "@/components/CheckoutPaymentButton";

type CheckoutPageProps = {
  params: Promise<{
    orderId: string;
  }>;
};

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { orderId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      `
        id,
        buyer_id,
        status,
        currency,
        subtotal,
        total,
        created_at
      `,
    )
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .single();

  if (orderError || !order) {
    notFound();
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select(
      `
        id,
        beat_id,
        title_snapshot,
        unit_price,
        license_type
      `,
    )
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });

  if (itemsError) {
    throw new Error("Failed to load order items");
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-white">
      <div className="mb-10">
        <p className="mb-2 text-sm text-zinc-500">Order #{order.id}</p>

        <h1 className="text-3xl font-bold">Checkout</h1>

        <p className="mt-2 text-zinc-500">
          Review your order before continuing to payment.
        </p>
      </div>

      <div className="space-y-3">
        {items?.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
          >
            <div>
              <h2 className="font-semibold">{item.title_snapshot}</h2>

              <p className="mt-1 text-sm text-zinc-500">
                {item.license_type} License
              </p>
            </div>

            <div className="font-medium">
              {order.currency === "USD" ? "$" : order.currency}{" "}
              {Number(item.unit_price).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">Subtotal</span>

          <span>
            {order.currency === "USD" ? "$" : order.currency}{" "}
            {Number(order.subtotal).toFixed(2)}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
          <span className="text-lg font-semibold">Total</span>

          <span className="text-2xl font-bold">
            {order.currency === "USD" ? "$" : order.currency}{" "}
            {Number(order.total).toFixed(2)}
          </span>
        </div>

        <CheckoutPaymentButton orderId={order.id} />
      </div>
    </main>
  );
}
