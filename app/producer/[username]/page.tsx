import { redirect, notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatPriceAmount } from "@/lib/format-price";
type ProducerPanelPageProps = {
  params: Promise<{
    username: string;
  }>;
};
import { createAdminClient } from "@/lib/supabase/admin";

type PaidOrder = {
  id: string;
  currency: string;
  paid_at: string | null;
};

type ProducerSale = {
  id: string;
  order_id: string;
  title_snapshot: string;
  unit_price: number | string;
  license_type: string;
  created_at: string;
};

export default async function ProducerPanelPage({
  params,
}: ProducerPanelPageProps) {
  const { username } = await params;

  const supabase = await createClient();

  // --------------------------------------------------------
  // Current user
  // --------------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/producer/login");
  }

  // --------------------------------------------------------
  // Current producer profile
  // --------------------------------------------------------

  const { data: producer, error: producerError } =
    await supabase
      .from("profiles")
      .select(
        "id, role, display_name, username",
      )
      .eq("id", user.id)
      .eq("role", "producer")
      .single();

  if (producerError || !producer) {
    notFound();
  }

  // --------------------------------------------------------
  // Make sure URL belongs to current producer
  // --------------------------------------------------------

  if (
    !producer.username ||
    producer.username.toLowerCase() !==
      username.toLowerCase()
  ) {
    redirect(
      `/producer/${producer.username}`,
    );
  }

  // --------------------------------------------------------
  // Producer beats
  // --------------------------------------------------------

  const { data: beats, error: beatsError } =
    await supabase
      .from("beats")
      .select(
        "id, analysis_status",
      )
      .eq("producer_id", user.id);

  if (beatsError) {
    throw new Error(
      `Could not load producer beats: ${beatsError.message}`,
    );
  }

  const total = beats?.length ?? 0;

  const pending =
    beats?.filter(
      (beat) =>
        beat.analysis_status === "pending",
    ).length ?? 0;

  const processing =
    beats?.filter(
      (beat) =>
        beat.analysis_status === "processing",
    ).length ?? 0;

  const completed =
    beats?.filter(
      (beat) =>
        beat.analysis_status === "completed",
    ).length ?? 0;

  const failed =
    beats?.filter(
      (beat) =>
        beat.analysis_status === "failed",
    ).length ?? 0;

  
  // --------------------------------------------------------
  // Producer sales — server-side, scoped to this Producer
  // --------------------------------------------------------

  const supabaseAdmin = createAdminClient();

  const {
    data: candidateSales,
    error: candidateSalesError,
  } = await supabaseAdmin
    .from("order_items")
    .select(`
      id,
      order_id,
      title_snapshot,
      unit_price,
      license_type,
      created_at
    `)
    .eq("producer_id", user.id)
    .order("created_at", { ascending: false });

  let paidOrders: PaidOrder[] = [];
  let paidOrdersError: { message: string } | null = null;
  let producerSales: ProducerSale[] = [];

  if (candidateSalesError) {
    console.error(
      "Could not load Producer order items:",
      candidateSalesError,
    );

    paidOrdersError = {
      message: candidateSalesError.message,
    };
  } else if (candidateSales && candidateSales.length > 0) {
    // Fetch only orders associated with this Producer's sales.
    const candidateOrderIds = [
      ...new Set(
        candidateSales.map((sale) => sale.order_id),
      ),
    ];

    const {
      data: matchingPaidOrders,
      error: matchingPaidOrdersError,
    } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        currency,
        paid_at
      `)
      .eq("status", "paid")
      .in("id", candidateOrderIds);

    if (matchingPaidOrdersError) {
      console.error(
        "Could not load paid Producer orders:",
        matchingPaidOrdersError,
      );

      paidOrdersError = {
        message: matchingPaidOrdersError.message,
      };
    } else {
      paidOrders = (matchingPaidOrders ?? []) as PaidOrder[];

      const paidOrderIds = new Set(
        paidOrders.map((order) => order.id),
      );

      producerSales = (
        candidateSales.filter((sale) =>
          paidOrderIds.has(sale.order_id),
        ) ?? []
      ) as ProducerSale[];
    }
  }

  // --------------------------------------------------------
  // Sales stats
  // --------------------------------------------------------

  const totalSales = producerSales.length;

  const totalRevenue = producerSales.reduce(
    (sum, sale) => sum + Number(sale.unit_price),
    0,
  );

  const averageSale =
    totalSales > 0
      ? totalRevenue / totalSales
      : 0;

  const recentSales = producerSales.slice(0, 5);

  const orderMap = new Map<string, PaidOrder>();

  for (const order of paidOrders) {
    orderMap.set(order.id, order);
  }

  
  // // --------------------------------------------------------
  // // Paid orders
  // // --------------------------------------------------------

  // const {
  //   data: paidOrders,
  //   error: paidOrdersError,
  // } = await supabase
  //   .from("orders")
  //   .select(
  //     `
  //       id,
  //       currency,
  //       paid_at
  //     `,
  //   )
  //   .eq("status", "paid");

  // // --------------------------------------------------------
  // // Producer sales
  // // --------------------------------------------------------

  // let producerSales: ProducerSale[] = [];

  // if (
  //   !paidOrdersError &&
  //   paidOrders &&
  //   paidOrders.length > 0
  // ) {
  //   const paidOrderIds = paidOrders.map(
  //     (order) => order.id,
  //   );

  //   const {
  //     data: sales,
  //     error: salesError,
  //   } = await supabase
  //     .from("order_items")
  //     .select(
  //       `
  //         id,
  //         order_id,
  //         title_snapshot,
  //         unit_price,
  //         license_type,
  //         created_at
  //       `,
  //     )
  //     .eq("producer_id", user.id)
  //     .in("order_id", paidOrderIds)
  //     .order("created_at", {
  //       ascending: false,
  //     });

  //   if (salesError) {
  //     console.error(
  //       "Producer sales error:",
  //       salesError,
  //     );
  //   } else {
  //     producerSales =
  //       (sales ?? []) as ProducerSale[];
  //   }
  // }

  // // --------------------------------------------------------
  // // Sales stats
  // // --------------------------------------------------------

  // const totalSales = producerSales.length;

  // const totalRevenue = producerSales.reduce(
  //   (sum, sale) =>
  //     sum + Number(sale.unit_price),
  //   0,
  // );

  // const averageSale =
  //   totalSales > 0
  //     ? totalRevenue / totalSales
  //     : 0;

  // const recentSales = producerSales.slice(0, 5);

  // const orderMap = new Map<string, PaidOrder>();

  // for (const order of paidOrders ?? []) {
  //   orderMap.set(order.id, order as PaidOrder);
  // }

  // --------------------------------------------------------
  // Display name
  // --------------------------------------------------------

  const producerName =
    producer.display_name?.trim() ||
    producer.username ||
    "آهنگساز";

  return (
    <div>
      {/* -------------------------------------------------- */}
      {/* Header */}
      {/* -------------------------------------------------- */}

      <div className="mb-8">
        <p className="text-sm text-zinc-500">
          پنل آهنگساز
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
          {producerName}
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          @{producer.username}
        </p>
      </div>

      {/* -------------------------------------------------- */}
      {/* Beat Stats */}
      {/* -------------------------------------------------- */}

      <section className="mb-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            نمای کلی بیت‌ها
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            کتابخانه بیت‌ها و وضعیت تحلیل اون‌ها.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-500">
              کل بیت‌ها
            </p>

            <p className="mt-2 text-3xl font-bold">
              {total}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-500">
              در انتظار
            </p>

            <p className="mt-2 text-3xl font-bold">
              {pending}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-500">
              در حال پردازش
            </p>

            <p className="mt-2 text-3xl font-bold">
              {processing}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-500">
              تکمیل‌شده
            </p>

            <p className="mt-2 text-3xl font-bold">
              {completed}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-500">
              ناموفق
            </p>

            <p className="mt-2 text-3xl font-bold">
              {failed}
            </p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* Sales Stats */}
      {/* -------------------------------------------------- */}

      <section className="mb-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            فروش و عملکرد
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            فروش‌های تکمیل‌شده‌ت در Epsilone.
          </p>
        </div>

        {paidOrdersError ? (
          <div className="rounded-xl border border-red-900/60 bg-red-950/20 p-5">
            <p className="text-sm text-red-400">
              بارگذاری اطلاعات فروش ممکن نشد.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-sm text-zinc-500">
                فروش‌های تکمیل‌شده
              </p>

              <p className="mt-2 text-3xl font-bold">
                {totalSales}
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                لایسنس‌های خریداری‌شده
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-sm text-zinc-500">
                درآمد ناخالص
              </p>

              <p className="mt-2 text-3xl font-bold">
                {formatPriceAmount(totalRevenue)}
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                قبل از کارمزد پلتفرم
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-sm text-zinc-500">
                میانگین فروش
              </p>

              <p className="mt-2 text-3xl font-bold">
                {formatPriceAmount(averageSale)}
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                میانگین ارزش لایسنس
              </p>
            </div>
          </div>
        )}
      </section>

      {/* -------------------------------------------------- */}
      {/* فروش‌های اخیر */}
      {/* -------------------------------------------------- */}

      <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              فروش‌های اخیر
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              آخرین خریدهای تکمیل‌شده.
            </p>
          </div>

          <Link
            href="/producer/beats"
            className="text-sm text-zinc-500 transition hover:text-white"
          >
            مدیریت بیت‌ها ←
          </Link>
        </div>

        {recentSales.length > 0 ? (
          <div className="space-y-3">
            {recentSales.map((sale) => {
              const order = orderMap.get(
                sale.order_id,
              );

              return (
                <div
                  key={sale.id}
                  className="flex flex-col gap-3 rounded-xl border border-zinc-800 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold">
                      {sale.title_snapshot ||
                        "بیت بدون عنوان"}
                    </p>

                    <p className="mt-1 text-sm text-zinc-500">
                      لایسنس {sale.license_type}
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      {new Date(
                        order?.paid_at ??
                          sale.created_at,
                      ).toLocaleDateString("fa-IR")}
                    </p>
                  </div>

                  <p className="font-semibold">
                    {formatPriceAmount(sale.unit_price)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 p-8 text-center">
            <p className="text-sm text-zinc-500">
              هنوز فروشی ثبت نشده.
            </p>

            <Link
              href="/producer/upload"
              className="mt-4 inline-block text-sm font-medium text-white underline underline-offset-4"
            >
              آپلود بیت
            </Link>
          </div>
        )}
      </section>

      {/* -------------------------------------------------- */}
      {/* دسترسی سریع */}
      {/* -------------------------------------------------- */}

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            دسترسی سریع
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/producer/beats"
            className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-700 hover:bg-zinc-900"
          >
            <p className="font-semibold">
              بیت‌های من
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              ویرایش بیت‌ها، مدیریت لایسنس‌ها، بررسی تحلیل‌ها و حذف آپلودها.
            </p>
          </Link>

          <Link
            href="/producer/upload"
            className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-700 hover:bg-zinc-900"
          >
            <p className="font-semibold">
              آپلود بیت
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              مستر، کاور و در صورت تمایل Stem Pack جدید اضافه کن.
            </p>
          </Link>

          <Link
            href="/producer/settings"
            className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-700 hover:bg-zinc-900"
          >
            <p className="font-semibold">
              تنظیمات
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              حساب و پروفایل آهنگسازت رو مدیریت کن.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}