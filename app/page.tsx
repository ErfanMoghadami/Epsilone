"use client";

import React from "react";

import { FormEvent, useState } from "react";

import { WaveformPlayer } from "@arraypress/waveform-player-react";

type Beat = {
  id: string;
  title: string | null;
  audio_url: string | null;
  cover_url: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  match_score: number;
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setResults([]);

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

      setResults(data.results ?? []);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-4xl font-bold">Epsilone</h1>

          <p className="text-zinc-400">
            Describe the beat you are looking for.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mb-10 flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
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

        {error && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-red-400">
            {error}
          </div>
        )}

        {loading && (
          <div className="py-10 text-center text-zinc-500">
            Understanding your mood...
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-4">
            <h2 className="mb-4 text-xl font-semibold">Recommended Beats</h2>

            {results.map((beat) => (
              <div
                key={beat.id}
                className="flex gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
              >
                {beat.cover_url && (
                  <img
                    src={beat.cover_url}
                    alt={beat.title ?? "Beat cover"}
                    className="h-24 w-24 rounded-xl object-cover"
                  />
                )}

                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between gap-4">
                    <h3 className="font-semibold">
                      {beat.title ?? "Untitled Beat"}
                    </h3>

                    <span className="text-sm text-zinc-400">
                      {Number(beat.match_score).toFixed(1)}%
                    </span>
                  </div>

                  <p className="mb-2 text-sm text-zinc-500">
                    {beat.genre ?? "Unknown genre"}
                    {beat.bpm ? ` • ${beat.bpm} BPM` : ""}
                    {beat.key ? ` • ${beat.key}` : ""}
                  </p>

                  {beat.audio_url && (
                    <WaveformPlayer
                      url={beat.audio_url ?? ""}
                      title={beat.title ?? "Untitled Beat"}
                      waveformStyle="line"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="py-16 text-center text-zinc-600">
            حس پیچیده ای داری هنوز بیتی به این احوالات نداریم :(
          </div>
        )}
      </div>
    </main>
  );
}
