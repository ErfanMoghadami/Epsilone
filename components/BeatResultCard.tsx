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
  // (روی لینک، دکمه، پلیر و مودال سبد خرید کار نمی‌کنه)
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
      className="glass-card flex cursor-pointer gap-4 rounded-2xl p-4"
    >
      {/* Cover */}
      <Link href={beatHref} className="shrink-0" aria-label={beat.title}>
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

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* Title + producer + favorite */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 text-right" dir="ltr">
            <Link
              href={beatHref}
              className="block truncate text-sm font-medium text-white transition hover:text-brand"
            >
              {beat.title ?? "Untitled Beat"}
            </Link>

            {beat.producer_username && (
              <Link
                href={`/producers/${encodeURIComponent(beat.producer_username)}`}
                className="mt-0.5 block truncate text-[11px] text-zinc-500 transition hover:text-brand"
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
          {/*<FavoriteButton beatId={beat.id} minimal />*/}
        </div>

        {/* Player */}
        {audioUrl && (
          <div className="beat-player w-full">
            <WaveformPlayer
              url={audioUrl}
              title={beat.title ?? "Untitled Beat"}
              waveformStyle="bars"
              height={36}
              samples={240}
              barWidth={2}
              barSpacing={2}
              barRadius={1}
              waveformColor="rgba(255,255,255,0.28)"
              progressColor="#ff7f5c"
              buttonSize={36}
              showInfo={false}
              showTime={false}
              showBPM={false}
              showPlaybackSpeed={false}
            />
          </div>
        )}

        {/* Meta + actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex items-center gap-4 text-[11px] text-zinc-400"
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
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {beat.genre && (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-zinc-400">
                {beat.genre}
              </span>
            )}

            <Link
              href={beatHref}
              className="flex h-9 items-center gap-1.5 rounded-full border border-brand/60 px-4 text-xs font-medium text-white transition hover:bg-brand/10"
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
