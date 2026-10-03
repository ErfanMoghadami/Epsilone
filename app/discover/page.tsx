"use client";

import Link from "next/link";
import { useState } from "react";

import BeatSection from "@/components/discover/BeatSection";
import BeatGridSkeleton from "@/components/discover/BeatGridSkeleton";
import FilterPanel from "@/components/discover/FilterPanel";
import SearchBar from "@/components/discover/SearchBar";

import { useDiscover } from "./useDiscover";

type BeatMode = "ai" | "regular";

export default function DiscoverPage() {
  const [beatMode, setBeatMode] = useState<BeatMode>("ai");

  const {
    filters,
    facets,
    beats,
    aiAnalyzedBeats,
    regularBeats,
    totalCount,
    hasMore,
    loading,
    loadingMore,
    error,
    filtersOpen,
    toggleFilters,
    setFilter,
    toggleMood,
    applyFilters,
    handleSubmit,
    clearFilters,
    loadMore,
  } = useDiscover();

  const displayedBeats =
    beatMode === "ai" ? aiAnalyzedBeats : regularBeats;

  const selectedTitle =
    beatMode === "ai" ? "AI Analyzed Beats" : "Regular Beats";

  const selectedDescription =
    beatMode === "ai"
      ? "Beats analyzed by Epsilone AI and ready for mood-based discovery."
      : "Beats available for listening and purchase without AI analysis.";

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-10">
          <p className="mb-2 text-sm text-zinc-500">Epsilone</p>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                Discover Beats
              </h1>

              <p className="mt-2 max-w-2xl text-zinc-500">
                Search and explore beats by sound, producer, mood, BPM, key,
                tags, and price.
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
        <SearchBar
          value={filters.q}
          disabled={loading || loadingMore}
          onChange={(value) => setFilter("q", value)}
          onSubmit={handleSubmit}
        />

        {/* Filter toggle */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={toggleFilters}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-300 transition hover:border-zinc-700 hover:text-white"
          >
            {filtersOpen ? "Hide Filters" : "Show Filters"}
          </button>

          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-zinc-600 transition hover:text-white"
          >
            Clear all
          </button>
        </div>

        {filtersOpen && (
          <FilterPanel
            filters={filters}
            facets={facets}
            loading={loading}
            onChange={setFilter}
            onToggleMood={toggleMood}
            onApply={applyFilters}
          />
        )}

        {/* Beat type switch */}
        <div className="mb-8">
          <div className="inline-flex w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-1">
            <button
              type="button"
              onClick={() => setBeatMode("ai")}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition ${
                beatMode === "ai"
                  ? "bg-white text-black"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              AI ANALYZED BEATS
            </button>

            <button
              type="button"
              onClick={() => setBeatMode("regular")}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition ${
                beatMode === "regular"
                  ? "bg-white text-black"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              REGULAR BEATS
            </button>
          </div>
        </div>

        {/* Result header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              {loading ? "Loading..." : selectedTitle}
            </h2>

            {!loading && (
              <p className="mt-1 text-sm text-zinc-600">
                {displayedBeats.length} beat
                {displayedBeats.length === 1 ? "" : "s"} in this category
              </p>
            )}
          </div>

          <span className="text-xs text-zinc-700">
            {filters.moods.length > 0
              ? `${filters.moods.length} mood filter${
                  filters.moods.length === 1 ? "" : "s"
                }`
              : ""}
          </span>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading && <BeatGridSkeleton />}

        {!loading && beats.length === 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-6 py-20 text-center">
            <p className="text-lg font-medium">No beats found</p>

            <p className="mt-2 text-sm text-zinc-600">
              Try removing some filters or searching for something else.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300 transition hover:border-zinc-600 hover:text-white"
            >
              Clear Filters
            </button>
          </div>
        )}

        {!loading && beats.length > 0 && displayedBeats.length === 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-6 py-20 text-center">
            <p className="text-lg font-medium">
              No {beatMode === "ai" ? "AI analyzed" : "regular"} beats found
            </p>

            <p className="mt-2 text-sm text-zinc-600">
              Try switching to the other beat category or changing your
              filters.
            </p>
          </div>
        )}

        {!loading && displayedBeats.length > 0 && (
          <BeatSection
            title={selectedTitle}
            description={selectedDescription}
            beats={displayedBeats}
          />
        )}

        {hasMore && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              disabled={loadingMore}
              onClick={loadMore}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-6 py-3 text-sm text-zinc-300 transition hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}