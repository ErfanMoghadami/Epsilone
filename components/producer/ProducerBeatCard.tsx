"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { WaveformPlayer } from "@arraypress/waveform-player-react";

import FavoriteButton from "@/components/FavoriteButton";
import AddToCartButton from "@/components/AddToCartButton";
import { formatToman } from "@/lib/format-price";

export type ProducerBeatCardData = {
  id: string;
  title: string | null;
  bpm: number | null;
  key: string | null;
  coverUrl: string | null;
  previewUrl: string | null;
  /** کمترین قیمت لایسنس بعد از تخفیف */
  price: number | null;
  /** کمترین قیمت لایسنس قبل از تخفیف */
  originalPrice: number | null;
  discountPercent: number;
};

export default function ProducerBeatCard({
  beat,
}: {
  beat: ProducerBeatCardData;
}) {
  const router = useRouter();
  const title = beat.title ?? "Untitled Beat";
  const hasDiscount = beat.discountPercent > 0 && beat.originalPrice !== null;

  function handleCardClick(event: MouseEvent<HTMLElement>) {
    const target = event.target;

    if (!(target instanceof Element)) return;

    if (
      target.closest(
        "a, button, input, select, textarea, [role='button'], .beat-player, [role='dialog']",
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
      className="glass-card flex h-full cursor-pointer flex-col rounded-2xl p-3 sm:p-3.5"
    >
      {/* Cover */}
      {beat.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={beat.coverUrl}
          alt={`${title} cover`}
          className="aspect-square w-full rounded-xl object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-white/5 text-xs text-zinc-500">
          بدون کاور
        </div>
      )}

      {/* Title + favorite */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <h3 dir="auto" className="truncate text-sm font-semibold text-white">
          {title}
        </h3>

        <FavoriteButton beatId={beat.id} minimal />
      </div>

      {/* Key • BPM */}
      <p
        dir="ltr"
        className="mt-0.5 flex items-center justify-end gap-3 text-[11px] text-zinc-400"
      >
        <span>{beat.key ?? "-"}</span>
        <span>bpm: {beat.bpm ?? "-"}</span>
      </p>

      {/* Player */}
      {beat.previewUrl && (
        <div className="beat-player mt-3" dir="ltr">
          <WaveformPlayer
            url={beat.previewUrl}
            title={title}
            waveformStyle="bars"
            height={28}
            samples={120}
            barWidth={2}
            barSpacing={2}
            barRadius={1}
            waveformColor="rgba(128,128,128,0.45)"
            progressColor="#ff7f5c"
            buttonSize={28}
            showInfo={false}
            showTime={false}
            showBPM={false}
            showPlaybackSpeed={false}
          />
        </div>
      )}

      {/* Buy + price */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <div className="min-w-0">
          {beat.price !== null ? (
            <>
              <p className="truncate text-[11px] font-semibold text-white sm:text-xs">
                <span className="font-normal text-zinc-400">قیمت: </span>
                {formatToman(beat.price)} تومان
              </p>
              {hasDiscount && (
                <p className="mt-0.5 text-[10px] text-zinc-500 line-through">
                  {formatToman(beat.originalPrice as number)}
                </p>
              )}
            </>
          ) : (
            <p className="text-[11px] text-zinc-500">قیمت نامشخص</p>
          )}
        </div>

        <div className="shrink-0">
          <AddToCartButton beatId={beat.id} title={title} variant="compact" />
        </div>
      </div>
    </article>
  );
}