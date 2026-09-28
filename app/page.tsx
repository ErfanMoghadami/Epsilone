"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import WaveformTracker from "@arraypress/waveform-tracker";
import { WaveformPlayer } from "@arraypress/waveform-player-react";
import FavoriteButton from "@/components/FavoriteButton";
import AddToCartButton from "@/components/AddToCartButton";

type Beat = {
  id: string;
  title: string;
  audio_url: string | null;
  preview_url: string | null;
  cover_url: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  match_score: number | null;
  producer_id: string | null;
};

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

  // ------------------------------------------------------
  // Waveform analytics
  // ------------------------------------------------------

  useEffect(() => {
    WaveformTracker.init({
      endpoint: "/api/analytics/play",
      events: {
        play: 3,
      },
    });
  }, []);

  // ------------------------------------------------------
  // Restore previous search
  // ------------------------------------------------------

  useEffect(() => {
    try {
      const savedSearch = sessionStorage.getItem(
        "epsilone-search-state",
      );

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
      console.error(
        "Failed to restore search state:",
        error,
      );
    } finally {
      setRestored(true);
    }
  }, []);

  // ------------------------------------------------------
  // Save search state
  // ------------------------------------------------------

  function saveSearchState(
    nextQuery: string,
    nextResults: Beat[],
  ) {
    try {
      sessionStorage.setItem(
        "epsilone-search-state",
        JSON.stringify({
          query: nextQuery,
          results: nextResults,
        }),
      );
    } catch (error) {
      console.error(
        "Failed to save search state:",
        error,
      );
    }
  }

  // ------------------------------------------------------
  // Search
  // ------------------------------------------------------

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
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

      const data: RecommendResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Recommendation failed",
        );
      }

      const nextResults = data.results ?? [];

      setResults(nextResults);

      saveSearchState(
        query.trim(),
        nextResults,
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">

        {/* Header */}

        <div className="mb-10 text-center">
          <h1 className="mb-3 text-4xl font-bold">
            Epsilone
          </h1>

          <p className="text-zinc-400">
            Describe the beat you are looking for.
          </p>
        </div>

        {/* Search */}

        <form
          onSubmit={handleSubmit}
          className="mb-10 flex gap-3"
        >
          <input
            type="text"
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="یه بیت غمگین و شبونه برای رانندگی میخوام..."
            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4 outline-none placeholder:text-zinc-600 focus:border-zinc-500"
          />

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-white px-6 py-4 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Analyzing..." : "Search"}
          </button>
        </form>

        {/* Error */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Loading */}

        {loading && (
          <div className="py-10 text-center text-zinc-500">
            Understanding your mood...
          </div>
        )}

        {/* Results */}

        {restored &&
          !loading &&
          results.length > 0 && (
            <div className="space-y-4">

              <h2 className="mb-4 text-xl font-semibold">
                Recommended Beats
              </h2>

              {results.map((beat) => (
                <div
                  key={beat.id}
                  className="flex gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
                >
                  {/* Cover */}

                  {beat.cover_url && (
                    <img
                      src={beat.cover_url}
                      alt={
                        beat.title ?? "Beat cover"
                      }
                      className="h-24 w-24 rounded-xl object-cover"
                    />
                  )}

                  <div className="flex-1">

                    {/* Title / Match / Favorite */}

                    <div className="mb-1 flex items-center justify-between gap-4">
                      <h3 className="font-semibold">
                        {beat.title ??
                          "Untitled Beat"}
                      </h3>

                      <span className="text-sm text-zinc-400">
                        {Number(
                          beat.match_score,
                        ).toFixed(1)}
                        %
                      </span>

                      <FavoriteButton
                        beatId={beat.id}
                      />
                    </div>

                    {/* Metadata */}

                    <p className="mb-2 text-sm text-zinc-500">
                      {beat.genre ??
                        "Unknown genre"}

                      {beat.bpm
                        ? ` • ${beat.bpm} BPM`
                        : ""}

                      {beat.key
                        ? ` • ${beat.key}`
                        : ""}
                    </p>

                    {/* Player */}

                    {(beat.preview_url ||
                      beat.audio_url) && (
                      <WaveformPlayer
                        url={
                          beat.preview_url ??
                          beat.audio_url ??
                          ""
                        }
                        title={
                          beat.title ??
                          "Untitled Beat"
                        }
                        waveformStyle="line"
                      />
                    )}

                    {/* Cart */}

                    <AddToCartButton
                      beatId={beat.id}
                      title={
                        beat.title ??
                        "Untitled Beat"
                      }
                    />

                    {/* View Beat */}

                    <Link
                      href={`/beat/${beat.id}`}
                      className="mt-3 flex w-full items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:border-zinc-500 hover:bg-zinc-800"
                    >
                      View Beat →
                    </Link>

                  </div>
                </div>
              ))}
            </div>
          )}

        {/* Empty state */}

        {restored &&
          !loading &&
          !error &&
          results.length === 0 && (
            <div className="py-16 text-center text-zinc-600">
              حس پیچیده ای داری هنوز بیتی به این
              احوالات نداریم :(
            </div>
          )}

      </div>
    </main>
  );
}