import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { applyDiscount, normalizeDiscountPercent } from "@/lib/discounts";

import ProducerBeatCard from "@/components/producer/ProducerBeatCard";

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
  discount_percent: number | null;
};

function buildR2Url(key: string | null): string | null {
  const r2PublicUrl = process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/, "");

  if (!r2PublicUrl || !key) {
    return null;
  }

  return `${r2PublicUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export default async function ProducerProfilePage({
  params,
}: ProducerProfilePageProps) {
  const { username } = await params;

  const supabase = await createClient();

  // --------------------------------------------------------
  // Producer profile
  // --------------------------------------------------------

  const { data: producer, error: producerError } = await supabase
    .from("profiles")
    .select("id, role, display_name, username, bio, avatar_url")
    .eq("username", username.toLowerCase())
    .eq("role", "producer")
    .maybeSingle();

  if (producerError) {
    throw new Error(`Producer query failed: ${producerError.message}`);
  }

  if (!producer) {
    notFound();
  }

  const producerId = producer.id;

  // --------------------------------------------------------
  // Producer beats
  // --------------------------------------------------------

  const { data: beats, error: beatsError } = await supabase
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
        cover_key,
        discount_percent
        `,
    )
    .eq("producer_id", producerId)
    .eq("analysis_status", "completed")
    .eq("is_published", true)
    .order("created_at", {
      ascending: false,
    });

  if (beatsError) {
    throw new Error(`Could not load producer beats: ${beatsError.message}`);
  }

  // --------------------------------------------------------
  // Build R2 public URLs
  // --------------------------------------------------------

  // --------------------------------------------------------
  // Lowest active license price per beat
  // --------------------------------------------------------

  const beatIds = (beats ?? []).map((beat: ProducerBeat) => beat.id);
  const lowestPrice = new Map<string, number>();

  if (beatIds.length > 0) {
    const { data: licenses, error: licensesError } = await supabase
      .from("beat_licenses")
      .select("beat_id, price")
      .in("beat_id", beatIds)
      .eq("is_active", true);

    if (licensesError) {
      console.error(
        "Producer beat license price lookup failed:",
        licensesError.message,
      );
    } else {
      for (const license of licenses ?? []) {
        const price = Number(license.price);
        if (!Number.isFinite(price) || price < 0) continue;

        const current = lowestPrice.get(license.beat_id);
        if (current === undefined || price < current) {
          lowestPrice.set(license.beat_id, price);
        }
      }
    }
  }

  // --------------------------------------------------------
  // Build card data (R2 public URLs + prices)
  // --------------------------------------------------------

  const beatCards = (beats ?? []).map((beat: ProducerBeat) => {
    const discountPercent = normalizeDiscountPercent(beat.discount_percent);
    const original = lowestPrice.get(beat.id);

    return {
      id: beat.id,
      title: beat.title,
      bpm: beat.bpm,
      key: beat.key,
      previewUrl: beat.preview_url ?? buildR2Url(beat.preview_key),
      coverUrl: beat.cover_url ?? buildR2Url(beat.cover_key),
      originalPrice: original ?? null,
      price:
        original === undefined
          ? null
          : applyDiscount(original, discountPercent),
      discountPercent,
    };
  });

  const producerName =
    producer.display_name?.trim() || producer.username?.trim() || "Producer";

  const producerInitial = producerName.charAt(0).toUpperCase();

  return (
    <main
      dir="rtl"
      className="min-h-screen px-5 py-10 text-white sm:px-6 sm:py-12"
    >
      <div className="mx-auto max-w-6xl">
        {/* Producer header */}
        <section className="mb-8 sm:mb-10">
          <div className="flex items-center gap-4 sm:gap-5">
            {producer.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={producer.avatar_url}
                alt={producerName}
                className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-white/25 sm:h-24 sm:w-24"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-3xl font-semibold ring-2 ring-white/25 sm:h-24 sm:w-24">
                {producerInitial}
              </div>
            )}

            <div className="min-w-0">
              <p className="text-xs text-zinc-400">آهنگساز</p>

              <h1
                dir="auto"
                className="mt-0.5 truncate text-2xl font-bold sm:text-3xl"
              >
                {producerName}
              </h1>

              {producer.username && (
                <p
                  dir="ltr"
                  className="mt-0.5 text-right text-xs text-zinc-500"
                >
                  @{producer.username}
                </p>
              )}
            </div>
          </div>

          {producer.bio && (
            <p dir="auto" className="mt-4 max-w-2xl text-sm text-white">
              {producer.bio}
            </p>
          )}
        </section>

        {/* Beats */}
        <section>
          <h2 className="mb-4 text-lg font-semibold sm:mb-5">موزیک ها</h2>

          {beatCards.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
              <p className="text-zinc-500">
                این هنرمند هنوز بیتی منتشر نکرده است.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {beatCards.map((beat) => (
                <ProducerBeatCard key={beat.id} beat={beat} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
