import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import CheckoutPaymentButton from "@/components/CheckoutPaymentButton";

type CheckoutPageProps = {
  params: Promise<{
    orderId: string;
  }>;
};

type LicenseItemSnapshot = {
  beatId?: string;
  beatTitle?: string;
  producerName?: string;
  producerUsername?: string | null;
  licenseType?: string;
  exclusivity?: "exclusive" | "non-exclusive";
  price?: number;
  currency?: string;
  masterFileFormat?: string;
  includesStems?: boolean;
  terms?: string[];
};

type LicenseDocumentSnapshot = {
  version?: string;
  items?: LicenseItemSnapshot[];
};

type OrderItemSnapshot = {
  id: string;
  beat_id: string;
  title_snapshot: string;
  unit_price: number | string;
  license_type: string;
  producer_name_snapshot: string | null;
  file_format_snapshot: string | null;
  license_terms_snapshot: {
    terms?: string[];
    exclusivity?: string;
    includesStems?: boolean;
    masterFileFormat?: string;
  } | null;
};

export default async function CheckoutPage({
  params,
}: CheckoutPageProps) {
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
    .select(`
      id,
      buyer_id,
      status,
      currency,
      subtotal,
      total,
      created_at,
      license_document_version,
      license_document_snapshot,
      license_accepted_at,
      license_accepted_by
    `)
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .maybeSingle();

  if (orderError || !order) {
    notFound();
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select(`
      id,
      beat_id,
      title_snapshot,
      unit_price,
      license_type,
      producer_name_snapshot,
      file_format_snapshot,
      license_terms_snapshot
    `)
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });

  if (itemsError) {
    throw new Error("Failed to load order items.");
  }

  const orderItems = (items ?? []) as OrderItemSnapshot[];

  const document =
    order.license_document_snapshot as
      | LicenseDocumentSnapshot
      | null;

  const hasLicenseSheet = Boolean(
    document &&
      document.version &&
      document.version === order.license_document_version &&
      Array.isArray(document.items) &&
      document.items.length > 0 &&
      orderItems.length > 0,
  );

  const displayItems = orderItems.map((item) => {
    const snapshotItem = document?.items?.find(
      (entry) => entry.beatId === item.beat_id,
    );

    return {
      ...item,
      producerName:
        item.producer_name_snapshot ||
        snapshotItem?.producerName ||
        "Producer",
      licenseTerms:
        item.license_terms_snapshot?.terms ??
        snapshotItem?.terms ??
        [],
      exclusivity:
        item.license_terms_snapshot?.exclusivity ??
        snapshotItem?.exclusivity ??
        (item.license_type === "Exclusive"
          ? "exclusive"
          : "non-exclusive"),
      masterFormat:
        item.file_format_snapshot ||
        snapshotItem?.masterFileFormat ||
        "Not recorded",
      includesStems:
        item.license_terms_snapshot?.includesStems ??
        snapshotItem?.includesStems ??
        false,
    };
  });

  const canContinueToPayment =
    order.status === "pending" && hasLicenseSheet;

  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-white">
      <header className="mb-10">
        <p className="mb-2 text-sm text-zinc-500">
          Order #{order.id}
        </p>

        <h1 className="text-3xl font-bold">
          Checkout
        </h1>

        <p className="mt-2 text-zinc-500">
          Review your order and its License Sheet before payment.
        </p>
      </header>

      <div className="space-y-4">
        {displayItems.map((item) => (
          <section
            key={item.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">
                  {item.title_snapshot}
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Producer: {item.producerName}
                </p>

                <p className="mt-2 text-sm text-zinc-400">
                  {item.license_type} ·{" "}
                  {item.exclusivity === "exclusive"
                    ? "Exclusive"
                    : "Non-exclusive"}
                </p>

                <p className="mt-1 text-xs text-zinc-600">
                  Master format: {item.masterFormat}
                  {" · "}
                  {item.includesStems
                    ? "Stems included"
                    : "Stems not included"}
                </p>
              </div>

              <span className="font-medium">
                {order.currency === "USD"
                  ? "$"
                  : `${order.currency} `}
                {Number(item.unit_price).toFixed(2)}
              </span>
            </div>

            {item.licenseTerms.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-zinc-800 pt-4">
                {item.licenseTerms.map((term, index) => (
                  <li
                    key={`${item.id}-${index}`}
                    className="text-sm leading-6 text-zinc-400"
                  >
                    <span className="mr-2 text-zinc-600">✓</span>
                    {term}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">Subtotal</span>

          <span>
            {order.currency === "USD"
              ? "$"
              : `${order.currency} `}
            {Number(order.subtotal).toFixed(2)}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
          <span className="text-lg font-semibold">Total</span>

          <span className="text-2xl font-bold">
            {order.currency === "USD"
              ? "$"
              : `${order.currency} `}
            {Number(order.total).toFixed(2)}
          </span>
        </div>

        {canContinueToPayment ? (
          <>
            <div className="mt-5 rounded-xl border border-zinc-800 p-4">
              <p className="text-sm text-zinc-400">
                License Sheet version:{" "}
                {order.license_document_version}
              </p>

              <Link
                href="/legal/beat-license"
                target="_blank"
                className="mt-2 inline-block text-sm underline underline-offset-4"
              >
                Read the full agreement / مطالعه قرارداد کامل
              </Link>
            </div>

            <CheckoutPaymentButton orderId={order.id} />
          </>
        ) : (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"
          >
            <p
              lang="fa"
              dir="rtl"
              className="text-right text-sm leading-7 text-amber-100"
            >
              این سفارش آماده پرداخت نیست یا License Sheet معتبر
              ندارد. برای جلوگیری از ثبت خرید بدون قرارداد، سفارش
              جدیدی از سبد خرید بساز.
            </p>

            <p className="mt-3 text-sm leading-7 text-zinc-400">
              This order is not ready for payment or does not have
              a valid License Sheet. Create a new order from your
              cart before continuing.
            </p>

            <Link
              href="/cart"
              className="mt-4 inline-block rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
            >
              Return to Cart / بازگشت به سبد خرید
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}