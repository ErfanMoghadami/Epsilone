import Link from "next/link";
import { notFound } from "next/navigation";

import BeatDetailPlayer from "@/components/BeatDetailPlayer";
import FavoriteButton from "@/components/FavoriteButton";
import AddToCartButton from "@/components/AddToCartButton";
import { createClient } from "@/lib/supabase/server";
import { getR2SignedUrl } from "@/lib/r2";

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
  subgenre: string | null;
  moods: string[] | null;
  preview_url: string | null;
  preview_key: string | null;
  cover_url: string | null;
  cover_key: string | null;
  producer_id: string | null;
  discount_percent: number | null;
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
        subgenre,
        moods,
        preview_url,
        preview_key,
        cover_url,
        cover_key,
        producer_id,
        discount_percent
        `,
    )
    .eq("id", id)
    .eq("is_published", true)
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
      .maybeSingle();

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
    <main
      dir="rtl"
      className="min-h-screen px-5 py-8 text-white sm:px-6 sm:py-12"
    >
      <div className="mx-auto max-w-5xl">
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
          {/* ---------------------------------------------- */}
          {/* Media: cover + player (right side on desktop)   */}
          {/* ---------------------------------------------- */}
          <section className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-white/10">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt={beat.title ? `${beat.title} cover` : "Beat cover"}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-white/5 text-sm text-zinc-500">
                  بدون کاور
                </div>
              )}
            </div>

            {previewUrl ? (
              <div className="mt-5">
                <BeatDetailPlayer
                  url={previewUrl}
                  title={beat.title ?? "Untitled Beat"}
                />
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-500">
                پیش‌نمایش هنوز آماده نیست.
              </div>
            )}
          </section>

          {/* ---------------------------------------------- */}
          {/* Info (left side on desktop)                     */}
          {/* ---------------------------------------------- */}
          <section className="flex min-w-0 flex-col">
            {/* Title + favorite */}
            <div className="flex items-start justify-between gap-4">
              <h1
                dir="auto"
                className="min-w-0 break-words text-2xl font-bold tracking-tight sm:text-3xl"
              >
                {beat.title ?? "Untitled Beat"}
              </h1>

              <FavoriteButton beatId={beat.id} minimal />
            </div>

            {Number(beat.discount_percent ?? 0) > 0 && (
              <span className="mt-3 inline-flex w-fit rounded-full bg-orange-500/15 text-orange-700 dark:bg-orange-300/15 dark:text-orange-200 px-3 py-1 text-xs font-bold">
                {Number(beat.discount_percent)}٪ تخفیف روی همه‌ی لایسنس‌ها
              </span>
            )}

            {/* Producer */}
            {producer?.username ? (
              <Link
                href={`/producers/${encodeURIComponent(producer.username)}`}
                className="mt-4 inline-flex w-fit items-center gap-2.5 text-sm text-zinc-300 transition hover:text-white"
              >
                {producer.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={producer.avatar_url}
                    alt={producerName}
                    className="h-9 w-9 rounded-full object-cover ring-1 ring-white/20"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300 ring-1 ring-white/20">
                    {producerInitial}
                  </div>
                )}

                <span dir="auto">{producerName}</span>
              </Link>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">{producerName}</p>
            )}

            {/* Metadata */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="glass-card rounded-xl p-3 sm:p-4">
                <p className="text-[11px] text-zinc-500">ژانر</p>
                <p dir="auto" className="mt-1 truncate text-sm font-bold">
                  {beat.genre ?? "-"}
                </p>
                {beat.subgenre && (
                  <p
                    dir="auto"
                    className="mt-0.5 truncate text-[11px] text-violet-300"
                  >
                    {beat.subgenre}
                  </p>
                )}
              </div>

              <div className="glass-card rounded-xl p-3 sm:p-4">
                <p className="text-[11px] text-zinc-500" dir="ltr">
                  KEY
                </p>
                <p dir="ltr" className="mt-1 truncate text-sm font-bold">
                  {beat.key ?? "-"}
                </p>
              </div>

              <div className="glass-card rounded-xl p-3 sm:p-4">
                <p className="text-[11px] text-zinc-500" dir="ltr">
                  BPM
                </p>
                <p dir="ltr" className="mt-1 truncate text-sm font-bold">
                  {beat.bpm ?? "-"}
                </p>
              </div>
            </div>

            {/* Vibe */}
            {beat.moods && beat.moods.length > 0 && (
              <div className="mt-6">
                <p className="mb-3 text-sm font-bold">وایب</p>

                <div className="flex flex-wrap gap-2">
                  {beat.moods.map((mood) => (
                    <span
                      key={mood}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300"
                    >
                      {mood}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Purchase */}
            <div className="mt-8">
              <h2 className="text-sm text-zinc-300">
                لایسنس مورد نظر را انتخاب کنید
              </h2>

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