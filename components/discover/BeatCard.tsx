import Link from "next/link";

import FavoriteButton from "@/components/FavoriteButton";
import AddToCartButton from "@/components/AddToCartButton";
import BeatPreviewPlayer from "@/components/BeatPreviewPlayer";
import { formatPrice, type DiscoverBeat } from "@/lib/discover";

export default function BeatCard({ beat }: { beat: DiscoverBeat }) {
  const producerName =
    beat.producer_display_name?.trim() ||
    beat.producer_username?.trim() ||
    "Producer";

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
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
          <div className="flex aspect-square w-full items-center justify-center bg-zinc-900 text-sm text-zinc-600">
            No cover
          </div>
        )}

        <div className="absolute right-3 top-3">
          <FavoriteButton beatId={beat.id} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold">{beat.title}</h3>

            {beat.producer_username ? (
              <Link
                href={`/producers/${encodeURIComponent(beat.producer_username)}`}
                className="mt-1 inline-block text-sm text-zinc-500 transition hover:text-white"
              >
                @{beat.producer_username}
              </Link>
            ) : (
              <p className="mt-1 text-sm text-zinc-600">{producerName}</p>
            )}
          </div>

          <p className="shrink-0 text-sm font-medium text-zinc-300">
            {formatPrice(beat.starting_price, beat.currency)}
          </p>
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
                className="rounded-full border border-zinc-800 px-2.5 py-1 text-[11px] text-zinc-500"
              >
                {mood}
              </span>
            ))}
          </div>
        )}

        {/* Player */}
        {beat.preview_url && (
          <div className="mt-4">
            <BeatPreviewPlayer
              url={beat.preview_url}
              title={beat.title ?? "Untitled Beat"}
            />
          </div>
        )}

        <div className="mt-4 grid gap-2">
          <Link
            href={`/beat/${beat.id}`}
            className="flex w-full items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:border-zinc-500 hover:bg-zinc-800"
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