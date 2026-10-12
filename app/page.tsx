"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
// import { WaveformPlayer } from "@arraypress/waveform-player-react";
// import FavoriteButton from "@/components/FavoriteButton";
// import AddToCartButton from "@/components/AddToCartButton";
import BeatResultCard, { type Beat } from "@/components/BeatResultCard";
import HomeMenu from "@/components/HomeMenu";
import EpsiloneLogo from "@/components/EpsiloneLogo";
import WaveBackground from "@/components/WaveBackground";

// type Beat = {
//   id: string;
//   title: string;
//   audio_url: string | null;
//   preview_url: string | null;
//   cover_url: string | null;
//   bpm: number | null;
//   key: string | null;
//   genre: string | null;
//   match_score: number | null;
//   producer_id: string | null;
//   producer_username: string | null;
// };

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
  error?: string;
};

export default function Page() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [restored, setRestored] = useState(false);
  const [searched, setSearched] = useState(false);
  const [shownQuery, setShownQuery] = useState("");
  // ------------------------------------------------------
  // Restore previous search
  // ------------------------------------------------------

  useEffect(() => {
    try {
      const savedSearch = sessionStorage.getItem("epsilone-search-state");

      if (!savedSearch) {
        setRestored(true);
        return;
      }

      const parsed = JSON.parse(savedSearch);

      if (typeof parsed.query === "string") {
        setQuery(parsed.query);
      }

      if (Array.isArray(parsed.results)) {
        setResults(parsed.results);
      }
    } catch (error) {
      console.error("Failed to restore search state:", error);
    } finally {
      setRestored(true);
    }
  }, []);

  // ------------------------------------------------------
  // Save search state
  // ------------------------------------------------------

  function saveSearchState(nextQuery: string, nextResults: Beat[]) {
    try {
      sessionStorage.setItem(
        "epsilone-search-state",
        JSON.stringify({
          query: nextQuery,
          results: nextResults,
        }),
      );
    } catch (error) {
      console.error("Failed to save search state:", error);
    }
  }

  // ------------------------------------------------------
  // Search
  // ------------------------------------------------------

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!query.trim()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query.trim(),
        }),
      });

      const data: RecommendResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Recommendation failed");
      }

      const nextResults = data.results ?? [];

      setResults(nextResults);
      setSearched(true);
      setShownQuery(query.trim());

      saveSearchState(query.trim(), nextResults);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const hasActivity = loading || !!error || searched || results.length > 0;

  return (
    <main
      dir="rtl"
      className={`font-fa relative flex flex-col overflow-hidden bg-ink text-white ${
        hasActivity ? "min-h-svh" : "h-svh"
      }`}
    >
      {/* Top bar */}
      <header className="relative z-20 flex items-center justify-between px-5 pt-5 sm:px-12 sm:pt-7">
        <HomeMenu />

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="rounded-full border border-brand/70 px-8 py-2 text-xs font-bold text-white transition hover:bg-brand/10"
          >
            ورود
          </Link>
          <Link
            href="/signup"
            className="hidden text-xs text-white/90 transition hover:text-brand sm:block"
          >
            ثبت نام
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        className={`relative z-10 mx-auto flex max-w-2xl flex-col items-center px-5 text-center transition-all ${
          hasActivity ? "pt-12 pb-8" : "flex-1 justify-center pb-24"
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-64 w-[34rem] max-w-full -translate-x-1/2 rounded-full  blur-3xl"
        />
        <div className="mb-20 mt-2 w-60 sm:mb-14 sm:w-72 md:w-120 ">
          <EpsiloneLogo />
        </div>

        <form onSubmit={handleSubmit} className="w-full">
          <div className="glass-bar flex h-12 items-center gap-3 rounded-full py-1 pr-5 pl-1">
            {/* waveform icon (right side in RTL) */}
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
              disabled={loading}
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
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-40">
        {error && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading && (
          <div className="py-10 text-center text-sm text-zinc-400">
            دارم حس و حالتو تحلیل میکنم...
          </div>
        )}

        {/*{restored && !loading && results.length > 0 && (
          <div className="space-y-4">
            <h2 className="mb-4 text-lg font-semibold">بیت‌های پیشنهادی</h2>

            {results.map((beat) => (
              <div
                key={beat.id}
                className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                {beat.cover_url && (
                  <img
                    src={beat.cover_url}
                    alt={beat.title ?? "Beat cover"}
                    className="h-24 w-24 rounded-xl object-cover"
                  />
                )}

                <div className="min-w-0 flex-1" dir="ltr">
                  <div className="mb-1 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold">
                        {beat.title ?? "Untitled Beat"}
                      </h3>

                      {beat.producer_username && (
                        <Link
                          href={`/producers/${encodeURIComponent(
                            beat.producer_username,
                          )}`}
                          className="mt-1 inline-block text-sm text-zinc-500 transition hover:text-brand"
                        >
                          @{beat.producer_username}
                        </Link>
                      )}
                    </div>

                    <span className="text-sm text-brand">
                      {Number(beat.match_score).toFixed(1)}%
                    </span>

                    <FavoriteButton beatId={beat.id} />
                  </div>

                  <p className="mb-2 text-sm text-zinc-500">
                    {beat.genre ?? "Unknown genre"}
                    {beat.bpm ? ` • ${beat.bpm} BPM` : ""}
                    {beat.key ? ` • ${beat.key}` : ""}
                  </p>

                  {(beat.preview_url || beat.audio_url) && (
                    <WaveformPlayer
                      url={beat.preview_url ?? beat.audio_url ?? ""}
                      title={beat.title ?? "Untitled Beat"}
                      waveformStyle="line"
                    />
                  )}

                  <AddToCartButton
                    beatId={beat.id}
                    title={beat.title ?? "Untitled Beat"}
                  />

                  <Link
                    href={`/beat/${beat.id}`}
                    className="mt-3 flex w-full items-center justify-center rounded-full border border-brand/60 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand/10"
                  >
                    View Beat →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}*/}
        {restored && !loading && results.length > 0 && (
          <div>
            {shownQuery && (
              <h2 className="mb-6 text-center text-lg font-medium text-white">
                {shownQuery}
              </h2>
            )}

            <div className="space-y-4">
              {results.map((beat) => (
                <BeatResultCard key={beat.id} beat={beat} />
              ))}
            </div>
          </div>
        )}
        {restored && !loading && !error && searched && results.length === 0 && (
          <div className="py-10 text-center text-sm text-zinc-500">
            حس پیچیده ای داری هنوز بیتی به این احوالات نداریم :(
          </div>
        )}
      </section>

      <WaveBackground />
    </main>
  );
}
