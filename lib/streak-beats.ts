import type { SupabaseClient } from "@supabase/supabase-js";
import { getR2SignedUrl } from "@/lib/r2";

export type StreakBeatCard = {
  id: string;
  title: string | null;
  producer: string;
  coverUrl: string | null;
};

/** Loads title / producer / cover of a beat. Server-only (pass the admin client). */
export async function loadStreakBeatCard(
  admin: SupabaseClient,
  beatId: string | null,
): Promise<StreakBeatCard | null> {
  if (!beatId) return null;

  const { data: beat } = await admin
    .from("beats")
    .select("id, title, cover_key, producer_id")
    .eq("id", beatId)
    .maybeSingle();

  if (!beat) return null;

  let producer = "Producer";

  if (beat.producer_id) {
    const { data: profile } = await admin
      .from("profiles")
      .select("username, display_name")
      .eq("id", beat.producer_id)
      .maybeSingle();

    producer = profile?.display_name || profile?.username || "Producer";
  }

  const coverUrl = beat.cover_key
    ? await getR2SignedUrl(beat.cover_key, 3600).catch(() => null)
    : null;

  return { id: beat.id, title: beat.title, producer, coverUrl };
}