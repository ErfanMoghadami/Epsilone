"use client";

import { FormEvent, useEffect, useState } from "react";
import BeatResultCard, { type Beat } from "@/components/BeatResultCard";
import HomeMenu from "@/components/HomeMenu";
import EpsiloneLogo from "@/components/EpsiloneLogo";
import WaveBackground from "@/components/WaveBackground";

type RecommendResponse = {
  success: boolean;
  query?: {
    moods: string[];
    atmosphere: string[];
    instruments: string[];
    scenes: string[];
    energy: number | null;
    genres: string[];
    subgenres: string[];
    semantic_tags: string[];
  };
  results?: Beat[];
  alternatives?: Beat[];
  alternativeReason?: string | null;
  error?: string;
};

function getAlternativeMessage(reason: string | null): string {
  if (!reason) {
    return "بیت دقیقی از سبک درخواستی پیدا نشد؛ این‌ها نزدیک‌ترین گزینه‌های موجودند.";
  }

  const relatedGenre = reason.match(/related\s+(.+?)\s+beats instead/i);

  if (relatedGenre?.[1]) {
    return `بیت دقیقی از سبک درخواستی پیدا نشد؛ نزدیک‌ترین بیت‌های ${relatedGenre[1]} را می‌بینی.`;
  }

  const requestedStyle = reason.match(/No exact (.+?) matches were found/i);

  if (requestedStyle?.[1]) {
    return `بیتی با سبک ${requestedStyle[1]} پیدا نشد؛ این‌ها نزدیک‌ترین گزینه‌های موجودند.`;
  }

  return "بیت دقیقی از سبک درخواستی پیدا نشد؛ این‌ها نزدیک‌ترین گزینه‌های موجودند.";
}

