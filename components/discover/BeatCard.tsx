"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

import FavoriteButton from "@/components/FavoriteButton";
import AddToCartButton from "@/components/AddToCartButton";
import BeatPreviewPlayer from "@/components/BeatPreviewPlayer";
import { formatPrice } from "@/lib/discover";
import { formatPriceAmount } from "@/lib/format-price";

export type CardBeat = {
  id: string;
  title: string | null;
  cover_url: string | null;
  preview_url: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  moods?: string[] | null;
  producer_username: string | null;
  producer_display_name: string | null;
  starting_price?: number | null;
  original_starting_price?: number | null;
  discount_percent?: number | null;
  currency?: string | null;
};

type BeatCardProps = {
  beat: CardBeat;
  /** شماره‌ی رتبه (فقط Trending) */
  rank?: number;
  /** بارگذاری فوری کاور برای کارت‌های بالای صفحه */
  eager?: boolean;
  /** محتوای اضافه بین مشخصات و پلیر (مثلاً آمار Trending) */
  extra?: ReactNode;
};

export default function BeatCard({
  beat,
  rank,
  eager = false,
  extra,
}: BeatCardProps) {
  const router = useRouter();

  const producerName =
    beat.producer_display_name?.trim() ||
    beat.producer_username?.trim() ||
    "Producer";

  const discount = Number(beat.discount_percent ?? 0);
  const hasPrice =
    beat.starting_price !== null && beat.starting_price !== undefined;

  function handleCardClick(event: MouseEvent<HTMLElement>) {
    const target = event.target;

    if (!(target instanceof Element)) return;

    // لینک‌ها، دکمه‌ها، پلیر، فرم‌ها و پنجره‌ها کار عادی خودشون رو می‌کنن.
    if (
      target.closest(
        "a, button, input, select, textarea, [role='button'], .beat-preview-player, [role='dialog']",
      )
    ) {
      return;
    }

    router.push(`/beat/${beat.id}`);
  }

  return (
    <article
      dir="rtl"
      onClick={handleCardClick}
      className="glass-card flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl"
    >
      {/* Cover */}
      <div className="relative">
        {beat.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={beat.cover_url}
            alt={beat.title ? `${beat.title} cover` : "Beat cover"}
            className="aspect-square w-full object-cover"
            loading={eager ? "eager" : "lazy"}
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-white/5 text-sm text-zinc-500">
            بدون کاور
          </div>
        )}

        {rank !== undefined && (
          <div
            dir="ltr"
            className="absolute left-3 top-3 rounded-lg border border-white/10 bg-black/70 px-2.5 py-1 text-xs text-zinc-200 backdrop-blur"
          >
            #{rank}
          </div>
        )}

        <div className="absolute right-3 top-3 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
          <FavoriteButton beatId={beat.id} minimal />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 text-right">
            <h3
              dir="auto"
              className="truncate text-lg font-semibold text-white"
            >
              {beat.title ?? "Untitled Beat"}
            </h3>

            {beat.producer_username ? (
              <Link
                href={`/producers/${encodeURIComponent(beat.producer_username)}`}
                className="mt-1 inline-block text-sm text-zinc-500 transition hover:text-brand"
              >
                <span dir="ltr">@{beat.producer_username}</span>
              </Link>
            ) : (
              <p dir="auto" className="mt-1 text-sm text-zinc-500">
                {producerName}
              </p>
            )}
          </div>

          {hasPrice && (
            <div className="shrink-0 text-right">
              {discount > 0 && (
                <span className="mb-1 inline-flex rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand">
                  {discount}٪ تخفیف
                </span>
              )}
              <p
                className={`text-sm font-medium ${discount > 0 ? "text-brand" : "text-zinc-300"}`}
              >
                {formatPrice(beat.starting_price, beat.currency)}
              </p>
              {discount > 0 && beat.original_starting_price != null && (
                <p className="mt-0.5 text-xs text-zinc-500 line-through">
                  {formatPriceAmount(beat.original_starting_price)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ژانر • BPM • کلید */}
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
          <span dir="auto">{beat.genre ?? "ژانر نامشخص"}</span>
          <span aria-hidden="true">•</span>
          <span dir="ltr">{beat.bpm ?? "-"} BPM</span>
          <span aria-hidden="true">•</span>
          <span dir="ltr">{beat.key ?? "-"}</span>
        </p>

        {/* Mood tags */}
        {beat.moods && beat.moods.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {beat.moods.slice(0, 4).map((mood) => (
              <span
                key={mood}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-400"
              >
                {mood}
              </span>
            ))}
          </div>
        )}

        {extra}

        {/* Player: از نوار کنترل کارت مستثنا شده */}
        {beat.preview_url && (
          <div className="beat-preview-player mt-4" dir="ltr">
            <BeatPreviewPlayer
              url={beat.preview_url}
              title={beat.title ?? "Untitled Beat"}
            />
          </div>
        )}

        {/* دکمه‌ها همیشه ته کارت */}
        <div className="mt-auto flex items-center gap-2 pt-4">
          <Link
            href={`/beat/${beat.id}`}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-brand/60 px-3 text-sm font-medium text-white transition hover:bg-brand/10 sm:h-10"
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

          <div className="flex-1 [&>button]:h-11 [&>button]:w-full [&>button]:justify-center [&>button]:text-sm sm:[&>button]:h-10 [&>div]:h-11 [&>div]:w-full sm:[&>div]:h-10">
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