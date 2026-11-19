
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/currency";

type SheetItem = {
  beatId: string;
  beatTitle: string;
  licenseType: string;
  price: number;
  currency: string;
};

type LicenseDocumentSnapshot = {
  version: string;
  documentType: string;
  items: SheetItem[];
};

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
  license_document_version: string | null;
  license_document_snapshot: unknown;
};

function hasIndividualLicenseDocument(
  order: Order,
  item: OrderItem,
): boolean {
  const sheet =
    order.license_document_snapshot as
      | LicenseDocumentSnapshot
      | null;

  if (
    !sheet ||
    sheet.documentType !== "beat-license" ||
    sheet.version !== order.license_document_version ||
    !Array.isArray(sheet.items)
  ) {
    return false;
  }

  return sheet.items.some(
    (snapshotItem) =>
      snapshotItem.beatId === item.beat_id &&
      snapshotItem.beatTitle === item.title_snapshot &&
      snapshotItem.licenseType === item.license_type &&
      snapshotItem.currency === order.currency &&
      Number(snapshotItem.price) === Number(item.unit_price),
  );
}

function licenseLabel(value: string) {
  switch (value) {
    case "Basic":
      return "پایه (Basic)";

    case "Premium":
      return "پیشرفته (Premium)";

    case "Exclusive":
      return "انحصاری (Exclusive)";

    default:
      return value;
  }
}

export default async function PurchasesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: rawOrders, error: ordersError } = await supabase
    .from("orders")
    .select(`
      id,
      status,
      currency,
      total,
      created_at,
      paid_at,
      license_document_version,
      license_document_snapshot
    `)
    .eq("buyer_id", user.id)
    .eq("status", "paid")
    .order("created_at", { ascending: false });

  if (ordersError) {
    console.error("Purchases orders error:", ordersError);
    throw new Error("بارگذاری خریدها انجام نشد.");
  }

  const orders = (rawOrders ?? []) as Order[];

  const orderIds = orders.map((order) => order.id);

  let orderItems: OrderItem[] = [];

  if (orderIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select(`
        id,
        order_id,
        beat_id,
        title_snapshot,
        unit_price,
        license_type,
        includes_stems
      `)
      .in("order_id", orderIds);

    if (itemsError) {
      console.error("Purchases items error:", itemsError);
      throw new Error("بارگذاری بیت‌های خریداری‌شده انجام نشد.");
    }

    orderItems = (items ?? []) as OrderItem[];
  }

  const itemsByOrder = new Map<string, OrderItem[]>();

  for (const item of orderItems) {
    const existing = itemsByOrder.get(item.order_id) ?? [];

    existing.push(item);

    itemsByOrder.set(item.order_id, existing);
  }

  return (
    <main
      lang="fa"
      dir="rtl"
      className="mx-auto max-w-5xl px-0 py-4 text-white sm:py-12"
    >
      <header className="mb-10">
        <h1 className="text-3xl font-bold">
          خریدهای من
        </h1>

        <p className="mt-3 leading-8 text-zinc-500">
          بیت‌های خریداری‌شده، فایل‌های مربوط به هر خرید و
          اسناد اختصاصی مجوز استفاده از آن‌ها.
        </p>
      </header>

      {orders.length > 0 ? (
        <div className="space-y-6">
          {orders.map((order) => {
            const items = itemsByOrder.get(order.id) ?? [];

            return (
              <section
                key={order.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6"
              >
                <header className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
                  <div>
                    <p className="text-xs text-zinc-500">
                      شماره سفارش
                    </p>

                    <p
                      dir="ltr"
                      className="mt-2 break-all font-mono text-sm text-zinc-400"
                    >
                      {order.id}
                    </p>
                  </div>

                  <div className="text-left">
                    <p className="text-xs text-zinc-500">
                      تاریخ خرید
                    </p>

                    <p className="mt-2 text-sm text-zinc-400">
                      {new Date(
                        order.paid_at ?? order.created_at,
                      ).toLocaleDateString("fa-IR")}
                    </p>

                    <p className="mt-1 text-xs text-emerald-400">
                      پرداخت‌شده
                    </p>
                  </div>
                </header>

                <div className="space-y-3">
                  {items.map((item) => {
                    const hasDocument =
                      hasIndividualLicenseDocument(order, item);

                    return (
                      <article
                        key={item.id}
                        className="rounded-xl border border-zinc-800 p-4"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h2 className="font-semibold">
                              {item.title_snapshot}
                            </h2>

                            <p className="mt-2 text-sm text-zinc-500">
                              لایسنس:{" "}
                              {licenseLabel(item.license_type)}
                            </p>

                            <p className="mt-2 text-sm text-zinc-400">
                              {formatMoney(
                                item.unit_price,
                                order.currency,
                              )}
                            </p>

                            <p className="mt-2 text-xs text-zinc-500">
                              {item.includes_stems
                                ? "✓ شامل Stem Pack"
                                : "فقط بیت · بدون Stem Pack"}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <a
                              href={`/api/download/${encodeURIComponent(item.beat_id)}?type=master`}
                              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium transition hover:bg-zinc-900"
                            >
                              دانلود مستر
                            </a>

                            {item.includes_stems && (
                              <a
                                href={`/api/download/${encodeURIComponent(item.beat_id)}?type=stems`}
                                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium transition hover:bg-zinc-900"
                              >
                                دانلود Stems
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 border-t border-zinc-800 pt-4">
                          {hasDocument ? (
                            <Link
                              href={`/dashboard/purchases/${encodeURIComponent(item.id)}/license`}
                              className="inline-flex items-center gap-2 rounded-xl border border-zinc-600 px-4 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-zinc-900"
                            >
                              <span>مشاهده سند اختصاصی مجوز این بیت</span>
                              <span aria-hidden="true">←</span>
                            </Link>
                          ) : (
                            <p className="text-xs leading-6 text-zinc-600">
                              برای این خرید، سند اختصاصی نسخه‌دار
                              در دسترس نیست.
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>

                <footer className="mt-5 flex items-center justify-between border-t border-zinc-800 pt-5">
                  <span className="text-zinc-500">
                    مجموع سفارش
                  </span>

                  <span className="text-xl font-bold">
                    {formatMoney(order.total, order.currency)}
                  </span>
                </footer>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center">
          <h2 className="text-xl font-semibold">
            هنوز خریدی انجام نداده‌ای
          </h2>

          <p className="mt-3 text-sm leading-7 text-zinc-500">
            بعد از خرید بیت، فایل‌ها و سندهای اختصاصی لایسنس
            در این بخش نمایش داده می‌شوند.
          </p>

          <Link
            href="/discover"
            className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200"
          >
            مشاهده بیت‌ها
          </Link>
        </div>
      )}
    </main>
  );
}
