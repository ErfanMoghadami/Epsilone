"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { WaveformPlayer } from "@arraypress/waveform-player-react";
import { deleteBeat, retryAnalysis, toggleBeatPublishing } from "./actions";
import { useRouter } from "next/navigation";
const supabase = createClient();

type Beat = {
  id: string;
  title: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  analysis_status: string | null;
  is_published: boolean;
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
    return "مدل موقتاً در دسترس نیست. لطفاً کمی بعد دوباره تلاش کن.";
  }

  const normalizedError = error.toLowerCase();

  if (
    normalizedError.includes("429") ||
    normalizedError.includes("resource_exhausted") ||
    normalizedError.includes("quota exceeded")
  ) {
    return "مدل موقتاً در دسترس نیست. لطفاً کمی بعد دوباره تلاش کن.";
  }

  return "هنگام تحلیل این بیت مشکلی پیش آمد. لطفاً کمی بعد دوباره تلاش کن.";
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
  const [togglingBeatId, setTogglingBeatId] = useState<string | null>(null);
const router = useRouter();
  async function dataUser() {
    const { data, error: authError } = await supabase.auth.getUser();

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    if (!data.user) {
      setError("وارد حساب کاربری نشده‌ای.");
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
        "id, title, bpm, key, genre, analysis_status, is_published, analysis_error, preview_url, audio_url",
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
    const beatTitle = beat.title ?? "بیت بدون عنوان";

    const confirmed = window.confirm(
      `«${beatTitle}» برای همیشه حذف شود؟\n\nبیت از فهرست بیت‌هایت پاک می‌شود و فایل‌های رسانه‌اش هم حذف می‌شوند.`,
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

      // Home keeps its last recommendation results in sessionStorage. Remove
      // this beat from that saved state as well, so navigating back home does
      // not render a player pointing at media that has just been deleted.
      try {
        const storageKey = "epsilone-search-state";
        const rawSavedSearch = sessionStorage.getItem(storageKey);

        if (rawSavedSearch) {
          const savedValue: unknown = JSON.parse(rawSavedSearch);

          if (savedValue && typeof savedValue === "object") {
            const saved = savedValue as Record<string, unknown>;
            const removeDeletedBeat = (items: unknown) =>
              Array.isArray(items)
                ? items.filter((item) => {
                    if (!item || typeof item !== "object") return true;
                    return !("id" in item) || item.id !== beat.id;
                  })
                : [];

            sessionStorage.setItem(
              storageKey,
              JSON.stringify({
                ...saved,
                results: removeDeletedBeat(saved.results),
                alternatives: removeDeletedBeat(saved.alternatives),
              }),
            );
          }
        }
      } catch (cacheError) {
        console.warn("Could not update saved home search results:", cacheError);
      }

      setBeats((currentBeats) =>
        currentBeats.filter((currentBeat) => currentBeat.id !== beat.id),
      );

      setAnalytics((currentAnalytics) => {
        const nextAnalytics = { ...currentAnalytics };
        delete nextAnalytics[beat.id];
        return nextAnalytics;
      });

      setSuccess(result.message ?? "بیت با موفقیت حذف شد.");
    } catch (deleteError) {
      console.error("Delete beat error:", deleteError);
      setError("هنگام حذف این بیت مشکلی پیش آمد.");
    } finally {
      setDeletingBeatId(null);
    }
  }

  async function handleTogglePublishing(beat: Beat) {
    const nextIsPublished = !beat.is_published;
    const title = beat.title ?? "بیت بدون عنوان";

    if (nextIsPublished === false) {
      const confirmed = window.confirm(
        `«${title}» خاموش شود؟\n\nاین بیت از بخش کشف، ترندها، پیشنهادها و خریدهای جدید پنهان می‌شود. سفارش‌های قبلی و فایل‌های رسانه تغییری نمی‌کنند.`,
      );
      if (!confirmed) return;
    }

    setError(null);
    setSuccess(null);
    setTogglingBeatId(beat.id);

    try {
      const result = await toggleBeatPublishing(beat.id, nextIsPublished);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setBeats((currentBeats) =>
        currentBeats.map((currentBeat) =>
          currentBeat.id === beat.id
            ? { ...currentBeat, is_published: result.isPublished }
            : currentBeat,
        ),
      );
      setSuccess(result.message);
      router.refresh();
    } catch (toggleError) {
      console.error("Publishing toggle error:", toggleError);
      setError("هنگام تغییر وضعیت انتشار مشکلی پیش آمد.");
    } finally {
      setTogglingBeatId(null);
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
      setError("هنگام تحلیل دوباره مشکلی پیش آمد.");
    } finally {
      setRetryingBeatId(null);
    }
  }

  function getAnalysisStatusLabel(status: string | null): string {
    switch (status) {
      case "pending":
        return "در انتظار";
      case "processing":
        return "در حال تحلیل";
      case "completed":
        return "تکمیل شد";
      case "failed":
        return "ناموفق";
      case "skipped":
        return "رد شد";
      default:
        return status ?? "نامشخص";
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
    <div className="min-h-screen bg-black p-0 text-white sm:p-4 md:p-8">
      <h1 className="mb-6 text-2xl font-bold">بیت‌های من</h1>

      {success && (
        <p className="mb-4 rounded-lg border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-400">
          {success}
        </p>
      )}

      {isLoading && <p className="text-sm text-zinc-400">در حال بارگذاری بیت‌ها...</p>}

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
                className="rounded-xl border border-white/10 bg-zinc-950 px-4 py-4 transition hover:bg-white/5 sm:px-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {beat.title ?? "بیت بدون عنوان"}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      <span dir="ltr">{beat.bpm ?? "-"} BPM</span> &nbsp;&middot;&nbsp;
                      {beat.key ?? "-"}
                      &nbsp;&middot;&nbsp;
                      {beat.genre ?? "ژانر نامشخص"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getAnalysisStatusClass(beat.analysis_status)}`}
                    >
                      {getAnalysisStatusLabel(beat.analysis_status)}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        beat.analysis_status === "completed" || beat.analysis_status === "skipped"
                          ? beat.is_published
                            ? "bg-emerald-900/40 text-emerald-400"
                            : "bg-zinc-800 text-zinc-400"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                      title={
                        beat.analysis_status === "completed" || beat.analysis_status === "skipped"
                          ? beat.is_published ? "در فروشگاه نمایش داده می‌شود" : "از فروشگاه پنهان است"
                          : "پس از تکمیل یا رد شدن تحلیل فعال می‌شود"
                      }
                    >
                      {beat.analysis_status === "completed" || beat.analysis_status === "skipped"
                        ? beat.is_published ? "روشن · منتشر شده" : "خاموش · پنهان"
                        : "آماده نیست"}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleTogglePublishing(beat)}
                      disabled={
                        togglingBeatId === beat.id ||
                        deletingBeatId === beat.id ||
                        retryingBeatId === beat.id ||
                        !(beat.analysis_status === "completed" || beat.analysis_status === "skipped")
                      }
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        beat.is_published
                          ? "border-amber-900/70 text-amber-400 hover:bg-amber-950/50 hover:text-amber-300"
                          : "border-emerald-900/70 text-emerald-400 hover:bg-emerald-950/50 hover:text-emerald-300"
                      }`}
                    >
                      {togglingBeatId === beat.id
                        ? "در حال ذخیره..."
                        : beat.is_published ? "غیر فعال کردن" : "فعال کردن"}
                    </button>

                    {beat.analysis_status === "failed" && (
                      <button
                        type="button"
                        onClick={() => handleRetryAnalysis(beat)}
                        disabled={retryingBeatId === beat.id || isDeleting}
                        className="rounded-lg border border-amber-900/70 px-3 py-1.5 text-xs font-medium text-amber-400 transition hover:bg-amber-950/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {retryingBeatId === beat.id
                          ? "در حال تلاش دوباره..."
                          : "تحلیل دوباره"}
                      </button>
                    )}

                    <Link
                      href={`/producer/beats/${beat.id}/edit`}
                      className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
                    >
                      ویرایش
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDeleteBeat(beat)}
                      disabled={
                        isDeleting || beat.analysis_status === "processing"
                      }
                      className="rounded-lg border border-red-900/70 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-950/50 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isDeleting ? "در حال حذف..." : "حذف"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/producer/beats/${beat.id}/licenses`)
                      }
                      className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
                    >
                      لایسنس‌ها
                    </button>
                  </div>
                </div>

                {beat.analysis_status === "failed" && beat.analysis_error && (
                  <div className="mt-4 rounded-lg border border-red-900/60 bg-red-950/20 px-4 py-3">
                    <p className="text-xs font-medium text-red-400">
                      خطای تحلیل
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
                      title={beat.title ?? "بیت بدون عنوان"}
                      waveformStyle="line"
                    />
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-zinc-500">پیشنهادشده</p>

                    <p className="mt-1 text-lg font-semibold">
                      {stats.suggested}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">پخش‌شده</p>

                    <p className="mt-1 text-lg font-semibold">{stats.played}</p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">علاقه‌مندی‌ها</p>

                    <p className="mt-1 text-lg font-semibold">
                      {stats.favorites}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">نرخ پخش</p>

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
