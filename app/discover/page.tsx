"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { musicalKey } from "@/lib/uploadConfig";
import { MOODS } from "@/lib/taxonomy";

import FavoriteButton from "@/components/FavoriteButton";
import AddToCartButton from "@/components/AddToCartButton";
import BeatPreviewPlayer from "@/components/BeatPreviewPlayer";

type Producer = {
  id: string;
  username: string | null;
  display_name: string | null;
};

type DiscoverBeat = {
  id: string;
  title: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  moods: string[] | null;
  semantic_tags: string[] | null;
  preview_url: string | null;
  cover_url: string | null;
  producer_id: string | null;
  producer_username: string | null;
  producer_display_name: string | null;
  starting_price: number | null;
  currency: string | null;
  play_count: number;
  total_count: number;
  analysis_status: "completed" | "skipped";
};

type Facets = {
  genres: string[];
  keys: string[];
  tags: string[];
  producers: Producer[];
};

type Filters = {
  q: string;
  genre: string;
  key: string;
  producer: string;
  bpmMin: string;
  bpmMax: string;
  priceMin: string;
  priceMax: string;
  sort: string;
  moods: string[];
  tags: string;
};

const DEFAULT_FILTERS: Filters = {
  q: "",
  genre: "",
  key: "",
  producer: "",
  bpmMin: "",
  bpmMax: "",
  priceMin: "",
  priceMax: "",
  sort: "newest",
  moods: [],
  tags: "",
};

const PAGE_SIZE = 24;

function parseFiltersFromUrl(): Filters {
  if (typeof window === "undefined") {
    return DEFAULT_FILTERS;
  }

  const params = new URLSearchParams(window.location.search);

  return {
    q: params.get("q") ?? "",
    genre: params.get("genre") ?? "",
    key: params.get("key") ?? "",
    producer: params.get("producer") ?? "",
    bpmMin: params.get("bpmMin") ?? "",
    bpmMax: params.get("bpmMax") ?? "",
    priceMin: params.get("priceMin") ?? "",
    priceMax: params.get("priceMax") ?? "",
    sort: params.get("sort") ?? "newest",
    moods: params.get("moods")
      ? params
          .get("moods")!
          .split(",")
          .filter(Boolean)
      : [],
    tags: params.get("tags") ?? "",
  };
}

function buildQueryString(filters: Filters, offset = 0) {
  const params = new URLSearchParams();

  if (filters.q.trim()) {
    params.set("q", filters.q.trim());
  }

  if (filters.genre) {
    params.set("genre", filters.genre);
  }

  if (filters.key) {
    params.set("key", filters.key);
  }

  if (filters.producer) {
    params.set("producer", filters.producer);
  }

  if (filters.bpmMin) {
    params.set("bpmMin", filters.bpmMin);
  }

  if (filters.bpmMax) {
    params.set("bpmMax", filters.bpmMax);
  }

  if (filters.priceMin) {
    params.set("priceMin", filters.priceMin);
  }

  if (filters.priceMax) {
    params.set("priceMax", filters.priceMax);
  }

  if (filters.moods.length > 0) {
    params.set(
      "moods",
      filters.moods.join(","),
    );
  }

  if (filters.tags.trim()) {
    params.set(
      "tags",
      filters.tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .join(","),
    );
  }

  params.set("sort", filters.sort);
  params.set("limit", String(PAGE_SIZE));
  params.set("offset", String(offset));

  return params.toString();
}

function formatPrice(
  price: number | null,
  currency: string | null,
) {
  if (price === null || price === undefined) {
    return "Price unavailable";
  }

  const symbol =
    currency === "USD"
      ? "$"
      : currency
        ? `${currency} `
        : "$";

  return `From ${symbol}${Number(price).toFixed(2)}`;
}

