"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_FILTERS,
  EMPTY_FACETS,
  buildQueryString,
  parseFiltersFromUrl,
  type DiscoverBeat,
  type Facets,
  type Filters,
} from "@/lib/discover";

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * All state + data-loading logic of the Discover page.
 * The page component only renders.
 */
export function useDiscover() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [beats, setBeats] = useState<DiscoverBeat[]>([]);
  const [facets, setFacets] = useState<Facets>(EMPTY_FACETS);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Ignores responses of older requests (fast typing / double clicks).
  const requestIdRef = useRef(0);

  async function loadBeats(
    nextFilters: Filters,
    offset = 0,
    append = false,
    includeFacets = false,
  ) {
    const requestId = ++requestIdRef.current;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const queryString = buildQueryString(nextFilters, offset);

      const response = await fetch(
        `/api/discover?${queryString}&includeFacets=${includeFacets}`,
        { cache: "no-store" },
      );

      const data = await response.json();

      if (requestId !== requestIdRef.current) return;

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load beats.");
      }

      const nextResults = asArray<DiscoverBeat>(data.results);

      if (append) {
        setBeats((current) => [...current, ...nextResults]);
      } else {
        setBeats(nextResults);
      }

      setTotalCount(Number(data.totalCount ?? 0));

      if (data.facets) {
        setFacets({
          genres: asArray(data.facets.genres),
          keys: asArray(data.facets.keys),
          tags: asArray(data.facets.tags),
          producers: asArray(data.facets.producers),
        });
      }
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;

      console.error("Discovery load error:", loadError);

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load beats.",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }

  useEffect(() => {
    const initialFilters = parseFiltersFromUrl();

    setFilters(initialFilters);
    loadBeats(initialFilters, 0, false, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateUrl(nextFilters: Filters) {
    window.history.replaceState(
      null,
      "",
      `/discover?${buildQueryString(nextFilters, 0)}`,
    );
  }

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function toggleMood(mood: string) {
    setFilters((current) => ({
      ...current,
      moods: current.moods.includes(mood)
        ? current.moods.filter((item) => item !== mood)
        : [...current.moods, mood],
    }));
  }

  function applyFilters() {
    updateUrl(filters);
    loadBeats(filters, 0, false, false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applyFilters();
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    updateUrl(DEFAULT_FILTERS);
    loadBeats(DEFAULT_FILTERS, 0, false, false);
  }

  function loadMore() {
    loadBeats(filters, beats.length, true, false);
  }

  const aiAnalyzedBeats = useMemo(
    () => beats.filter((beat) => beat.analysis_status === "completed"),
    [beats],
  );

  const regularBeats = useMemo(
    () => beats.filter((beat) => beat.analysis_status === "skipped"),
    [beats],
  );

  return {
    filters,
    facets,
    beats,
    aiAnalyzedBeats,
    regularBeats,
    totalCount,
    hasMore: beats.length < totalCount,
    loading,
    loadingMore,
    error,
    filtersOpen,
    toggleFilters: () => setFiltersOpen((open) => !open),
    setFilter,
    toggleMood,
    applyFilters,
    handleSubmit,
    clearFilters,
    loadMore,
  };
}