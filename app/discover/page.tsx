"use client";

import Link from "next/link";

import BeatSection from "@/components/discover/BeatSection";
import BeatGridSkeleton from "@/components/discover/BeatGridSkeleton";
import FilterPanel from "@/components/discover/FilterPanel";
import SearchBar from "@/components/discover/SearchBar";

import { useDiscover } from "./useDiscover";

export default function DiscoverPage() {
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

        {/* Result header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              {loading ? "Loading..." : "Beats"}
            </h2>

            {!loading && (
              <p className="mt-1 text-sm text-zinc-600">
                {totalCount} beat{totalCount === 1 ? "" : "s"} found
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

        {!loading && (
          <>
            <BeatSection
              title="AI Analyzed Beats"
              description="Beats analyzed by Epsilone AI and ready for mood-based discovery."
              beats={aiAnalyzedBeats}
            />

            <BeatSection
              title="Regular Beats"
              description="Beats available for listening and purchase without AI analysis."
              beats={regularBeats}
            />
          </>
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