export default function DiscoverPage() {
  const [filters, setFilters] =
    useState<Filters>(DEFAULT_FILTERS);

  const [beats, setBeats] =
    useState<DiscoverBeat[]>([]);

  const [facets, setFacets] =
    useState<Facets>({
      genres: [],
      keys: [],
      tags: [],
      producers: [],
    });

  const [loading, setLoading] =
    useState(true);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const [error, setError] =
    useState("");

  const [totalCount, setTotalCount] =
    useState(0);

  const [filtersOpen, setFiltersOpen] =
    useState(true);

  async function loadBeats(
    nextFilters: Filters,
    offset = 0,
    append = false,
    includeFacets = false,
  ) {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const queryString =
        buildQueryString(
          nextFilters,
          offset,
        );

      const response = await fetch(
        `/api/discover?${queryString}&includeFacets=${includeFacets}`,
        {
          cache: "no-store",
        },
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to load beats.",
        );
      }

      const nextResults: DiscoverBeat[] =
        Array.isArray(data.results)
          ? data.results
          : [];

      if (append) {
        setBeats((current) => [
          ...current,
          ...nextResults,
        ]);
      } else {
        setBeats(nextResults);
      }

      setTotalCount(
        Number(data.totalCount ?? 0),
      );

      if (data.facets) {
        setFacets({
          genres: Array.isArray(
            data.facets.genres,
          )
            ? data.facets.genres
            : [],

          keys: Array.isArray(
            data.facets.keys,
          )
            ? data.facets.keys
            : [],

          tags: Array.isArray(
            data.facets.tags,
          )
            ? data.facets.tags
            : [],

          producers: Array.isArray(
            data.facets.producers,
          )
            ? data.facets.producers
            : [],
        });
      }
    } catch (loadError) {
      console.error(
        "Discovery load error:",
        loadError,
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load beats.",
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    const initialFilters =
      parseFiltersFromUrl();

    setFilters(initialFilters);

    loadBeats(
      initialFilters,
      0,
      false,
      true,
    );
  }, []);

  function updateUrl(
    nextFilters: Filters,
  ) {
    const queryString =
      buildQueryString(
        nextFilters,
        0,
      );

    window.history.replaceState(
      null,
      "",
      `/discover?${queryString}`,
    );
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    updateUrl(filters);

    loadBeats(
      filters,
      0,
      false,
      false,
    );
  }

  function clearFilters() {
    setFilters(
      DEFAULT_FILTERS,
    );

    updateUrl(
      DEFAULT_FILTERS,
    );

    loadBeats(
      DEFAULT_FILTERS,
      0,
      false,
      false,
    );
  }

  function toggleMood(
    mood: string,
  ) {
    setFilters((current) => ({
      ...current,
      moods: current.moods.includes(
        mood,
      )
        ? current.moods.filter(
            (item) => item !== mood,
          )
        : [
            ...current.moods,
            mood,
          ],
    }));
  }

  const aiAnalyzedBeats = useMemo(
    () =>
      beats.filter(
        (beat) =>
          beat.analysis_status ===
          "completed",
      ),
    [beats],
  );

  const regularBeats = useMemo(
    () =>
      beats.filter(
        (beat) =>
          beat.analysis_status ===
          "skipped",
      ),
    [beats],
  );

  const hasMore =
    beats.length < totalCount;

  function renderBeatCard(
    beat: DiscoverBeat,
  ) {
    const producerName =
      beat.producer_display_name?.trim() ||
      beat.producer_username?.trim() ||
      "Producer";

    return (
      <article
        key={beat.id}
        className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950"
      >
        {/* Cover */}

        <div className="relative">
          {beat.cover_url ? (
            <img
              src={beat.cover_url}
              alt={
                beat.title
                  ? `${beat.title} cover`
                  : "Beat cover"
              }
              className="aspect-square w-full object-cover"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center bg-zinc-900 text-sm text-zinc-600">
              No cover
            </div>
          )}

          <div className="absolute right-3 top-3">
            <FavoriteButton
              beatId={beat.id}
            />
          </div>
        </div>

        {/* Content */}

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold">
                {beat.title}
              </h3>

              {beat.producer_username ? (
                <Link
                  href={`/producers/${encodeURIComponent(
                    beat.producer_username,
                  )}`}
                  className="mt-1 inline-block text-sm text-zinc-500 transition hover:text-white"
                >
                  @{beat.producer_username}
                </Link>
              ) : (
                <p className="mt-1 text-sm text-zinc-600">
                  {producerName}
                </p>
              )}
            </div>

            <p className="shrink-0 text-sm font-medium text-zinc-300">
              {formatPrice(
                beat.starting_price,
                beat.currency,
              )}
            </p>
          </div>

          <p className="mt-3 text-sm text-zinc-500">
            {beat.genre ??
              "Unknown genre"}
            {" • "}
            {beat.bpm ?? "-"} BPM
            {" • "}
            {beat.key ?? "-"}
          </p>

          {/* Mood tags */}

          {beat.moods &&
            beat.moods.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {beat.moods
                  .slice(0, 4)
                  .map((mood) => (
                    <span
                      key={mood}
                      className="rounded-full border border-zinc-800 px-2.5 py-1 text-[11px] text-zinc-500"
                    >
                      {mood}
                    </span>
                  ))}
              </div>
            )}

          {/* Player */}

          {beat.preview_url && (
            <div className="mt-4">
              <BeatPreviewPlayer
                url={
                  beat.preview_url
                }
                title={
                  beat.title ??
                  "Untitled Beat"
                }
              />
            </div>
          )}

          <div className="mt-4 grid gap-2">
            <Link
              href={`/beat/${beat.id}`}
              className="flex w-full items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:border-zinc-500 hover:bg-zinc-800"
            >
              View Beat →
            </Link>

            <AddToCartButton
              beatId={beat.id}
              title={
                beat.title ??
                "Untitled Beat"
              }
            />
          </div>
        </div>
      </article>
    );
  }

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        {/* Header */}

        <div className="mb-10">
          <p className="mb-2 text-sm text-zinc-500">
            Epsilone
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                Discover Beats
              </h1>

              <p className="mt-2 max-w-2xl text-zinc-500">
                Search and explore beats by sound,
                producer, mood, BPM, key, tags, and
                price.
              </p>
            </div>

            <Link
              href="/"
              className="text-sm text-zinc-500 transition hover:text-white"
            >
              ← AI Mood Search
            </Link>
          </div>
        </div>

        {/* Search */}

        <form
          onSubmit={handleSubmit}
          className="mb-6"
        >
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              value={filters.q}
              onChange={(event) =>
                setFilters(
                  (current) => ({
                    ...current,
                    q:
                      event.target
                        .value,
                  }),
                )
              }
              placeholder="Search beat title, producer, genre, or tag..."
              className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-500"
            />

            <button
              type="submit"
              disabled={
                loading ||
                loadingMore
              }
              className="rounded-2xl bg-white px-7 py-4 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Search
            </button>
          </div>
        </form>

        {/* Filter Toggle */}

        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              setFiltersOpen(
                (current) =>
                  !current,
              )
            }
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-300 transition hover:border-zinc-700 hover:text-white"
          >
            {filtersOpen
              ? "Hide Filters"
              : "Show Filters"}
          </button>

          <button
            type="button"
            onClick={
              clearFilters
            }
            className="text-sm text-zinc-600 transition hover:text-white"
          >
            Clear all
          </button>
        </div>

        {/* Filters */}

        {filtersOpen && (
          <section className="mb-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Genre */}

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Genre
                </label>

                <select
                  value={
                    filters.genre
                  }
                  onChange={(
                    event,
                  ) =>
                    setFilters(
                      (
                        current,
                      ) => ({
                        ...current,
                        genre:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-200 outline-none"
                >
                  <option value="">
                    All genres
                  </option>

                  {facets.genres.map(
                    (genre) => (
                      <option
                        key={genre}
                        value={genre}
                      >
                        {genre}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* Producer */}

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Producer
                </label>

                <select
                  value={
                    filters.producer
                  }
                  onChange={(
                    event,
                  ) =>
                    setFilters(
                      (
                        current,
                      ) => ({
                        ...current,
                        producer:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-200 outline-none"
                >
                  <option value="">
                    All producers
                  </option>

                  {facets.producers.map(
                    (
                      producer,
                    ) => (
                      <option
                        key={
                          producer.id
                        }
                        value={
                          producer.id
                        }
                      >
                        {producer
                          .display_name ||
                          producer.username ||
                          "Producer"}
                        {producer.username
                          ? ` (@${producer.username})`
                          : ""}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* Key */}

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Key
                </label>

                <select
                  value={
                    filters.key
                  }
                  onChange={(
                    event,
                  ) =>
                    setFilters(
                      (
                        current,
                      ) => ({
                        ...current,
                        key:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-200 outline-none"
                >
                  <option value="">
                    All keys
                  </option>

                  {(
                    facets.keys
                      .length >
                    0
                      ? facets.keys
                      : musicalKey
                  ).map(
                    (
                      item,
                    ) => (
                      <option
                        key={
                          item
                        }
                        value={
                          item
                        }
                      >
                        {item}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* Sort */}

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Sort
                </label>

                <select
                  value={
                    filters.sort
                  }
                  onChange={(
                    event,
                  ) =>
                    setFilters(
                      (
                        current,
                      ) => ({
                        ...current,
                        sort:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-200 outline-none"
                >
                  <option value="newest">
                    Newest
                  </option>

                  <option value="popular">
                    Most Played
                  </option>

                  <option value="price_asc">
                    Price: Low to High
                  </option>

                  <option value="price_desc">
                    Price: High to Low
                  </option>

                  <option value="bpm_asc">
                    BPM: Low to High
                  </option>

                  <option value="bpm_desc">
                    BPM: High to Low
                  </option>
                </select>
              </div>

              {/* BPM */}

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                  BPM
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={20}
                    max={300}
                    value={
                      filters.bpmMin
                    }
                    onChange={(
                      event,
                    ) =>
                      setFilters(
                        (
                          current,
                        ) => ({
                          ...current,
                          bpmMin:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="Min"
                    className="rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm outline-none"
                  />

                  <input
                    type="number"
                    min={20}
                    max={300}
                    value={
                      filters.bpmMax
                    }
                    onChange={(
                      event,
                    ) =>
                      setFilters(
                        (
                          current,
                        ) => ({
                          ...current,
                          bpmMax:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="Max"
                    className="rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm outline-none"
                  />
                </div>
              </div>

              {/* Price */}

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Price
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={
                      filters.priceMin
                    }
                    onChange={(
                      event,
                    ) =>
                      setFilters(
                        (
                          current,
                        ) => ({
                          ...current,
                          priceMin:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="Min"
                    className="rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm outline-none"
                  />

                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={
                      filters.priceMax
                    }
                    onChange={(
                      event,
                    ) =>
                      setFilters(
                        (
                          current,
                        ) => ({
                          ...current,
                          priceMax:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="Max"
                    className="rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm outline-none"
                  />
                </div>
              </div>

              {/* Tags */}

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Tags
                </label>

                <input
                  type="text"
                  value={
                    filters.tags
                  }
                  onChange={(
                    event,
                  ) =>
                    setFilters(
                      (
                        current,
                      ) => ({
                        ...current,
                        tags:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  placeholder="dark, nocturnal, trap"
                  className="w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm outline-none placeholder:text-zinc-700"
                />

                <p className="mt-2 text-[11px] text-zinc-600">
                  Separate multiple
                  tags with commas.
                </p>
              </div>
            </div>

            {/* Mood */}

            <div className="mt-6 border-t border-zinc-900 pt-5">
              <div className="mb-3">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Mood
                </p>

                <p className="mt-1 text-xs text-zinc-700">
                  Select one or more.
                </p>
              </div>

              <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto pr-1">
                {MOODS.map(
                  (mood) => {
                    const active =
                      filters.moods.includes(
                        mood,
                      );

                    return (
                      <button
                        key={mood}
                        type="button"
                        onClick={() =>
                          toggleMood(
                            mood,
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs transition ${
                          active
                            ? "border-white bg-white text-black"
                            : "border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600 hover:text-white"
                        }`}
                      >
                        {mood}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  updateUrl(
                    filters,
                  );

                  loadBeats(
                    filters,
                    0,
                    false,
                    false,
                  );
                }}
                disabled={loading}
                className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Apply Filters
              </button>
            </div>
          </section>
        )}

        {/* Result Header */}

        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              {loading
                ? "Loading..."
                : "Beats"}
            </h2>

            {!loading && (
              <p className="mt-1 text-sm text-zinc-600">
                {totalCount} beat
                {totalCount ===
                1
                  ? ""
                  : "s"}{" "}
                found
              </p>
            )}
          </div>

          <span className="text-xs text-zinc-700">
            {filters.moods.length >
            0
              ? `${filters.moods.length} mood filter${
                  filters.moods.length ===
                  1
                    ? ""
                    : "s"
                }`
              : ""}
          </span>
        </div>

        {/* Error */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Loading */}

        {loading && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({
              length: 6,
            }).map(
              (_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-2xl border border-zinc-900 bg-zinc-950 p-4"
                >
                  <div className="aspect-square rounded-xl bg-zinc-900" />
                  <div className="mt-4 h-4 w-2/3 rounded bg-zinc-900" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-zinc-900" />
                  <div className="mt-4 h-10 rounded-xl bg-zinc-900" />
                </div>
              ),
            )}
          </div>
        )}

        {/* Empty */}

        {!loading &&
          beats.length ===
            0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-6 py-20 text-center">
              <p className="text-lg font-medium">
                No beats found
              </p>

              <p className="mt-2 text-sm text-zinc-600">
                Try removing some
                filters or searching
                for something else.
              </p>

              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="mt-5 rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300 transition hover:border-zinc-600 hover:text-white"
              >
                Clear Filters
              </button>
            </div>
          )}

        {/* ================================================= */}
        {/* AI ANALYZED BEATS */}
        {/* ================================================= */}

        {!loading &&
          aiAnalyzedBeats.length >
            0 && (
            <section className="mb-14">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold">
                      AI Analyzed Beats
                    </h2>

                    <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-500">
                      {aiAnalyzedBeats.length}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-zinc-600">
                    Beats analyzed by
                    Epsilone AI and ready
                    for mood-based discovery.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {aiAnalyzedBeats.map(
                  renderBeatCard,
                )}
              </div>
            </section>
          )}

        {/* ================================================= */}
        {/* REGULAR BEATS */}
        {/* ================================================= */}

        {!loading &&
          regularBeats.length >
            0 && (
            <section className="mb-14">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold">
                      Regular Beats
                    </h2>

                    <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-500">
                      {regularBeats.length}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-zinc-600">
                    Beats available for
                    listening and purchase
                    without AI analysis.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {regularBeats.map(
                  renderBeatCard,
                )}
              </div>
            </section>
          )}

        {/* Load more */}

        {hasMore && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              disabled={loadingMore}
              onClick={() =>
                loadBeats(
                  filters,
                  beats.length,
                  true,
                  false,
                )
              }
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-6 py-3 text-sm text-zinc-300 transition hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingMore
                ? "Loading..."
                : "Load more"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}