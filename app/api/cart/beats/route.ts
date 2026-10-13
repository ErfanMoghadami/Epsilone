import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyDiscount, normalizeDiscountPercent } from "@/lib/discounts";

type RequestBody = { beatIds?: string[] };

type BeatRow = {
  id: string;
  title: string | null;
  cover_url: string | null;
  cover_key: string | null;
  producer_id: string | null;
  discount_percent: number | null;
};

type ProducerRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const beatIds = Array.isArray(body.beatIds)
      ? [...new Set(body.beatIds.filter((id) => typeof id === "string"))].slice(0, 100)
      : [];

    if (beatIds.length === 0) {
      return NextResponse.json({ success: true, beats: [] });
    }

    const supabase = await createClient();
    const { data: beatData, error: beatError } = await supabase
      .from("beats")
      .select("id, title, cover_url, cover_key, producer_id, discount_percent")
      .in("id", beatIds)
      .eq("is_published", true);

    if (beatError) {
      return NextResponse.json({ success: false, error: beatError.message }, { status: 500 });
    }

    const beats = (beatData ?? []) as BeatRow[];
    const visibleBeatIds = beats.map((beat) => beat.id);
    const producerIds = [...new Set(beats.map((beat) => beat.producer_id).filter((id): id is string => Boolean(id)))];

    let producers: ProducerRow[] = [];
    if (producerIds.length > 0) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", producerIds)
        .eq("role", "producer");
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      producers = (data ?? []) as ProducerRow[];
    }

    let licenseRows: Array<{
      id: string;
      beat_id: string;
      license_type: string;
      price: number | string;
      currency: string;
      includes_stems: boolean;
    }> = [];

    if (visibleBeatIds.length > 0) {
      const { data, error } = await supabase
        .from("beat_licenses")
        .select("id, beat_id, license_type, price, currency, includes_stems")
        .in("beat_id", visibleBeatIds)
        .eq("is_active", true);

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      licenseRows = data ?? [];
    }

    const producerMap = new Map(producers.map((producer) => [producer.id, producer]));
    const licensesByBeat = new Map<string, typeof licenseRows>();

    for (const license of licenseRows) {
      const list = licensesByBeat.get(license.beat_id) ?? [];
      list.push(license);
      licensesByBeat.set(license.beat_id, list);
    }

    const r2PublicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
    const result = beats.map((beat) => {
      const producer = beat.producer_id ? producerMap.get(beat.producer_id) ?? null : null;
      const coverUrl = beat.cover_url ?? (r2PublicUrl && beat.cover_key
        ? `${r2PublicUrl}/${beat.cover_key.split("/").map(encodeURIComponent).join("/")}`
        : null);
      const discountPercent = normalizeDiscountPercent(beat.discount_percent);
      const licenses = (licensesByBeat.get(beat.id) ?? []).map((license) => {
        const price = Number(license.price);
        return {
          id: license.id,
          licenseType: license.license_type,
          price,
          discountedPrice: applyDiscount(price, discountPercent),
          discountPercent,
          currency: license.currency,
          includesStems: Boolean(license.includes_stems),
        };
      });

      return {
        id: beat.id,
        title: beat.title,
        coverUrl,
        discountPercent,
        licenses,
        producer: producer ? {
          id: producer.id,
          displayName: producer.display_name,
          username: producer.username,
          avatarUrl: producer.avatar_url,
        } : null,
      };
    });

    return NextResponse.json({ success: true, beats: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to load cart beats.",
    }, { status: 500 });
  }
}
