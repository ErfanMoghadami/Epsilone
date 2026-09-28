"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { WaveformPlayer } from "@arraypress/waveform-player-react";
import { deleteBeat, retryAnalysis } from "./actions";
import { useRouter } from "next/navigation";
const supabase = createClient();

type Beat = {
  id: string;
  title: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  analysis_status: string | null;
  analysis_error: string | null;
  preview_url: string | null;
  audio_url: string | null;
};

type Analytics = {
  suggested: number;
  played: number;
  favorites: number;
};
function getFriendlyAnalysisError(error: string | null): string {
  if (!error) {
    return "The model is temporarily unavailable. Please try again in a little while.";
  }

  const normalizedError = error.toLowerCase();

  if (
    normalizedError.includes("429") ||
    normalizedError.includes("resource_exhausted") ||
    normalizedError.includes("quota exceeded")
  ) {
    return "The model is temporarily unavailable right now. Please try again in a little while.";
  }

  return "Something went wrong while analyzing this beat. Please try again in a little while.";
}
export default function Page() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, Analytics>>({});
  const [deletingBeatId, setDeletingBeatId] = useState<string | null>(null);
  const [retryingBeatId, setRetryingBeatId] = useState<string | null>(null);
const router = useRouter();
  async function dataUser() {
    const { data, error: authError } = await supabase.auth.getUser();

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

    const { data, error: fetchError } = await supabase
      .from("beats")
      .select(
        "id, title, bpm, key, genre, analysis_status, analysis_error, preview_url, audio_url",
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

    const { data: analyticsData, error: analyticsError } = await supabase.rpc(
      "get_producer_beat_analytics",
    );

    if (analyticsError) {
      setError(analyticsError.message);
      setIsLoading(false);
      return;
    }

    const analyticsMap: Record<string, Analytics> = {};

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
        suggested: Number(row.suggested_count ?? 0),
        played: Number(row.played_count ?? 0),
        favorites: Number(row.favorites_count ?? 0),
      };
    }

    setAnalytics(analyticsMap);
    setIsLoading(false);
  }

  useEffect(() => {
    if (!user) return;

    fetchBeats(user.id);
  }, [user]);

  async function handleDeleteBeat(beat: Beat) {
    const beatTitle = beat.title ?? "Untitled Beat";

    const confirmed = window.confirm(
      `Delete "${beatTitle}" permanently?\n\nThis will remove the beat from your beats list and delete its R2 media files.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setSuccess(null);
    setDeletingBeatId(beat.id);

    try {
      const result = await deleteBeat(beat.id);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setBeats((currentBeats) =>
        currentBeats.filter((currentBeat) => currentBeat.id !== beat.id),
      );

      setAnalytics((currentAnalytics) => {
        const nextAnalytics = { ...currentAnalytics };
        delete nextAnalytics[beat.id];
        return nextAnalytics;
      });

      setSuccess(result.message ?? "Beat deleted successfully.");
    } catch (deleteError) {
      console.error("Delete beat error:", deleteError);
      setError("Something went wrong while deleting this beat.");
    } finally {
      setDeletingBeatId(null);
    }
  }

  async function handleRetryAnalysis(beat: Beat) {
    if (beat.analysis_status !== "failed") {
      return;
    }

    setError(null);
    setSuccess(null);
    setRetryingBeatId(beat.id);

    try {
      const result = await retryAnalysis(beat.id);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setBeats((currentBeats) =>
        currentBeats.map((currentBeat) =>
          currentBeat.id === beat.id
            ? {
                ...currentBeat,
                analysis_status: "pending",
                analysis_error: null,
              }
            : currentBeat,
        ),
      );

      setSuccess(result.message);
    } catch (retryError) {
      console.error("Retry analysis error:", retryError);
      setError("Something went wrong while retrying the analysis.");
    } finally {
      setRetryingBeatId(null);
    }
  }

  function getAnalysisStatusLabel(status: string | null): string {
    switch (status) {
      case "pending":
        return "Pending";
      case "processing":
        return "Processing";
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
      default:
        return status ?? "Unknown";
    }
  }

  function getAnalysisStatusClass(status: string | null): string {
    switch (status) {
      case "completed":
        return "bg-green-900/40 text-green-400";
      case "processing":
        return "bg-yellow-900/40 text-yellow-400";
      case "pending":
        return "bg-blue-900/40 text-blue-400";
      case "failed":
        return "bg-red-900/40 text-red-400";
      default:
        return "bg-zinc-800 text-zinc-400";
    }
  }

  function getPlayRate(beatId: string): string {
    const stats = analytics[beatId];

    if (!stats || stats.suggested === 0) {
      return "0%";
    }

    const rate = (stats.played / stats.suggested) * 100;

    return `${rate.toFixed(1)}%`;
  }

  return (
    <div className="min-h-screen bg-black p-8 text-white">
      <h1 className="mb-6 text-2xl font-bold">My Beats</h1>

      {success && (
        <p className="mb-4 rounded-lg border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-400">
          {success}
        </p>
      )}

      {isLoading && <p className="text-sm text-zinc-400">Loading beats...</p>}

      {error && (
        <p className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {!isLoading && !error && beats.length === 0 && (
        <p className="text-sm text-zinc-500">هنوز بیتی آپلود نکردی.</p>
      )}

      {!isLoading && !error && beats.length > 0 && (
        <div className="grid gap-3">
          {beats.map((beat) => {
            const stats = analytics[beat.id] ?? {
              suggested: 0,
              played: 0,
              favorites: 0,
            };

            const isDeleting = deletingBeatId === beat.id;

            return (
              <div
                key={beat.id}
                className="rounded-xl border border-white/10 bg-zinc-950 px-5 py-4 transition hover:bg-white/5"
              >
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <p className="font-medium">
                      {beat.title ?? "Untitled Beat"}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      {beat.bpm ?? "-"} BPM &nbsp;&middot;&nbsp;
                      {beat.key ?? "-"}
                      &nbsp;&middot;&nbsp;
                      {beat.genre ?? "Unknown genre"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getAnalysisStatusClass(beat.analysis_status)}`}
                    >
                      {getAnalysisStatusLabel(beat.analysis_status)}
                    </span>

                    {beat.analysis_status === "failed" && (
                      <button
                        type="button"
                        onClick={() => handleRetryAnalysis(beat)}
                        disabled={retryingBeatId === beat.id || isDeleting}
                        className="rounded-lg border border-amber-900/70 px-3 py-1.5 text-xs font-medium text-amber-400 transition hover:bg-amber-950/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {retryingBeatId === beat.id
                          ? "Retrying..."
                          : "Retry Analysis"}
                      </button>
                    )}

                    <Link
                      href={`/producer/beats/${beat.id}/edit`}
                      className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
                    >
                      Edit
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDeleteBeat(beat)}
                      disabled={
                        isDeleting || beat.analysis_status === "processing"
                      }
                      className="rounded-lg border border-red-900/70 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-950/50 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/producer/beats/${beat.id}/licenses`)
                      }
                      className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
                    >
                      Licenses
                    </button>
                  </div>
                </div>

                {beat.analysis_status === "failed" && beat.analysis_error && (
                  <div className="mt-4 rounded-lg border border-red-900/60 bg-red-950/20 px-4 py-3">
                    <p className="text-xs font-medium text-red-400">
                      Analysis error
                    </p>
                    <p className="mt-1 break-words text-xs leading-5 text-red-300/80">
                      {getFriendlyAnalysisError(beat.analysis_error)}
                    </p>
                  </div>
                )}

                {(beat.preview_url || beat.audio_url) && (
                  <div className="mt-4">
                    <WaveformPlayer
                      url={beat.preview_url ?? beat.audio_url ?? ""}
                      title={beat.title ?? "Untitled Beat"}
                      waveformStyle="line"
                    />
                  </div>
                )}

                <div className="mt-4 grid grid-cols-4 gap-3 border-t border-white/10 pt-4">
                  <div>
                    <p className="text-xs text-zinc-500">Suggested</p>

                    <p className="mt-1 text-lg font-semibold">
                      {stats.suggested}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">Played</p>

                    <p className="mt-1 text-lg font-semibold">{stats.played}</p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">Favorites</p>

                    <p className="mt-1 text-lg font-semibold">
                      {stats.favorites}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">Play Rate</p>

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
