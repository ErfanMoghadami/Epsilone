import type { SupabaseClient } from "@supabase/supabase-js";
import { getR2SignedUrl } from "@/lib/r2";

/**
 * هم فیلدهای قدیمی (producer / coverUrl برای StreakWidget)
 * هم فیلدهای هم‌شکل با Beat در BeatResultCard.
 */
export type StreakBeatCard = {
  // قدیمی
  id: string;
  title: string;
  producer: string;
  coverUrl: string | null;

  // هم‌شکل با BeatResultCard
  audio_url: string | null;
  preview_url: string | null;
  cover_url: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  match_score: number | null;
  producer_id: string | null;
  producer_username: string | null;
};

function publicR2Url(key: string | null): string | null {
  const base = process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/, "");

  if (!base || !key) return null;

  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/** Loads a full beat card. Server-only (pass the admin client). */
export async function loadStreakBeatCard(
  admin: SupabaseClient,
  beatId: string | null,
): Promise<StreakBeatCard | null> {
  if (!beatId) return null;

  const { data: beat } = await admin
    .from("beats")
    .select(
      "id, title, bpm, key, genre, cover_key, preview_key, producer_id",
    )
    .eq("id", beatId)
    .maybeSingle();

  if (!beat) return null;

  let producer = "Producer";
  let producerUsername: string | null = null;

  if (beat.producer_id) {
    const { data: profile } = await admin
      .from("profiles")
      .select("username, display_name")
      .eq("id", beat.producer_id)
      .maybeSingle();

    producerUsername = profile?.username ?? null;
    producer = profile?.display_name || profile?.username || "Producer";
  }

  const coverUrl =
    publicR2Url(beat.cover_key) ??
    (beat.cover_key
      ? await getR2SignedUrl(beat.cover_key, 3600).catch(() => null)
      : null);

  const previewUrl =
    publicR2Url(beat.preview_key) ??
    (beat.preview_key
      ? await getR2SignedUrl(beat.preview_key, 3600).catch(() => null)
      : null);

  return {
    id: beat.id,
    title: beat.title ?? "Untitled Beat",
    producer,
    coverUrl,

    audio_url: null,
    preview_url: previewUrl,
    cover_url: coverUrl,
    bpm: beat.bpm ?? null,
    key: beat.key ?? null,
    genre: beat.genre ?? null,
    match_score: null,
    producer_id: beat.producer_id ?? null,
    producer_username: producerUsername,
  };
}