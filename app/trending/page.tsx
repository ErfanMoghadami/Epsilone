"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AddToCartButton from "@/components/AddToCartButton";
import BeatPreviewPlayer from "@/components/BeatPreviewPlayer";
import FavoriteButton from "@/components/FavoriteButton";

type RankingMode =
  | "trending"
  | "popular_new"
  | "most_favorited"
  | "most_played";

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
};

const TABS: Array<{
  id: RankingMode;
  label: string;
  description: string;
}> = [
  {
    id: "trending",
    label: "Trending",
    description: "Beats getting attention this week.",
  },
  {
    id: "popular_new",
    label: "New & Rising",
    description: "New releases gaining real activity in their first 30 days.",
  },
  {
    id: "most_favorited",
    label: "Most Favorited",
    description: "Beats saved by listeners over time.",
  },
  {
    id: "most_played",
    label: "Most Played",
    description: "Beats with the highest recorded play-event totals.",
  },
];

function formatCount(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString();
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
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
          throw new Error(data.error || "Could not load trending beats.");
        }

        setBeats(Array.isArray(data.results) ? data.results : []);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load trending beats.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadRanking();
    return () => controller.abort();
  }, [mode]);

  const selectedTab = TABS.find((tab) => tab.id === mode) ?? TABS[0];

  return (
    <main className="min-h-screen --ep-fg px-5 py-10 text-white sm:px-8 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">
              Discover what matters
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Trending
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Find beats listeners are playing and saving across Epsilone.
              Rankings update from recorded activity.
            </p>
          </div>
          <Link
            href="/discover"
            className="inline-flex w-fit items-center justify-center rounded-xl border border-white/15 px-4 py-2.5 text-sm text-zinc-200 transition hover:border-white/30 hover:bg-white/5"
          >
            Explore all beats <span className="ml-2" aria-hidden="true">↗</span>
          </Link>
        </header>

        <div className="mb-7 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Beat rankings">
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
            {loading ? "Updating rankings…" : `${beats.length} beats`}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-900/70 bg-red-950/30 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
              >
                <div className="aspect-square animate-pulse bg-white/[0.05]" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.06]" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.04]" />
                  <div className="h-10 animate-pulse rounded-xl bg-white/[0.04]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && beats.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-16 text-center">
            <h2 className="text-lg font-medium text-white">Not enough activity yet</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">
              As listeners play and favorite more beats, this ranking will fill in.
              Try another category or explore all available beats.
            </p>
            <Link
              href="/discover"
              className="mt-5 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Explore Discover
            </Link>
          </div>
        )}

        {!loading && !error && beats.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {beats.map((beat, index) => {
              const producerLabel =
                beat.producer_display_name?.trim() ||
                beat.producer_username?.trim() ||
                "Producer";
              const activityWindow = mode === "popular_new" ? "30d" : "7d";

              return (
                <article
                  key={beat.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 transition hover:border-white/20"
                >
                  <div className="relative">
                    {beat.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={beat.cover_url}
                        alt={beat.title ? `${beat.title} cover` : "Beat cover"}
                        className="aspect-square w-full object-cover"
                        loading={index > 3 ? "lazy" : "eager"}
                      />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-zinc-900 to-black text-sm text-zinc-600">
                        Epsilone
                      </div>
                    )}
                    <div className="absolute left-3 top-3 rounded-lg border border-white/10 bg-black/70 px-2.5 py-1 text-xs text-zinc-200 backdrop-blur">
                      #{index + 1}
                    </div>
                    <div className="absolute right-3 top-3">
                      <FavoriteButton beatId={beat.id} />
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold">
                          {beat.title ?? "Untitled Beat"}
                        </h2>
                        {beat.producer_username ? (
                          <Link
                            href={`/producers/${encodeURIComponent(beat.producer_username)}`}
                            className="mt-1 inline-block text-sm text-zinc-500 transition hover:text-white"
                          >
                            @{beat.producer_username}
                          </Link>
                        ) : (
                          <p className="mt-1 text-sm text-zinc-500">{producerLabel}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-zinc-500">
                        {formatDate(beat.created_at) ?? "On Epsilone"}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-zinc-500">
                      {beat.genre ?? "Unknown genre"}
                      {" • "}{beat.bpm ?? "-"} BPM
                      {" • "}{beat.key ?? "-"}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                        <p className="text-[11px] text-zinc-600">
                          {mode === "trending" || mode === "popular_new" ? `Plays · ${activityWindow}` : "Total plays"}
                        </p>
                        <p className="mt-1 text-sm font-medium text-zinc-200">
                          {formatCount(mode === "trending" || mode === "popular_new" ? beat.recent_play_count : beat.play_count)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                        <p className="text-[11px] text-zinc-600">
                          {mode === "trending" || mode === "popular_new" ? `Favorites · ${activityWindow}` : "Total favorites"}
                        </p>
                        <p className="mt-1 text-sm font-medium text-zinc-200">
                          {formatCount(mode === "trending" || mode === "popular_new" ? beat.recent_favorite_count : beat.favorite_count)}
                        </p>
                      </div>
                    </div>

                    {beat.preview_url && (
                      <div className="mt-4">
                        <BeatPreviewPlayer
                          url={beat.preview_url}
                          title={beat.title ?? "Untitled Beat"}
                        />
                      </div>
                    )}

                    <div className="mt-4 grid gap-2">
                      <Link
                        href={`/beat/${beat.id}`}
                        className="flex w-full items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:border-zinc-500 hover:bg-zinc-800"
                      >
                        View Beat <span className="ml-2" aria-hidden="true">→</span>
                      </Link>
                      <AddToCartButton
                        beatId={beat.id}
                        title={beat.title ?? "Untitled Beat"}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
