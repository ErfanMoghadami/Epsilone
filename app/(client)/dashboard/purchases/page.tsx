import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { formatPriceAmount } from "@/lib/format-price";

type OrderItem = {
  id: string;
  order_id: string;
  title_snapshot: string;
  unit_price: number | string;
  license_type: string;
  beat_id: string;
  includes_stems: boolean;
};

type Order = {
  id: string;
  status: string;
  currency: string;
  total: number | string;
  created_at: string;
  paid_at: string | null;
};

export default async function PurchasesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(
      `
        id,
        status,
        currency,
        total,
        created_at,
        paid_at
      `,
    )
    .eq("buyer_id", user.id)
    .eq("status", "paid")
    .order("created_at", { ascending: false });

  if (ordersError) {
    throw new Error("بارگذاری خریدها انجام نشد");
  }

  const orderIds = (orders ?? []).map((order) => order.id);

  let orderItems: OrderItem[] = [];

  if (orderIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select(
        `
          id,
          order_id,
          beat_id,
          title_snapshot,
          unit_price,
          license_type,
          includes_stems
        `,
      )
      .in("order_id", orderIds);

    if (itemsError) {
      throw new Error("بارگذاری بیت‌های خریداری‌شده انجام نشد");
    }

    orderItems = (items ?? []) as OrderItem[];
  }

  const itemsByOrder = new Map<string, OrderItem[]>();

  for (const item of orderItems) {
    const orderId = item.order_id;

    const existing = itemsByOrder.get(orderId) ?? [];
    existing.push(item);
    itemsByOrder.set(orderId, existing);
  }

  return (
    <main className="mx-auto max-w-5xl px-0 py-4 text-white sm:py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold">خریدها</h1>

        <p className="mt-2 text-zinc-500">
          بیت‌ها و لایسنس‌هایی که خریدی.
        </p>
      </div>

      {orders && orders.length > 0 ? (
        <div className="space-y-6">
          {orders.map((order) => {
            const items = itemsByOrder.get(order.id) ?? [];

            return (
              <section
                key={order.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6"
              >
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-600">
                      سفارش
                    </p>

                    <p className="mt-1 break-all font-mono text-sm text-zinc-400">
                      {order.id}
                    </p>
                  </div>

                  <div className="text-end">
                    <p className="text-xs text-zinc-600">
                      تاریخ خرید
                    </p>

                    <p className="mt-1 text-sm text-zinc-400">
                      {new Date(
                        order.paid_at ?? order.created_at,
                      ).toLocaleDateString("fa-IR")}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-4 rounded-xl border border-zinc-800 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <h2 className="font-semibold">
                          {item.title_snapshot}
                        </h2>

                        <p className="mt-1 text-sm text-zinc-500">
                          لایسنس {item.license_type}
                        </p>

                        <p
                          className={`mt-2 text-xs ${
                            item.includes_stems
                              ? "text-zinc-300"
                              : "text-zinc-600"
                          }`}
                        >
                          {item.includes_stems
                            ? "✓ شامل Stems"
                            : "فقط بیت · بدون Stems"}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 sm:items-end">
                        <span className="font-medium">
                          {formatPriceAmount(item.unit_price)}
                        </span>

                        <div className="flex flex-wrap gap-2">
                          <a
                            href={`/api/download/${item.beat_id}?type=master`}
                            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-900"
                          >
                            دانلود مستر
                          </a>

                          {item.includes_stems && (
                            <a
                              href={`/api/download/${item.beat_id}?type=stems`}
                              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-900"
                            >
                              دانلود Stems
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-zinc-800 pt-5">
                  <span className="text-zinc-500">
                    جمع سفارش
                  </span>

                  <span className="text-xl font-bold">
                    {formatPriceAmount(order.total)}
                  </span>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center">
          <h2 className="text-xl font-semibold">
            هنوز خریدی نداشتی
          </h2>

          <p className="mt-2 text-zinc-500">
            بیت‌هایی که بخری اینجا نمایش داده می‌شن.
          </p>
        </div>
      )}
    </main>
  );
}