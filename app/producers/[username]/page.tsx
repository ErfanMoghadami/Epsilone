import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import BeatPreviewPlayer from "@/components/BeatPreviewPlayer";
import FavoriteButton from "@/components/FavoriteButton";
import AddToCartButton from "@/components/AddToCartButton";

type ProducerProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
};

type ProducerBeat = {
  id: string;
  title: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  preview_url: string | null;
  preview_key: string | null;
  cover_url: string | null;
  cover_key: string | null;
};

function buildR2Url(key: string | null): string | null {
  const r2PublicUrl = process.env.R2_PUBLIC_URL
    ?.trim()
    .replace(/\/+$/, "");

  if (!r2PublicUrl || !key) {
    return null;
  }

  return `${r2PublicUrl}/${key
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export default async function ProducerProfilePage({
  params,
}: ProducerProfilePageProps) {
  const { username } = await params;

  const supabase = await createClient();

  // --------------------------------------------------------
  // Producer profile
  // --------------------------------------------------------

  const { data: producer, error: producerError } =
    await supabase
      .from("profiles")
      .select(
        "id, role, display_name, username, bio, avatar_url",
      )
      .eq("username", username.toLowerCase())
      .eq("role", "producer")
      .single();

  if (producerError) {
    throw new Error(
      `Producer query failed: ${producerError.message}`,
    );
  }

  if (!producer) {
    notFound();
  }

  const producerId = producer.id;

  // --------------------------------------------------------
  // Producer beats
  // --------------------------------------------------------

  const { data: beats, error: beatsError } =
    await supabase
      .from("beats")
      .select(
        `
        id,
        title,
        bpm,
        key,
        genre,
        preview_url,
        preview_key,
        cover_url,
        cover_key
        `,
      )
      .eq("producer_id", producerId)
      .eq("analysis_status", "completed")
      .order("created_at", {
        ascending: false,
      });

  if (beatsError) {
    throw new Error(
      `Could not load producer beats: ${beatsError.message}`,
    );
  }

  // --------------------------------------------------------
  // Build R2 public URLs
  // --------------------------------------------------------

  const beatCards = (beats ?? []).map(
    (beat: ProducerBeat) => {
      const previewUrl =
        beat.preview_url ??
        buildR2Url(beat.preview_key);

      const coverUrl =
        beat.cover_url ??
        buildR2Url(beat.cover_key);

      return {
        ...beat,
        previewUrl,
        coverUrl,
      };
    },
  );

  const producerName =
    producer.display_name?.trim() ||
    producer.username?.trim() ||
    "Producer";

  const producerInitial =
    producerName.charAt(0).toUpperCase();

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        {/* Producer Header */}
        <section className="mb-12">
          <div className="flex items-center gap-5">
            {producer.avatar_url ? (
              <img
                src={producer.avatar_url}
                alt={producerName}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-800 text-3xl font-semibold">
                {producerInitial}
              </div>
            )}

            <div>
              <p className="mb-1 text-sm text-zinc-500">
                Producer
              </p>

              <h1 className="text-3xl font-bold">
                {producerName}
              </h1>

              {producer.username && (
                <p className="mt-1 text-sm text-zinc-500">
                  @{producer.username}
                </p>
              )}
            </div>
          </div>

          {producer.bio && (
            <p className="mt-5 max-w-2xl text-zinc-400">
              {producer.bio}
            </p>
          )}
        </section>

        {/* Beats */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              Beats
            </h2>

            <span className="text-sm text-zinc-500">
              {beatCards.length} beat
              {beatCards.length === 1 ? "" : "s"}
            </span>
          </div>

          {beatCards.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center">
              <p className="text-zinc-500">
                This producer has no published beats yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {beatCards.map((beat) => (
                <article
                  key={beat.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
                >
                  <div className="mb-4 flex gap-4">
                    {beat.coverUrl ? (
                      <img
                        src={beat.coverUrl}
                        alt={beat.title ?? "Beat cover"}
                        className="h-28 w-28 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="h-28 w-28 rounded-xl bg-zinc-900" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="truncate text-lg font-semibold">
                            {beat.title ?? "Untitled Beat"}
                          </h3>

                          <p className="mt-1 text-sm text-zinc-500">
                            {beat.genre ?? "Unknown genre"}
                            {beat.bpm
                              ? ` • ${beat.bpm} BPM`
                              : ""}
                            {beat.key
                              ? ` • ${beat.key}`
                              : ""}
                          </p>
                        </div>

                        <FavoriteButton beatId={beat.id} />
                      </div>
                    </div>
                  </div>

                  {beat.previewUrl && (
                    <div className="mb-4">
                      <BeatPreviewPlayer
                        url={beat.previewUrl}
                        title={
                          beat.title ?? "Untitled Beat"
                        }
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <Link
                      href={`/beat/${beat.id}`}
                      className="flex w-full items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:border-zinc-500 hover:bg-zinc-800"
                    >
                      View Beat →
                    </Link>

                    <AddToCartButton
                      beatId={beat.id}
                      title={
                        beat.title ?? "Untitled Beat"
                      }
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}