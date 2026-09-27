"use client";

import { useState } from "react";
import { WaveformPlayer } from "@arraypress/waveform-player-react";
import FavoriteButton from "@/components/FavoriteButton";

type Beat = {
  id: string;
  title: string | null;
  cover_url: string | null;
  audio_url: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  preview_url: string | null;
};

export default function FavoriteBeatCard({
  beat,
  onRemoved,
}: {
  beat: Beat;
  onRemoved?: (beatId: string) => void;
}) {
  const [visible, setVisible] = useState(true);

  function handleFavoriteChange(favorited: boolean) {
    if (!favorited) {
      setVisible(false);

      setTimeout(() => {
        onRemoved?.(beat.id);
      }, 200);
    }
  }

  if (!visible) {
    return (
      <div className="animate-pulse rounded-2xl border border-white/10 bg-zinc-950 p-4 opacity-50">
        <div className="h-24 rounded-xl bg-zinc-900" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4 transition-opacity duration-200">
      <div className="flex gap-4">
        {beat.cover_url ? (
          <img
            src={beat.cover_url}
            alt={beat.title ?? "Beat cover"}
            className="h-24 w-24 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="h-24 w-24 shrink-0 rounded-xl bg-zinc-900" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-white">
                {beat.title ?? "Untitled Beat"}
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                {beat.bpm ?? "-"} BPM
                {" · "}
                {beat.key ?? "-"}
                {" · "}
                {beat.genre ?? "Unknown genre"}
              </p>
            </div>

            <FavoriteButton
              beatId={beat.id}
              onFavoriteChange={handleFavoriteChange}
            />
          </div>
        </div>
      </div>

      {beat.audio_url && (
        <div className="mt-4">
          <WaveformPlayer
            url={beat.preview_url ?? beat.audio_url ?? ""}
            title={beat.title ?? "Untitled Beat"}
            waveformStyle="line"
          />
        </div>
      )}
    </div>
  );
}
