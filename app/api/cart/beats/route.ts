import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RequestBody = {
  beatIds?: string[];
};

type BeatRow = {
  id: string;
  title: string | null;
  cover_url: string | null;
  cover_key: string | null;
  producer_id: string | null;
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
      ? [...new Set(body.beatIds.filter((id) => typeof id === "string"))]
      : [];

    if (beatIds.length === 0) {
      return NextResponse.json({
        success: true,
        beats: [],
      });
    }

    const supabase = await createClient();

    // --------------------------------------------------------
    // Beats
    // --------------------------------------------------------

    const { data: beatData, error: beatError } = await supabase
      .from("beats")
      .select("id, title, cover_url, cover_key, producer_id")
      .in("id", beatIds);

    if (beatError) {
      return NextResponse.json(
        {
          success: false,
          error: beatError.message,
        },
        { status: 500 },
      );
    }

    const beats = (beatData ?? []) as BeatRow[];

    // --------------------------------------------------------
    // Producers
    // --------------------------------------------------------

    const producerIds = [
      ...new Set(
        beats
          .map((beat) => beat.producer_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    let producers: ProducerRow[] = [];

    if (producerIds.length > 0) {
      const { data: producerData, error: producerError } =
        await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .in("id", producerIds)
          .eq("role", "producer");

      if (producerError) {
        return NextResponse.json(
          {
            success: false,
            error: producerError.message,
          },
          { status: 500 },
        );
      }

      producers = (producerData ?? []) as ProducerRow[];
    }

    const producerMap = new Map(
      producers.map((producer) => [producer.id, producer]),
    );

    const r2PublicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

    // --------------------------------------------------------
    // Build response
    // --------------------------------------------------------

    const result = beats.map((beat) => {
      const producer = beat.producer_id
        ? producerMap.get(beat.producer_id) ?? null
        : null;

      const coverUrl =
        beat.cover_url ??
        (r2PublicUrl && beat.cover_key
          ? `${r2PublicUrl}/${beat.cover_key
              .split("/")
              .map(encodeURIComponent)
              .join("/")}`
          : null);

      return {
        id: beat.id,
        title: beat.title,
        coverUrl,
        producer: producer
          ? {
              id: producer.id,
              displayName: producer.display_name,
              username: producer.username,
              avatarUrl: producer.avatar_url,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      beats: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load cart beats.",
      },
      { status: 500 },
    );
  }
}