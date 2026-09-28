import Link from "next/link";
import { notFound } from "next/navigation";

import BeatPreviewPlayer from "@/components/BeatPreviewPlayer";
import FavoriteButton from "@/components/FavoriteButton";
import AddToCartButton from "@/components/AddToCartButton";
import { createClient } from "@/lib/supabase/server";
import { getR2SignedUrl } from "@/lib/r2";
import BackButton from "@/components/BackButton";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Beat = {
  id: string;
  title: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  moods: string[] | null;
  preview_url: string | null;
  preview_key: string | null;
  cover_url: string | null;
  cover_key: string | null;
  producer_id: string | null;
};

type Producer = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export default async function BeatDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  // --------------------------------------------------------
  // Beat
  // --------------------------------------------------------

  const { data: beatData, error: beatError } = await supabase
    .from("beats")
    .select(
      `
        id,
        title,
        bpm,
        key,
        genre,
        moods,
        preview_url,
        preview_key,
        cover_url,
        cover_key,
        producer_id
        `,
    )
    .eq("id", id)
    .single();

  if (beatError || !beatData) {
    notFound();
  }

  const beat = beatData as Beat;

  // --------------------------------------------------------
  // Producer
  // --------------------------------------------------------

  let producer: Producer | null = null;

  if (beat.producer_id) {
    const { data: producerData, error: producerError } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .eq("id", beat.producer_id)
      .eq("role", "producer")
      .single();

    if (!producerError && producerData) {
      producer = producerData as Producer;
    }
  }

  const producerName =
    producer?.display_name?.trim() || producer?.username?.trim() || "Producer";

  const producerInitial = producerName.charAt(0).toUpperCase();

  // --------------------------------------------------------
  // R2 Preview / Cover
  // --------------------------------------------------------

  let previewUrl = beat.preview_url;
  let coverUrl = beat.cover_url;

  if (!previewUrl && beat.preview_key) {
    previewUrl = await getR2SignedUrl(beat.preview_key, 600);
  }

  if (!coverUrl && beat.cover_key) {
    coverUrl = await getR2SignedUrl(beat.cover_key, 3600);
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        {/* ------------------------------------------------ */}
        {/* Back */}
        {/* ------------------------------------------------ */}

        <BackButton
          className="mb-8 inline-flex text-sm text-zinc-500 transition hover:text-white"
        />

        {/* ------------------------------------------------ */}
        {/* Main Beat */}
        {/* ------------------------------------------------ */}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Left */}
          <section>
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={beat.title ? `${beat.title} cover` : "Beat cover"}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-zinc-900 text-sm text-zinc-600">
                  No cover
                </div>
              )}
            </div>
          </section>

          {/* Right */}
          <section className="flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-zinc-600">
                  Beat
                </p>

                <h1 className="text-3xl font-bold tracking-tight">
                  {beat.title ?? "Untitled Beat"}
                </h1>

                {/* Producer */}
                {producer ? (
                  <Link
                    href={`/producers/${producer.id}`}
                    className="mt-3 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
                  >
                    {producer.avatar_url ? (
                      <img
                        src={producer.avatar_url}
                        alt={producerName}
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-400">
                        {producerInitial}
                      </div>
                    )}

                    <span>{producerName}</span>
                  </Link>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">Producer</p>
                )}
              </div>

              <FavoriteButton beatId={beat.id} />
            </div>

            {/* -------------------------------------------- */}
            {/* Metadata */}
            {/* -------------------------------------------- */}

            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs text-zinc-600">BPM</p>

                <p className="mt-1 font-semibold">{beat.bpm ?? "-"}</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs text-zinc-600">Key</p>

                <p className="mt-1 font-semibold">{beat.key ?? "-"}</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs text-zinc-600">Genre</p>

                <p className="mt-1 font-semibold">{beat.genre ?? "-"}</p>
              </div>
            </div>

            {/* -------------------------------------------- */}
            {/* Vibe */}
            {/* -------------------------------------------- */}

            {beat.moods && beat.moods.length > 0 && (
              <div className="mt-6">
                <p className="mb-3 text-sm font-medium text-zinc-300">Vibe</p>

                <div className="flex flex-wrap gap-2">
                  {beat.moods.map((mood) => (
                    <span
                      key={mood}
                      className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-400"
                    >
                      {mood}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* -------------------------------------------- */}
            {/* Player */}
            {/* -------------------------------------------- */}

            {previewUrl ? (
              <div className="mt-8">
                <p className="mb-3 text-sm font-medium text-zinc-300">
                  Preview
                </p>

                <BeatPreviewPlayer
                  url={previewUrl}
                  title={beat.title ?? "Untitled Beat"}
                />
              </div>
            ) : (
              <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">
                Preview is not available yet.
              </div>
            )}

            {/* -------------------------------------------- */}
            {/* Purchase */}
            {/* -------------------------------------------- */}

            <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="mb-4">
                <h2 className="font-semibold">Choose a License</h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Select the license that fits your use.
                </p>
              </div>

              <AddToCartButton
                beatId={beat.id}
                title={beat.title ?? "Untitled Beat"}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
