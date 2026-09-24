"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Beat = {
  id: string;
  title: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  analysis_status: string | null;
};

type Analytics = {
  suggested: number;
  played: number;
  favorites: number;
};

export default function Page() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [analytics, setAnalytics] = useState<
    Record<string, Analytics>
  >({});

  async function dataUser() {
    const {
      data,
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    if (!data.user) {
      setError("User not authenticated");
      setIsLoading(false);
      return;
    }

    setUser(data.user);
  }

  useEffect(() => {
    dataUser();
  }, []);

  async function fetchBeats(userId: string) {
    setIsLoading(true);
    setError(null);

    const {
      data,
      error: fetchError,
    } = await supabase
      .from("beats")
      .select(
        "id, title, bpm, key, genre, analysis_status"
      )
      .eq("producer_id", userId)
      .order("created_at", {
        ascending: false,
      });

    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
      return;
    }

    const fetchedBeats = (data ?? []) as Beat[];

    setBeats(fetchedBeats);

    if (fetchedBeats.length === 0) {
      setAnalytics({});
      setIsLoading(false);
      return;
    }

    const {
      data: analyticsData,
      error: analyticsError,
    } = await supabase.rpc(
      "get_producer_beat_analytics"
    );

    if (analyticsError) {
      setError(analyticsError.message);
      setIsLoading(false);
      return;
    }

    const analyticsMap: Record<
      string,
      Analytics
    > = {};

    for (const beat of fetchedBeats) {
      analyticsMap[beat.id] = {
        suggested: 0,
        played: 0,
        favorites: 0,
      };
    }

    for (const row of analyticsData ?? []) {
      if (!analyticsMap[row.beat_id]) {
        continue;
      }

      analyticsMap[row.beat_id] = {
        suggested: Number(
          row.suggested_count ?? 0
        ),
        played: Number(
          row.played_count ?? 0
        ),
        favorites: Number(
          row.favorites_count ?? 0
        ),
      };
    }

    setAnalytics(analyticsMap);
    setIsLoading(false);
  }

  useEffect(() => {
    if (!user) return;

    fetchBeats(user.id);
  }, [user]);

  function getPlayRate(
    beatId: string
  ): string {
    const stats = analytics[beatId];

    if (!stats || stats.suggested === 0) {
      return "0%";
    }

    const rate =
      (stats.played / stats.suggested) *
      100;

    return `${rate.toFixed(1)}%`;
  }

  return (
    <div className="min-h-screen bg-black p-8 text-white">
      <h1 className="mb-6 text-2xl font-bold">
        My Beats
      </h1>

      {isLoading && (
        <p className="text-sm text-zinc-400">
          Loading beats...
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {!isLoading &&
        !error &&
        beats.length === 0 && (
          <p className="text-sm text-zinc-500">
            هنوز بیتی آپلود نکردی.
          </p>
        )}

      {!isLoading &&
        !error &&
        beats.length > 0 && (
          <div className="grid gap-3">
            {beats.map((beat) => {
              const stats =
                analytics[beat.id] ?? {
                  suggested: 0,
                  played: 0,
                  favorites: 0,
                };

              return (
                <div
                  key={beat.id}
                  className="rounded-xl border border-white/10 bg-zinc-950 px-5 py-4 transition hover:bg-white/5"
                >
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <p className="font-medium">
                        {beat.title ??
                          "Untitled Beat"}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {beat.bpm ?? "-"} BPM
                        &nbsp;&middot;&nbsp;
                        {beat.key ?? "-"}
                        &nbsp;&middot;&nbsp;
                        {beat.genre ??
                          "Unknown genre"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        beat.analysis_status ===
                        "completed"
                          ? "bg-green-900/40 text-green-400"
                          : beat.analysis_status ===
                              "processing"
                            ? "bg-yellow-900/40 text-yellow-400"
                            : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {beat.analysis_status ??
                        "unknown"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-3 border-t border-white/10 pt-4">
                    <div>
                      <p className="text-xs text-zinc-500">
                        Suggested
                      </p>

                      <p className="mt-1 text-lg font-semibold">
                        {stats.suggested}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-zinc-500">
                        Played
                      </p>

                      <p className="mt-1 text-lg font-semibold">
                        {stats.played}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-zinc-500">
                        Favorites
                      </p>

                      <p className="mt-1 text-lg font-semibold">
                        {stats.favorites}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-zinc-500">
                        Play Rate
                      </p>

                      <p className="mt-1 text-lg font-semibold">
                        {getPlayRate(beat.id)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}