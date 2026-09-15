import { analyzeBeat } from "@/lib/gemini/analyzeBeat";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET() {
  const { data: beat, error } = await supabase
    .from("beats")
    .select("id, audio_url")
    .eq("analysis_status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !beat) {
    return NextResponse.json(
      { ok: false, error: "no pending beat found" },
      { status: 404 },
    );
  }

  try {
    await analyzeBeat(beat.id, beat.audio_url);
    return NextResponse.json({ ok: true, beatId: beat.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
