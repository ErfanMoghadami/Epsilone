"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import BeatCard from "@/components/discover/BeatCard";
import BeatGridSkeleton from "@/components/discover/BeatGridSkeleton";
import { BEAT_GRID_CLASS } from "@/lib/discover";

type RankingMode =
  "trending" | "popular_new" | "most_favorited" | "most_played";

type RankedBeat = {
  id: string;
  title: string | null;
  preview_url: string | null;
  cover_url: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  moods: string[] | null;
  producer_id: string | null;
  producer_username: string | null;
  producer_display_name: string | null;
  favorite_count: number | null;
  recent_favorite_count: number | null;
  play_count: number | null;
  recent_play_count: number | null;
  trend_score: number | null;
  created_at: string | null;
  discount_percent?: number;
  starting_price?: number | null;
  original_starting_price?: number | null;
  currency?: string | null;
};

const TABS: Array<{
  id: RankingMode;
  label: string;
  description: string;
}> = [
  {
    id: "trending",
    label: "ترند",
    description: "بیت‌هایی که این هفته بیشترین توجه را گرفته‌اند.",
  },
  {
    id: "popular_new",
    label: "جدید و در حال صعود",
    description: "انتشارهای جدید که در ۳۰ روز اول فعالیت واقعی داشته‌اند.",
  },
  {
    id: "most_favorited",
    label: "بیشترین علاقه‌مندی",
    description: "بیت‌هایی که شنونده‌ها در طول زمان ذخیره کرده‌اند.",
  },
  {
    id: "most_played",
    label: "بیشترین پخش",
    description: "بیت‌هایی با بیشترین تعداد پخش ثبت‌شده.",
  },
];

function formatCount(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString("en-US");
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-[11px] text-zinc-600">{label}</p>
      <p className="mt-1 text-sm font-medium text-zinc-200">{value}</p>
    </div>
  );
}

export default function TrendingPage() {
  const [mode, setMode] = useState<RankingMode>("trending");
  const [beats, setBeats] = useState<RankedBeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadRanking() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/trending?mode=${encodeURIComponent(mode)}&limit=24`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "بارگذاری ترندها ممکن نشد.");
        }

        setBeats(Array.isArray(data.results) ? data.results : []);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "بارگذاری ترندها ممکن نشد.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadRanking();
    return () => controller.abort();
  }, [mode]);

  const selectedTab = TABS.find((tab) => tab.id === mode) ?? TABS[0];
  const isRecentMode = mode === "trending" || mode === "popular_new";
  const activityWindow = mode === "popular_new" ? "۳۰ روز" : "۷ روز";

  return (
    <main
      dir="rtl"
      className="min-h-screen --ep-fg px-5 py-10 text-white sm:px-8 sm:py-14"
    >
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-semibold text-orange-300">
              ببین چی داغه
            </p>
            <h1 className="text-4xl font-semibold sm:text-5xl">ترندها</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
              بیت‌هایی را که شنونده‌ها در Epsilone بیشتر پخش و ذخیره می‌کنند
              پیدا کنید. رتبه‌ها بر اساس فعالیت ثبت‌شده به‌روز می‌شوند.
            </p>
          </div>
          <Link
            href="/discover"
            className="inline-flex w-fit items-center justify-center rounded-xl border border-white/15 px-4 py-2.5 text-sm text-zinc-200 transition hover:border-white/30 hover:bg-white/5"
          >
            همه‌ی بیت‌ها{" "}
            <span className="mr-2" aria-hidden="true">
              ↖
            </span>
          </Link>
        </header>

        <div
          className="mb-7 flex gap-2 overflow-x-auto pb-2"
          role="tablist"
          aria-label="رتبه‌بندی بیت‌ها"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={mode === tab.id}
              onClick={() => setMode(tab.id)}
              className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm transition ${
                mode === tab.id
                  ? "border-orange-300/50 bg-orange-300/10 text-orange-100"
                  : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-400">{selectedTab.description}</p>
          <p className="text-xs text-zinc-600">
            {loading ? "در حال به‌روزرسانی رتبه‌ها…" : `${beats.length} بیت`}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-900/70 bg-red-950/30 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && <BeatGridSkeleton />}

        {!loading && !error && beats.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-16 text-center">
            <h2 className="text-lg font-medium text-white">
              هنوز فعالیت کافی ثبت نشده
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-zinc-500">
              با پخش و علاقه‌مندی بیشتر شنونده‌ها، این رتبه‌بندی پر می‌شود.
              دسته‌ی دیگری را امتحان کنید یا همه‌ی بیت‌ها را ببینید.
            </p>
            <Link
              href="/discover"
              className="mt-5 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              کشف همه‌ی بیت‌ها
            </Link>
          </div>
        )}

        {!loading && !error && beats.length > 0 && (
          <div className={BEAT_GRID_CLASS}>
            {beats.map((beat, index) => (
              <BeatCard
                key={beat.id}
                beat={beat}
                rank={index + 1}
                eager={index < 4}
                extra={
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <StatBox
                      label={
                        isRecentMode ? `پخش · ${activityWindow}` : "کل پخش‌ها"
                      }
                      value={formatCount(
                        isRecentMode ? beat.recent_play_count : beat.play_count,
                      )}
                    />
                    <StatBox
                      label={
                        isRecentMode
                          ? `علاقه‌مندی · ${activityWindow}`
                          : "کل علاقه‌مندی‌ها"
                      }
                      value={formatCount(
                        isRecentMode
                          ? beat.recent_favorite_count
                          : beat.favorite_count,
                      )}
                    />
                  </div>
                }
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
