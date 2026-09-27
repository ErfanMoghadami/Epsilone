"use client";

import { useState } from "react";
import FavoriteBeatCard from "@/components/FavoriteBeatCard";

type Beat = {
  id: string;
  title: string | null;
  cover_url: string | null;
  audio_url: string | null;
  preview_url: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
};

export default function FavoriteBeatsList({
  beats: initialBeats,
}: {
  beats: Beat[];
}) {
  const [beats, setBeats] =
    useState(initialBeats);

  function handleRemoved(beatId: string) {
    setBeats((current) =>
      current.filter(
        (beat) => beat.id !== beatId
      )
    );
  }

  if (beats.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-950 p-10 text-center">
        <p className="text-zinc-400">
          هنوز هیچ بیتی را Favorite نکردی.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {beats.map((beat) => (
        <FavoriteBeatCard
          key={beat.id}
          beat={beat}
          onRemoved={handleRemoved}
        />
      ))}
    </div>
  );
}