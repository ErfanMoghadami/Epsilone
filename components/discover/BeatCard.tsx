"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

import FavoriteButton from "@/components/FavoriteButton";
import AddToCartButton from "@/components/AddToCartButton";
import BeatPreviewPlayer from "@/components/BeatPreviewPlayer";
import { formatPrice, type DiscoverBeat } from "@/lib/discover";

export default function BeatCard({ beat }: { beat: DiscoverBeat }) {
  const router = useRouter();
  const producerName =
    beat.producer_display_name?.trim() ||
    beat.producer_username?.trim() ||
    "Producer";

  function handleCardClick(event: MouseEvent<HTMLElement>) {
    const target = event.target;

    if (!(target instanceof Element)) return;

    // Keep links, buttons, the audio player, form controls and dialogs working normally.
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
      onClick={handleCardClick}
      className="glass-card cursor-pointer overflow-hidden rounded-2xl"
    >
      {/* Cover */}
      <div className="relative">
        {beat.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={beat.cover_url}
            alt={beat.title ? `${beat.title} cover` : "Beat cover"}
            className="aspect-square w-full object-cover"
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-white/5 text-sm text-zinc-500">
            No cover
          </div>
        )}

        <div className="absolute right-3 top-3">
          <FavoriteButton beatId={beat.id} />
        </div>
      </div>

      {/* Content: spacing and sizing kept as before */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-white">
              {beat.title}
            </h3>

            {beat.producer_username ? (
              <Link
                href={`/producers/${encodeURIComponent(beat.producer_username)}`}
                className="mt-1 inline-block text-sm text-zinc-500 transition hover:text-brand"
              >
                @{beat.producer_username}
              </Link>
            ) : (
              <p className="mt-1 text-sm text-zinc-500">{producerName}</p>
            )}
          </div>

          <div className="shrink-0 text-right">
            {Number(beat.discount_percent ?? 0) > 0 && (
              <span className="mb-1 inline-flex rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand">
                {Number(beat.discount_percent)}% OFF
              </span>
            )}
            <p
              className={`text-sm font-medium ${Number(beat.discount_percent ?? 0) > 0 ? "text-brand" : "text-zinc-300"}`}
            >
              {formatPrice(beat.starting_price, beat.currency)}
            </p>
            {Number(beat.discount_percent ?? 0) > 0 &&
              beat.original_starting_price != null && (
                <p className="mt-0.5 text-xs text-zinc-500 line-through">
                  {formatPrice(beat.original_starting_price, beat.currency)}
                </p>
              )}
          </div>
        </div>

        <p className="mt-3 text-sm text-zinc-500">
          {beat.genre ?? "Unknown genre"}
          {" • "}
          {beat.bpm ?? "-"} BPM
          {" • "}
          {beat.key ?? "-"}
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

        {/* Audio controls are excluded from the card navigation handler. */}
        {beat.preview_url && (
          <div className="beat-preview-player mt-4">
            <BeatPreviewPlayer
              url={beat.preview_url}
              title={beat.title ?? "Untitled Beat"}
            />
          </div>
        )}

        <div className="mt-4 grid gap-2">
          <Link
            href={`/beat/${beat.id}`}
            className="flex w-full items-center justify-center rounded-xl border border-brand/60 px-4 py-3 text-sm font-medium text-white transition hover:bg-brand/10"
          >
            View Beat →
          </Link>

          <AddToCartButton
            beatId={beat.id}
            title={beat.title ?? "Untitled Beat"}
          />
        </div>
      </div>
    </article>
  );
}
