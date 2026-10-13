"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { WaveformPlayer } from "@arraypress/waveform-player-react";
import FavoriteButton from "@/components/FavoriteButton";
import AddToCartButton from "@/components/AddToCartButton";

export type Beat = {
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
  producer_username: string | null;
};

export default function BeatResultCard({ beat }: { beat: Beat }) {
  const router = useRouter();
  const audioUrl = beat.preview_url ?? beat.audio_url;
  const beatHref = `/beat/${beat.id}`;

  const matchScore =
    beat.match_score !== null && !Number.isNaN(Number(beat.match_score))
      ? Math.round(Number(beat.match_score))
      : null;

  // کلیک روی هر جای خالی کارت = رفتن به صفحه‌ی بیت
  function handleCardClick(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;

    if (
      target.closest("a, button, input, select, .beat-player, [role='dialog']")
    ) {
      return;
    }

    router.push(beatHref);
  }

  return (
    <article
      onClick={handleCardClick}
      className="glass-card grid cursor-pointer grid-cols-[auto_1fr] items-start gap-x-4 gap-y-3 rounded-2xl p-4"
    >
      {/* Cover (روی دسکتاپ کنار هر سه ردیف، روی موبایل فقط ردیف بالا) */}
      <Link
        href={beatHref}
        className="shrink-0 sm:row-span-3"
        aria-label={beat.title}
      >
        {beat.cover_url ? (
          <img
            src={beat.cover_url}
            alt={beat.title ?? "Beat cover"}
            className="h-20 w-20 rounded-xl object-cover sm:h-24 sm:w-24"
          />
        ) : (
          <div className="h-20 w-20 rounded-xl bg-white/5 sm:h-24 sm:w-24" />
        )}
      </Link>

      {/* Title + producer + match + favorite */}
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 text-right" dir="ltr">
          <Link
            href={beatHref}
            className="block truncate text-base font-medium text-white transition hover:text-brand sm:text-sm"
          >
            {beat.title ?? "Untitled Beat"}
          </Link>

          {beat.producer_username && (
            <Link
              href={`/producers/${encodeURIComponent(beat.producer_username)}`}
              className="mt-0.5 block truncate text-xs text-zinc-500 transition hover:text-brand sm:text-[14px]"
            >
              {beat.producer_username}
            </Link>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {matchScore !== null && (
            <span
              title="میزان تطابق با توصیف تو"
              className="rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand"
              dir="ltr"
            >
              {matchScore}% match
            </span>
          )}

          <FavoriteButton beatId={beat.id} minimal />
        </div>
      </div>

      {/* Player: روی موبایل تمام عرض کارت */}
      {audioUrl && (
        <div className="beat-player col-span-2 w-full sm:col-span-1" dir="ltr">
          <WaveformPlayer
            url={audioUrl}
            title={beat.title ?? "Untitled Beat"}
            waveformStyle="bars"
            height={40}
            samples={240}
            barWidth={2}
            barSpacing={2}
            barRadius={1}
            // waveformColor="rgba(255,255,255,0.28)"
            waveformColor="rgba(128,128,128,0.45)"
            progressColor="#ff7f5c"
            buttonSize={40}
            showInfo={false}
            showTime={false}
            showBPM={false}
            showPlaybackSpeed={false}
          />
        </div>
      )}

      {/* Meta + actions: روی موبایل تمام عرض، دکمه‌ها بزرگ */}
      <div className="col-span-2 flex flex-col gap-3 sm:col-span-1 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-400 sm:text-[11px]"
          dir="ltr"
        >
          {beat.bpm && (
            <span className="flex items-center gap-1.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M3 10v4M7 7v10M11 3v18M15 8v8M19 6v12M22 11v2" />
              </svg>
              bpm: {beat.bpm}
            </span>
          )}

          {beat.key && (
            <span className="flex items-center gap-1.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              {beat.key}
            </span>
          )}

          {beat.genre && (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-zinc-400">
              {beat.genre}
            </span>
          )}
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Link
            href={beatHref}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-brand/60 px-4 text-sm font-medium text-white transition hover:bg-brand/10 sm:h-9 sm:flex-none sm:text-xs"
          >
            مشاهده بیت
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>

          {/* دکمه‌ی خرید: موبایل بزرگ و نصف ردیف، دسکتاپ کوچیک */}
          <div className="flex-1 sm:flex-none [&>button]:h-11 [&>button]:w-full [&>button]:justify-center [&>button]:text-sm sm:[&>button]:h-9 sm:[&>button]:w-auto sm:[&>button]:text-xs">
            <AddToCartButton
              beatId={beat.id}
              title={beat.title ?? "Untitled Beat"}
              variant="compact"
            />
          </div>
        </div>
      </div>
    </article>
  );
}