export default function Page() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Beat[]>([]);
  const [alternatives, setAlternatives] = useState<Beat[]>([]);
  const [alternativeReason, setAlternativeReason] = useState<string | null>(
    null,
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [restored, setRestored] = useState(false);
  const [searched, setSearched] = useState(false);
  const [shownQuery, setShownQuery] = useState("");

  // ------------------------------------------------------
  // Restore previous search
  // ------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function restoreSearchState() {
      try {
        const savedSearch = sessionStorage.getItem("epsilone-search-state");
        if (!savedSearch) return;

        const parsed = JSON.parse(savedSearch);

        if (typeof parsed.query === "string") {
          setQuery(parsed.query);
          setShownQuery(parsed.query);
        }

        const savedResults: Beat[] = Array.isArray(parsed.results)
          ? parsed.results
          : [];
        const savedAlternatives: Beat[] = Array.isArray(parsed.alternatives)
          ? parsed.alternatives
          : [];

        let visibleResults = savedResults;
        let visibleAlternatives = savedAlternatives;
        const ids = [...new Set(
          [...savedResults, ...savedAlternatives]
            .map((beat) => beat?.id)
            .filter((id): id is string => typeof id === "string"),
        )];

        // Do not restore a cached player for a beat the producer has since
        // turned OFF (or deleted). This check uses the same published-only
        // endpoint as the cart, and fails closed if visibility cannot be verified.
        if (ids.length > 0) {
          try {
            const response = await fetch("/api/cart/beats", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ beatIds: ids }),
              cache: "no-store",
            });
            const data = await response.json();

            if (!response.ok || !data.success || !Array.isArray(data.beats)) {
              throw new Error(data.error || "Could not verify cached beat availability.");
            }

            const visibleIds = new Set<string>(
              data.beats
                .map((beat: { id?: unknown }) => beat?.id)
                .filter((id: unknown): id is string => typeof id === "string"),
            );
            visibleResults = savedResults.filter((beat) => visibleIds.has(beat.id));
            visibleAlternatives = savedAlternatives.filter((beat) => visibleIds.has(beat.id));
          } catch (visibilityError) {
            console.warn("Could not verify cached beat visibility:", visibilityError);
            visibleResults = [];
            visibleAlternatives = [];
          }
        }

        if (cancelled) return;

        setResults(visibleResults);
        setAlternatives(visibleAlternatives);
        setAlternativeReason(
          typeof parsed.alternativeReason === "string"
            ? parsed.alternativeReason
            : null,
        );

        // Replace the saved state too, so unavailable beats are not restored again.
        try {
          sessionStorage.setItem(
            "epsilone-search-state",
            JSON.stringify({
              ...parsed,
              results: visibleResults,
              alternatives: visibleAlternatives,
            }),
          );
        } catch {
          // Rendering still works if session storage is unavailable.
        }

        if (
          parsed.searched === true ||
          visibleResults.length > 0 ||
          visibleAlternatives.length > 0
        ) {
          setSearched(true);
        }
      } catch (restoreError) {
        console.error("Failed to restore search state:", restoreError);
      } finally {
        if (!cancelled) setRestored(true);
      }
    }

    void restoreSearchState();
    return () => {
      cancelled = true;
    };
  }, []);

  // ------------------------------------------------------
  // Save search state
  // ------------------------------------------------------

  function saveSearchState(
    nextQuery: string,
    nextResults: Beat[],
    nextAlternatives: Beat[],
    nextAlternativeReason: string | null,
  ) {
    try {
      sessionStorage.setItem(
        "epsilone-search-state",
        JSON.stringify({
          query: nextQuery,
          results: nextResults,
          alternatives: nextAlternatives,
          alternativeReason: nextAlternativeReason,
          searched: true,
        }),
      );
    } catch (saveError) {
      console.error("Failed to save search state:", saveError);
    }
  }

  // ------------------------------------------------------
  // Search
  // ------------------------------------------------------

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const searchQuery = query.trim();

    if (!searchQuery || loading) {
      return;
    }

    setLoading(true);
    setError("");
    setSearched(false);
    setResults([]);
    setAlternatives([]);
    setAlternativeReason(null);
    setShownQuery(searchQuery);

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchQuery,
        }),
      });

      const data: RecommendResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Recommendation failed");
      }

      const nextResults = data.results ?? [];
      const nextAlternatives = data.alternatives ?? [];
      const nextAlternativeReason = data.alternativeReason ?? null;

      setResults(nextResults);
      setAlternatives(nextAlternatives);
      setAlternativeReason(nextAlternativeReason);
      setSearched(true);

      saveSearchState(
        searchQuery,
        nextResults,
        nextAlternatives,
        nextAlternativeReason,
      );
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }

  const hasActivity =
    loading ||
    !!error ||
    searched ||
    results.length > 0 ||
    alternatives.length > 0;

  // Exact matches always take priority over alternatives.
  const displayedBeats = results.length > 0 ? results : alternatives;
  const showingAlternatives = results.length === 0 && alternatives.length > 0;

  return (
    <main
      dir="rtl"
      className={`font-fa relative flex flex-col overflow-hidden bg-ep-bg text-white ${
        hasActivity ? "min-h-svh" : "h-svh"
      }`}
    >
      {/* Top bar */}

      <HomeMenu showMobileLogo={false} />

    

      {/* Hero */}
      <section
        className={`relative z-10 mx-auto flex max-w-2xl flex-col items-center px-5 text-center transition-all ${
          hasActivity ? "pt-12 pb-8" : "flex-1 justify-center pb-24"
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-64 w-[34rem] max-w-full -translate-x-1/2 rounded-full blur-3xl"
        />

        <div className="mb-20 mt-2 w-60 sm:mb-14 sm:w-72 md:w-120">
          <EpsiloneLogo />
        </div>

        <form onSubmit={handleSubmit} className="w-full">
          <div className="glass-bar flex h-12 items-center gap-3 rounded-full py-1 pr-5 pl-1">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ff7f5c"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
              className="shrink-0"
            >
              <path d="M3 10v4M7 7v10M11 3v18M15 8v8M19 6v12M22 11v2" />
            </svg>

            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="مثلا : یه بیت گنگ میخوام"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
            />

            <button
              type="submit"
              disabled={loading || !query.trim()}
              aria-label="جستجو"
              className="glass-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              )}
            </button>
          </div>
        </form>

        <p className="mt-6 text-sm leading-8 text-white/90">
          حس فضا یا داستانی که توی ذهنت داری رو توصیف کن
          <br />
          اپسیلون با هوش مصنوعی اونو پیدا میکنه برات
        </p>
      </section>

      {/* Results */}
      <section className="relative z-10 mx-auto  max-w-7xl px-5 pb-40">
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-400"
          >
            {error}
          </div>
        )}

        {loading && (
          <div
            role="status"
            className="py-10 text-center text-sm text-zinc-400"
          >
            دارم حس و حالتو تحلیل میکنم...
          </div>
        )}

        {/* Show results or alternatives */}
        {restored && !loading && displayedBeats.length > 0 && (
          <div>
            {showingAlternatives ? (
              <div
                role="status"
                className="mb-6 rounded-2xl border border-brand/20 bg-white/[0.03] px-5 py-6 text-center"
              >
                <p
                  dir="ltr"
                  className="mb-3 text-[10px] font-semibold tracking-[0.24em] text-brand"
                >
                  CLOSEST ALTERNATIVES
                </p>

                <h2 className="text-xl font-semibold text-white sm:text-2xl">
                  نزدیک‌ترین گزینه‌ها
                </h2>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-400">
                  {getAlternativeMessage(alternativeReason)}
                </p>
              </div>
            ) : (
              shownQuery && (
                <h2 className="mb-6 text-center text-lg font-medium text-white">
                  {shownQuery}
                </h2>
              )
            )}

            <div className="space-y-4">
              {displayedBeats.map((beat) => {
                // Alternative scores come from a relaxed search.
                // Do not display them as exact-match percentages.
                const cardBeat = showingAlternatives
                  ? ({ ...beat, match_score: null } as Beat)
                  : beat;

                return <BeatResultCard key={beat.id} beat={cardBeat} />;
              })}
            </div>
          </div>
        )}

        {/* Empty state only when neither exact matches nor alternatives exist */}
        {restored &&
          !loading &&
          !error &&
          searched &&
          displayedBeats.length === 0 && (
            <div
              role="status"
              className="py-10 text-center text-sm leading-8 text-zinc-500"
            >
              حس پیچیده‌ای داری؛ هنوز بیت مناسبی برای این حال‌وهوا پیدا نکردیم
              :(
            </div>
          )}
      </section>

      <WaveBackground />
    </main>
  );
}
