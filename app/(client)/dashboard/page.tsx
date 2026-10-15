import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { formatPriceAmount } from "@/lib/format-price";

type RecentPurchase = {
  id: string;
  total: number | string;
  currency: string;
  paid_at: string | null;
  created_at: string;
};

type RecentPlayedEvent = {
  beat_id: string;
  created_at: string;
};

type PlayedBeat = {
  id: string;
  title: string | null;
  cover_url: string | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // --------------------------------------------------------
  // Suggested
  // --------------------------------------------------------

  const { count: suggestedCount, error: suggestedError } =
    await supabase
      .from("recommendation_events")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("user_id", user.id)
      .eq("event_type", "suggested");

  // --------------------------------------------------------
  // Played
  // --------------------------------------------------------

  const { count: playedCount, error: playedError } =
    await supabase
      .from("recommendation_events")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("user_id", user.id)
      .eq("event_type", "played");

  // --------------------------------------------------------
  // Favorites
  // --------------------------------------------------------

  const { count: favoritesCount, error: favoritesError } =
    await supabase
      .from("favorites")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("user_id", user.id);

  // --------------------------------------------------------
  // Paid orders count
  // --------------------------------------------------------

  const {
    count: purchasesCount,
    error: purchasesCountError,
  } = await supabase
    .from("orders")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("buyer_id", user.id)
    .eq("status", "paid");

  // --------------------------------------------------------
  // Recent purchases
  // --------------------------------------------------------

  const {
    data: recentPurchases,
    error: recentPurchasesError,
  } = await supabase
    .from("orders")
    .select(
      `
        id,
        total,
        currency,
        paid_at,
        created_at
      `,
    )
    .eq("buyer_id", user.id)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(3);

  // --------------------------------------------------------
  // Recently played events
  // --------------------------------------------------------

  const {
    data: recentPlayedEvents,
    error: recentPlayedEventsError,
  } = await supabase
    .from("recommendation_events")
    .select(
      `
        beat_id,
        created_at
      `,
    )
    .eq("user_id", user.id)
    .eq("event_type", "played")
    .order("created_at", { ascending: false })
    .limit(20);

  // --------------------------------------------------------
  // Recently played beats
  // --------------------------------------------------------

  const uniqueRecentPlayedEvents: RecentPlayedEvent[] = [];

  const seenBeatIds = new Set<string>();

  for (const event of recentPlayedEvents ?? []) {
    if (seenBeatIds.has(event.beat_id)) {
      continue;
    }

    seenBeatIds.add(event.beat_id);

    uniqueRecentPlayedEvents.push(event);

    if (uniqueRecentPlayedEvents.length >= 5) {
      break;
    }
  }

  const recentPlayedBeatIds =
    uniqueRecentPlayedEvents.map(
      (event) => event.beat_id,
    );

  let recentPlayedBeats: PlayedBeat[] = [];

  if (recentPlayedBeatIds.length > 0) {
    const {
      data: beats,
      error: recentPlayedBeatsError,
    } = await supabase
      .from("beats")
      .select(
        `
          id,
          title,
          cover_url
        `,
      )
      .in("id", recentPlayedBeatIds);

    if (recentPlayedBeatsError) {
      console.error(
        "Recently played beats error:",
        recentPlayedBeatsError,
      );
    } else {
      recentPlayedBeats = (beats ?? []) as PlayedBeat[];
    }
  }

  const recentPlayedBeatMap = new Map(
    recentPlayedBeats.map((beat) => [
      beat.id,
      beat,
    ]),
  );

  // --------------------------------------------------------
  // Error handling
  // --------------------------------------------------------

  if (
    suggestedError ||
    playedError ||
    favoritesError ||
    purchasesCountError ||
    recentPurchasesError ||
    recentPlayedEventsError
  ) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold">
          داشبورد
        </h1>

        <p className="text-sm text-red-400">
          بارگذاری اطلاعات حساب کاربری ممکن نشد.
        </p>
      </div>
    );
  }

  const suggested = suggestedCount ?? 0;
  const played = playedCount ?? 0;
  const favorites = favoritesCount ?? 0;
  const purchases = purchasesCount ?? 0;

  const playRate =
    suggested > 0
      ? ((played / suggested) * 100).toFixed(1)
      : "0.0";

  const displayName =
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "دوست عزیز";

  return (
    <div>
      {/* ---------------------------------------------------- */}
      {/* Header */}
      {/* ---------------------------------------------------- */}

      <div className="mb-8">
        <p className="mb-2 text-sm text-zinc-600">
          خوش برگشتی
        </p>

        <h1 className="text-3xl font-bold tracking-tight">
          سلام، {displayName}
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          خریدها، علاقه‌مندی‌ها و فعالیت‌هات رو از اینجا مدیریت کن.
        </p>
      </div>

      {/* ---------------------------------------------------- */}
      {/* Quick Actions */}
      {/* ---------------------------------------------------- */}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/"
          className="group rounded-2xl border border-white/10 bg-zinc-950 p-5 transition hover:border-white/20 hover:bg-zinc-900"
        >
          <p className="text-sm font-semibold text-white">
            پیدا کردن بیت
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            بنویس دنبال چه حال‌وهوایی هستی تا بیت‌های مناسب رو پیدا کنی.
          </p>

          <span className="mt-4 inline-block text-sm text-zinc-400 transition group-hover:text-white">
            شروع جستجو ←
          </span>
        </Link>

        <Link
          href="/dashboard/favorites"
          className="group rounded-2xl border border-white/10 bg-zinc-950 p-5 transition hover:border-white/20 hover:bg-zinc-900"
        >
          <p className="text-sm font-semibold text-white">
            علاقه‌مندی‌های شما
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            بیت‌هایی که ذخیره کردی رو دوباره ببین.
          </p>

          <span className="mt-4 inline-block text-sm text-zinc-400 transition group-hover:text-white">
            مشاهده علاقه‌مندی‌ها ←
          </span>
        </Link>

        <Link
          href="/dashboard/purchases"
          className="group rounded-2xl border border-white/10 bg-zinc-950 p-5 transition hover:border-white/20 hover:bg-zinc-900"
        >
          <p className="text-sm font-semibold text-white">
            خریدهای شما
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            به بیت‌ها و لایسنس‌هایی که خریدی دسترسی داشته باش.
          </p>

          <span className="mt-4 inline-block text-sm text-zinc-400 transition group-hover:text-white">
            مشاهده خریدها ←
          </span>
        </Link>
      </div>

      {/* ---------------------------------------------------- */}
      {/* Stats */}
      {/* ---------------------------------------------------- */}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-white/10 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-500">
            پیشنهادشده
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            {suggested}
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            بیت‌های پیشنهادشده به شما
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-500">
            پخش‌شده
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            {played}
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            بیت‌هایی که واقعاً پخش کردی
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-500">
            علاقه‌مندی‌ها
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            {favorites}
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            بیت‌هایی که ذخیره کردی
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-500">
            خریدها
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            {purchases}
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            سفارش‌های تکمیل‌شده
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-500">
            نرخ پخش
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            {playRate}%
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            بیت‌های پیشنهادی که پخش کردی
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* اخیراً پخش‌شده */}
      {/* ---------------------------------------------------- */}

      <section className="mb-8 rounded-2xl border border-white/10 bg-zinc-950 p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              اخیراً پخش‌شده
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              بیت‌هایی که اخیراً پخش کردی.
            </p>
          </div>

          <Link
            href="/"
            className="text-sm text-zinc-500 transition hover:text-white"
          >
            پیدا کردن بیشتر ←
          </Link>
        </div>

        {uniqueRecentPlayedEvents.length > 0 ? (
          <div className="space-y-3">
            {uniqueRecentPlayedEvents.map((event) => {
              const beat =
                recentPlayedBeatMap.get(event.beat_id);

              if (!beat) {
                return null;
              }

              return (
                <Link
                  key={event.beat_id}
                  href={`/beat/${event.beat_id}`}
                  className="flex items-center gap-4 rounded-xl border border-zinc-800 p-3 transition hover:border-zinc-700 hover:bg-zinc-900"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                    {beat.cover_url ? (
                      <img
                        src={beat.cover_url}
                        alt={`کاور ${beat.title ?? "بیت"}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">
                        بدون کاور
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold">
                      {beat.title ?? "بیت بدون عنوان"}
                    </h3>

                    <p className="mt-1 text-xs text-zinc-600">
                      پخش در{" "}
                      {new Date(
                        event.created_at,
                      ).toLocaleDateString("fa-IR")}
                    </p>
                  </div>

                  <span className="text-sm text-zinc-600">
                    ←
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 p-8 text-center">
            <p className="text-sm text-zinc-500">
              هنوز هیچ بیتی پخش نکردی.
            </p>

            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium text-white underline underline-offset-4"
            >
              پیدا کردن بیت
            </Link>
          </div>
        )}
      </section>

      {/* ---------------------------------------------------- */}
      {/* خریدهای اخیر */}
      {/* ---------------------------------------------------- */}

      <section className="rounded-2xl border border-white/10 bg-zinc-950 p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              خریدهای اخیر
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              آخرین سفارش‌های تکمیل‌شده‌ت.
            </p>
          </div>

          <Link
            href="/dashboard/purchases"
            className="text-sm text-zinc-500 transition hover:text-white"
          >
            مشاهده همه ←
          </Link>
        </div>

        {recentPurchases &&
        recentPurchases.length > 0 ? (
          <div className="space-y-3">
            {recentPurchases.map((purchase) => (
              <div
                key={purchase.id}
                className="flex flex-col gap-3 rounded-xl border border-zinc-800 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-mono text-xs text-zinc-600">
                    سفارش #{purchase.id}
                  </p>

                  <p className="mt-1 text-sm text-zinc-400">
                    {new Date(
                      purchase.paid_at ??
                        purchase.created_at,
                    ).toLocaleDateString("fa-IR")}
                  </p>
                </div>

                <p className="font-semibold">
                  {formatPriceAmount(purchase.total)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 p-8 text-center">
            <p className="text-sm text-zinc-500">
              هنوز خریدی نداشتی.
            </p>

            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium text-white underline underline-offset-4"
            >
              پیدا کردن اولین بیت
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}